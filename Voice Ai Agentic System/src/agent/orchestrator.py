"""
Core Voice Agent Orchestrator.

Manages the real-time pipeline: STT → Claude LLM → TTS
for each active phone call via Twilio Media Streams.
"""

import asyncio
import base64
import json
from typing import Optional

import structlog
from fastapi import WebSocket

from src.config import get_settings
from src.agent.conversation import ConversationState
from src.agent.prompt_builder import build_system_prompt
from src.agent.tools import get_tool_definitions, execute_tool
from src.voice.stt.deepgram_client import DeepgramSTTClient
from src.voice.tts.elevenlabs_client import ElevenLabsTTSClient
from src.services.customer_service import lookup_customer_by_phone
from src.services.tenant_service import get_tenant_by_id

logger = structlog.get_logger()
settings = get_settings()


class VoiceAgentOrchestrator:
    """Orchestrates a single voice call session."""

    def __init__(
        self,
        websocket: WebSocket,
        stream_sid: str,
        tenant_id: str,
        caller_number: str,
    ):
        self.websocket = websocket
        self.stream_sid = stream_sid
        self.tenant_id = tenant_id
        self.caller_number = caller_number
        self.conversation = ConversationState()
        self.stt_client: Optional[DeepgramSTTClient] = None
        self.tts_client: Optional[ElevenLabsTTSClient] = None
        self._is_speaking = False
        self._processing_lock = asyncio.Lock()

    async def start(self):
        """Initialize the agent for a new call."""
        # Load tenant and customer context
        tenant = await get_tenant_by_id(self.tenant_id)
        customer = await lookup_customer_by_phone(
            self.tenant_id, self.caller_number
        )

        # Build the system prompt with full context
        system_prompt = await build_system_prompt(
            tenant=tenant,
            customer=customer,
            caller_number=self.caller_number,
        )
        self.conversation.set_system_prompt(system_prompt)

        # Initialize STT (Deepgram streaming)
        self.stt_client = DeepgramSTTClient(
            on_transcript=self._on_transcript,
            on_utterance_end=self._on_utterance_end,
        )
        await self.stt_client.connect()

        # Initialize TTS (ElevenLabs streaming)
        self.tts_client = ElevenLabsTTSClient()

        # Send initial greeting
        greeting = tenant.get("settings", {}).get(
            "greeting",
            f"Hello! Welcome to {tenant.get('name', 'our shop')}. How can I help you today?",
        )
        await self._speak(greeting)

        logger.info(
            "Agent started",
            tenant=tenant.get("name"),
            caller=self.caller_number,
            known_customer=customer is not None,
        )

    async def handle_audio_in(self, payload: str):
        """Process incoming audio from Twilio (base64 mu-law)."""
        if self.stt_client:
            audio_bytes = base64.b64decode(payload)
            await self.stt_client.send_audio(audio_bytes)

    async def _on_transcript(self, text: str, is_final: bool):
        """Called by STT when speech is transcribed."""
        if not is_final:
            return

        if not text.strip():
            return

        logger.info("Customer said", text=text)
        self.conversation.add_user_message(text)

    async def _on_utterance_end(self):
        """Called when the customer finishes speaking (silence detected)."""
        async with self._processing_lock:
            await self._generate_response()

    async def _generate_response(self):
        """Send conversation to Claude and process the response."""
        import anthropic

        client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

        messages = self.conversation.get_messages()
        if not messages:
            return

        tools = get_tool_definitions()

        try:
            response = await client.messages.create(
                model=settings.anthropic_model,
                max_tokens=300,
                system=self.conversation.system_prompt,
                messages=messages,
                tools=tools if tools else anthropic.NOT_GIVEN,
            )

            # Process response blocks
            assistant_text = ""
            tool_uses = []

            for block in response.content:
                if block.type == "text":
                    assistant_text += block.text
                elif block.type == "tool_use":
                    tool_uses.append(block)

            # Execute any tool calls
            if tool_uses:
                self.conversation.add_assistant_message(response.content)

                tool_results = []
                for tool_use in tool_uses:
                    result = await execute_tool(
                        tool_name=tool_use.name,
                        tool_input=tool_use.input,
                        tenant_id=self.tenant_id,
                        caller_number=self.caller_number,
                    )
                    tool_results.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": tool_use.id,
                            "content": json.dumps(result),
                        }
                    )

                self.conversation.add_tool_results(tool_results)

                # Get follow-up response after tool execution
                followup = await client.messages.create(
                    model=settings.anthropic_model,
                    max_tokens=300,
                    system=self.conversation.system_prompt,
                    messages=self.conversation.get_messages(),
                )

                for block in followup.content:
                    if block.type == "text":
                        assistant_text += block.text

                self.conversation.add_assistant_message(followup.content)
            else:
                self.conversation.add_assistant_message(response.content)

            # Speak the response
            if assistant_text.strip():
                await self._speak(assistant_text.strip())

        except Exception as e:
            logger.error("Error generating response", error=str(e))
            await self._speak(
                "I'm sorry, I'm having a moment. Could you please repeat that?"
            )

    async def _speak(self, text: str):
        """Convert text to speech and send audio to Twilio."""
        self._is_speaking = True

        try:
            async for audio_chunk in self.tts_client.synthesize_stream(text):
                # Send audio back through the Twilio Media Stream
                payload = base64.b64encode(audio_chunk).decode("utf-8")
                await self.websocket.send_json(
                    {
                        "event": "media",
                        "streamSid": self.stream_sid,
                        "media": {"payload": payload},
                    }
                )
        except Exception as e:
            logger.error("TTS error", error=str(e))
        finally:
            self._is_speaking = False

    async def stop(self):
        """Clean up resources when the call ends."""
        if self.stt_client:
            await self.stt_client.disconnect()

        # Log the call
        logger.info(
            "Call ended",
            tenant_id=self.tenant_id,
            caller=self.caller_number,
            turns=len(self.conversation.get_messages()),
        )
