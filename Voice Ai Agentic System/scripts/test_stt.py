"""
Test Deepgram Speech-to-Text.

Uses the TTS output files as input to test the STT pipeline.
This creates a round-trip: text -> TTS -> audio -> STT -> text

Usage:
    python scripts/test_stt.py
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.config import get_settings

settings = get_settings()

TEST_OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "test_output")


async def test_stt_from_file(file_path: str):
    """Transcribe an audio file using Deepgram."""
    from deepgram import DeepgramClient, PrerecordedOptions

    client = DeepgramClient(settings.deepgram_api_key)

    with open(file_path, "rb") as f:
        audio_data = f.read()

    options = PrerecordedOptions(
        model="nova-2",
        language="en-IN",
        smart_format=True,
        punctuate=True,
    )

    response = await client.listen.asyncrest.v("1").transcribe_file(
        {"buffer": audio_data, "mimetype": "audio/wav"},
        options,
    )

    transcript = response.results.channels[0].alternatives[0].transcript
    confidence = response.results.channels[0].alternatives[0].confidence

    return transcript, confidence


async def test_stt_live():
    """Test Deepgram with a simple generated audio file to verify API key works."""
    # First, check if TTS test output exists
    wav_files = []
    if os.path.exists(TEST_OUTPUT_DIR):
        wav_files = [f for f in os.listdir(TEST_OUTPUT_DIR) if f.endswith(".wav")]

    if not wav_files:
        print("No TTS test files found. Generating test audio first...")
        # Generate a quick test audio via ElevenLabs
        from elevenlabs import AsyncElevenLabs
        import wave

        client = AsyncElevenLabs(api_key=settings.elevenlabs_api_key)
        os.makedirs(TEST_OUTPUT_DIR, exist_ok=True)

        test_text = "Do you have any RTX 4070 graphics card in stock?"
        chunks = []
        stream = client.text_to_speech.convert_as_stream(
            text=test_text,
            voice_id=settings.elevenlabs_voice_id,
            model_id="eleven_turbo_v2_5",
            output_format="pcm_16000",
        )
        async for chunk in stream:
            if chunk:
                chunks.append(chunk)

        raw_audio = b"".join(chunks)
        wav_path = os.path.join(TEST_OUTPUT_DIR, "stt_test_input.wav")
        with wave.open(wav_path, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(16000)
            wf.writeframes(raw_audio)

        wav_files = ["stt_test_input.wav"]
        print(f"  Generated: {wav_path} ({len(raw_audio)} bytes)")

    print(f"\nFound {len(wav_files)} audio file(s) to transcribe:\n")

    for wav_file in wav_files:
        file_path = os.path.join(TEST_OUTPUT_DIR, wav_file)
        print(f"[File] {wav_file}")

        try:
            transcript, confidence = await test_stt_from_file(file_path)
            print(f"  Transcript: \"{transcript}\"")
            print(f"  Confidence: {confidence:.2%}")
            print()
        except Exception as e:
            print(f"  ERROR: {e}")
            print()

    print("STT testing complete!")


if __name__ == "__main__":
    asyncio.run(test_stt_live())
