"""
Test ElevenLabs Text-to-Speech.

Generates an audio file from text and saves it as WAV.

Usage:
    python scripts/test_tts.py
"""

import asyncio
import sys
import os
import wave
import struct

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.config import get_settings

settings = get_settings()

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "test_output")


async def test_tts():
    from elevenlabs import AsyncElevenLabs

    client = AsyncElevenLabs(api_key=settings.elevenlabs_api_key)

    test_texts = [
        "Hello! Welcome to Sharma Computers. How can I help you today?",
        "Bhai, RTX 4070 ka price 52 thousand hai. 6 pieces stock mein hain.",
    ]

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    for i, text in enumerate(test_texts):
        print(f"\n[Test {i+1}] Generating speech for: \"{text[:60]}...\"")

        # Generate audio
        audio_chunks = []
        audio_stream = client.text_to_speech.convert_as_stream(
            text=text,
            voice_id=settings.elevenlabs_voice_id,
            model_id="eleven_turbo_v2_5",
            output_format="pcm_16000",
        )

        async for chunk in audio_stream:
            if chunk:
                audio_chunks.append(chunk)

        # Combine all chunks
        raw_audio = b"".join(audio_chunks)
        print(f"  Audio generated: {len(raw_audio)} bytes ({len(raw_audio)/32000:.1f}s at 16kHz)")

        # Save as WAV
        wav_path = os.path.join(OUTPUT_DIR, f"tts_test_{i+1}.wav")
        with wave.open(wav_path, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)  # 16-bit
            wf.setframerate(16000)
            wf.writeframes(raw_audio)

        print(f"  Saved: {wav_path}")

    print(f"\nAll TTS tests passed! Audio files saved in {OUTPUT_DIR}")
    print("Open the .wav files to listen to the agent's voice.")


if __name__ == "__main__":
    asyncio.run(test_tts())
