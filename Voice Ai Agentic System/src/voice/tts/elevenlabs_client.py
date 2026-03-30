"""ElevenLabs streaming Text-to-Speech client."""

import audioop
from typing import AsyncIterator
import structlog
from elevenlabs import AsyncElevenLabs

from src.config import get_settings

logger = structlog.get_logger()
settings = get_settings()


class ElevenLabsTTSClient:
    """Streaming TTS using ElevenLabs API, outputting mu-law audio for Twilio."""

    def __init__(self, voice_id: str = None):
        self.voice_id = voice_id or settings.elevenlabs_voice_id
        self._client = AsyncElevenLabs(api_key=settings.elevenlabs_api_key)

    async def synthesize_stream(self, text: str) -> AsyncIterator[bytes]:
        """
        Stream text-to-speech and yield mu-law 8kHz audio chunks
        suitable for Twilio Media Streams.
        """
        try:
            # Generate audio using ElevenLabs streaming
            audio_stream = self._client.text_to_speech.convert_as_stream(
                text=text,
                voice_id=self.voice_id,
                model_id="eleven_turbo_v2_5",
                output_format="pcm_16000",  # 16kHz 16-bit PCM
                voice_settings={
                    "stability": 0.5,
                    "similarity_boost": 0.75,
                    "style": 0.0,
                    "use_speaker_boost": True,
                },
            )

            async for chunk in audio_stream:
                if chunk:
                    # Downsample from 16kHz to 8kHz
                    downsampled = audioop.ratecv(
                        chunk, 2, 1, 16000, 8000, None
                    )[0]
                    # Convert 16-bit PCM to mu-law for Twilio
                    mulaw_chunk = audioop.lin2ulaw(downsampled, 2)
                    yield mulaw_chunk

        except Exception as e:
            logger.error("ElevenLabs TTS error", error=str(e))
