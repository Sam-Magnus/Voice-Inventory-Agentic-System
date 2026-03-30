"""
Full Pipeline Test: Text -> LLM (with tools) -> TTS Audio

Simulates the complete voice agent flow:
1. User types a message
2. Agent processes it via Groq LLM + inventory tools
3. Agent's response is converted to speech via ElevenLabs
4. Audio is saved as a .wav file you can listen to

Usage:
    python scripts/test_full_pipeline.py

REMINDER: Currently using Groq (free). Switch to Claude API when you add credits.
"""

import asyncio
import json
import sys
import os
import wave
import time

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stdin.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.config import get_settings
from src.agent.llm_client import chat_completion
from src.agent.tools import get_tool_definitions, execute_tool
from src.agent.prompt_builder import build_system_prompt
from src.services.tenant_service import get_tenant_by_id

settings = get_settings()

DEMO_TENANT_ID = "a1b2c3d4-e5f6-7890-abcd-111111111111"
DEMO_CALLER = "+919811001100"
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "test_output")


async def text_to_speech(text: str, filename: str) -> str:
    """Convert text to speech and save as WAV."""
    from elevenlabs import AsyncElevenLabs

    client = AsyncElevenLabs(api_key=settings.elevenlabs_api_key)
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    chunks = []
    stream = client.text_to_speech.convert_as_stream(
        text=text,
        voice_id=settings.elevenlabs_voice_id,
        model_id="eleven_turbo_v2_5",
        output_format="pcm_16000",
    )
    async for chunk in stream:
        if chunk:
            chunks.append(chunk)

    raw_audio = b"".join(chunks)
    wav_path = os.path.join(OUTPUT_DIR, filename)
    with wave.open(wav_path, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(16000)
        wf.writeframes(raw_audio)

    return wav_path


async def main():
    print("=" * 60)
    print("  Full Pipeline Test: Text -> LLM -> TTS Audio")
    print(f"  LLM: {settings.llm_provider.upper()}")
    print(f"  TTS: ElevenLabs")
    print("=" * 60)

    # Load context
    print("\n[1/4] Loading shop data...")
    tenant = await get_tenant_by_id(DEMO_TENANT_ID)
    if not tenant:
        print("ERROR: Demo tenant not found.")
        return

    system_prompt = await build_system_prompt(
        tenant=tenant, customer=None, caller_number=DEMO_CALLER
    )
    print(f"  Loaded: {tenant['name']}")

    # Test queries
    test_queries = [
        "RTX 4070 ka price kya hai?",
        "Koi 32GB DDR5 RAM hai stock mein?",
        "I want to build a gaming PC, budget 80000",
    ]

    tools = get_tool_definitions()

    for i, query in enumerate(test_queries):
        print(f"\n{'='*60}")
        print(f"[Query {i+1}] \"{query}\"")
        print("-" * 60)

        messages = [{"role": "user", "content": query}]

        # Step 2: LLM
        print("[2/4] Sending to LLM...")
        t0 = time.time()
        response = await chat_completion(
            system_prompt=system_prompt,
            messages=messages,
            tools=tools,
            max_tokens=400,
        )
        llm_time = time.time() - t0

        # Handle tool calls
        agent_text = response["text"]
        if response["tool_calls"]:
            tc = response["tool_calls"][0]
            print(f"  Tool call: {tc['name']}({json.dumps(tc['arguments'])[:100]})")

            assistant_content = []
            if agent_text:
                assistant_content.append({"type": "text", "text": agent_text})
            for tc in response["tool_calls"]:
                assistant_content.append({
                    "type": "tool_use", "id": tc["id"],
                    "name": tc["name"], "input": tc["arguments"],
                })
            messages.append({"role": "assistant", "content": assistant_content})

            tool_results = []
            for tc in response["tool_calls"]:
                result = await execute_tool(
                    tool_name=tc["name"], tool_input=tc["arguments"],
                    tenant_id=DEMO_TENANT_ID, caller_number=DEMO_CALLER,
                )
                tool_results.append({
                    "type": "tool_result", "tool_use_id": tc["id"],
                    "content": json.dumps(result),
                })
            messages.append({"role": "user", "content": tool_results})

            followup = await chat_completion(
                system_prompt=system_prompt, messages=messages,
                tools=tools, max_tokens=400,
            )
            agent_text = followup["text"]
            llm_time = time.time() - t0

        print(f"  LLM response ({llm_time:.1f}s): \"{agent_text[:120]}...\"" if len(agent_text) > 120 else f"  LLM response ({llm_time:.1f}s): \"{agent_text}\"")

        if not agent_text:
            print("  [SKIP TTS - no text response]")
            continue

        # Step 3: TTS
        print("[3/4] Converting to speech (ElevenLabs)...")
        t0 = time.time()
        wav_path = await text_to_speech(agent_text, f"pipeline_test_{i+1}.wav")
        tts_time = time.time() - t0
        file_size = os.path.getsize(wav_path)
        duration = file_size / 32000  # 16kHz * 2 bytes

        print(f"  Audio: {duration:.1f}s, {file_size//1024}KB ({tts_time:.1f}s to generate)")
        print(f"  Saved: {wav_path}")

    print(f"\n{'='*60}")
    print("Pipeline test complete!")
    print(f"Audio files in: {OUTPUT_DIR}")
    print("Open the .wav files to hear the agent's voice responses.")


if __name__ == "__main__":
    asyncio.run(main())
