"""Deepgram streaming Speech-to-Text client."""

import asyncio
from typing import Callable, Awaitable, Optional
import structlog
from deepgram import DeepgramClient, LiveTranscriptionEvents, LiveOptions

from src.config import get_settings

logger = structlog.get_logger()
settings = get_settings()


class DeepgramSTTClient:
    """Real-time streaming STT using Deepgram Nova-2."""

    def __init__(
        self,
        on_transcript: Callable[[str, bool], Awaitable[None]],
        on_utterance_end: Callable[[], Awaitable[None]],
    ):
        self.on_transcript = on_transcript
        self.on_utterance_end = on_utterance_end
        self._client: Optional[DeepgramClient] = None
        self._connection = None

    async def connect(self):
        """Initialize and connect the Deepgram live transcription."""
        self._client = DeepgramClient(settings.deepgram_api_key)
        self._connection = self._client.listen.asynclive.v("1")

        # Register event handlers
        self._connection.on(
            LiveTranscriptionEvents.Transcript, self._handle_transcript
        )
        self._connection.on(
            LiveTranscriptionEvents.UtteranceEnd, self._handle_utterance_end
        )
        self._connection.on(LiveTranscriptionEvents.Error, self._handle_error)

        # Configure for phone audio (mu-law, 8kHz)
        options = LiveOptions(
            model="nova-2",
            language="en-IN",  # Indian English
            encoding="mulaw",
            sample_rate=8000,
            channels=1,
            punctuate=True,
            interim_results=True,
            utterance_end_ms=1200,  # Silence threshold
            vad_events=True,
            smart_format=True,
        )

        result = await self._connection.start(options)
        if result:
            logger.info("Deepgram STT connected")
        else:
            logger.error("Deepgram STT connection failed")

    async def send_audio(self, audio_bytes: bytes):
        """Send raw audio bytes to Deepgram for transcription."""
        if self._connection:
            await self._connection.send(audio_bytes)

    async def _handle_transcript(self, _client, result, **kwargs):
        """Handle incoming transcription results."""
        transcript = result.channel.alternatives[0].transcript
        is_final = result.is_final

        if transcript.strip():
            await self.on_transcript(transcript, is_final)

    async def _handle_utterance_end(self, _client, result, **kwargs):
        """Handle end of utterance (silence detected)."""
        await self.on_utterance_end()

    async def _handle_error(self, _client, error, **kwargs):
        """Handle STT errors."""
        logger.error("Deepgram STT error", error=str(error))

    async def disconnect(self):
        """Close the Deepgram connection."""
        if self._connection:
            await self._connection.finish()
            logger.info("Deepgram STT disconnected")
