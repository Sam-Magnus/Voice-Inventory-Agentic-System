"""
Voice Demo API — browser-based voice conversation with the agent.
POST /api/v1/voice-demo/talk  — takes text, runs chat pipeline, returns text + ElevenLabs audio
POST /api/v1/voice-demo/tts   — takes text, returns ElevenLabs audio only
"""

import io
import json
from typing import Optional
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import structlog

from elevenlabs import AsyncElevenLabs

from src.config import get_settings
from src.agent.llm_client import chat_completion
from src.agent.tools import get_tool_definitions, execute_tool
from src.agent.prompt_builder import build_system_prompt
from src.services.tenant_service import get_tenant_by_id
from src.services.customer_service import lookup_customer_by_phone

logger = structlog.get_logger()
settings = get_settings()

router = APIRouter()

# Reuse the same in-memory session store pattern as chat.py
_voice_sessions: dict[str, dict] = {}

DEMO_TENANT_ID = "a1b2c3d4-e5f6-7890-abcd-111111111111"


class TalkRequest(BaseModel):
    message: str
    session_id: Optional[str] = "voice-default"
    caller_number: Optional[str] = "+919811001100"


class TTSRequest(BaseModel):
    text: str


async def _generate_audio(text: str) -> bytes:
    """Generate ElevenLabs audio and return as MP3 bytes."""
    client = AsyncElevenLabs(api_key=settings.elevenlabs_api_key)

    audio_stream = client.text_to_speech.convert_as_stream(
        text=text,
        voice_id=settings.elevenlabs_voice_id,
        model_id="eleven_turbo_v2_5",
        output_format="mp3_44100_128",  # MP3 for browser playback
        voice_settings={
            "stability": 0.5,
            "similarity_boost": 0.75,
            "style": 0.0,
            "use_speaker_boost": True,
        },
    )

    buffer = io.BytesIO()
    async for chunk in audio_stream:
        if chunk:
            buffer.write(chunk)

    return buffer.getvalue()


async def _run_chat_pipeline(message: str, session_id: str, caller_number: str) -> dict:
    """Run the full chat + tool calling pipeline. Returns {reply, tools_used}."""
    if session_id not in _voice_sessions:
        tenant = await get_tenant_by_id(DEMO_TENANT_ID)
        if not tenant:
            return {"reply": "Error: Demo tenant not found.", "tools_used": []}

        customer = await lookup_customer_by_phone(DEMO_TENANT_ID, caller_number)
        system_prompt = await build_system_prompt(
            tenant=tenant,
            customer=customer,
            caller_number=caller_number,
        )
        _voice_sessions[session_id] = {
            "system_prompt": system_prompt,
            "messages": [],
        }

    session = _voice_sessions[session_id]
    tools = get_tool_definitions()

    session["messages"].append({"role": "user", "content": message})

    try:
        response = await chat_completion(
            system_prompt=session["system_prompt"],
            messages=session["messages"],
            tools=tools,
            max_tokens=400,
        )

        agent_text = response["text"]
        tools_used = []

        if response["tool_calls"]:
            assistant_content = []
            if agent_text:
                assistant_content.append({"type": "text", "text": agent_text})
            for tc in response["tool_calls"]:
                assistant_content.append({
                    "type": "tool_use",
                    "id": tc["id"],
                    "name": tc["name"],
                    "input": tc["arguments"],
                })
                tools_used.append(tc["name"])

            session["messages"].append({"role": "assistant", "content": assistant_content})

            tool_results = []
            for tc in response["tool_calls"]:
                result = await execute_tool(
                    tool_name=tc["name"],
                    tool_input=tc["arguments"],
                    tenant_id=DEMO_TENANT_ID,
                    caller_number=caller_number,
                )
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tc["id"],
                    "content": json.dumps(result, default=str),
                })

            session["messages"].append({"role": "user", "content": tool_results})

            followup = await chat_completion(
                system_prompt=session["system_prompt"],
                messages=session["messages"],
                tools=tools,
                max_tokens=400,
            )
            agent_text = followup["text"]
            session["messages"].append({"role": "assistant", "content": agent_text or ""})
        else:
            session["messages"].append({"role": "assistant", "content": agent_text or ""})

        return {
            "reply": agent_text or "I couldn't generate a response.",
            "tools_used": tools_used,
        }

    except Exception as e:
        logger.error("Voice demo chat error", error=str(e))
        return {"reply": "Sorry, I encountered an error. Please try again.", "tools_used": []}


@router.post("/talk")
async def talk(req: TalkRequest):
    """Full voice demo: chat pipeline + TTS audio response."""
    # Run chat pipeline
    result = await _run_chat_pipeline(req.message, req.session_id, req.caller_number)

    # Generate audio from reply
    try:
        audio_bytes = await _generate_audio(result["reply"])
    except Exception as e:
        logger.error("TTS generation failed", error=str(e))
        # Return text-only response if TTS fails
        return {
            "reply": result["reply"],
            "tools_used": result["tools_used"],
            "audio": None,
            "session_id": req.session_id,
        }

    # Return audio as streaming response with metadata headers
    return StreamingResponse(
        io.BytesIO(audio_bytes),
        media_type="audio/mpeg",
        headers={
            "X-Reply-Text": result["reply"].replace("\n", " ")[:500],
            "X-Tools-Used": ",".join(result["tools_used"]),
            "X-Session-Id": req.session_id,
            "Access-Control-Expose-Headers": "X-Reply-Text, X-Tools-Used, X-Session-Id",
        },
    )


@router.post("/tts")
async def tts(req: TTSRequest):
    """Text-to-speech only — returns MP3 audio."""
    try:
        audio_bytes = await _generate_audio(req.text)
        return StreamingResponse(
            io.BytesIO(audio_bytes),
            media_type="audio/mpeg",
        )
    except Exception as e:
        logger.error("TTS error", error=str(e))
        return {"error": str(e)}


@router.delete("/session/{session_id}")
async def reset_voice_session(session_id: str):
    """Reset a voice demo session."""
    if session_id in _voice_sessions:
        del _voice_sessions[session_id]
    return {"status": "ok"}
