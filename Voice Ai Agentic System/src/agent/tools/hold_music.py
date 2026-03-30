"""Play custom hold music chosen by the customer."""

import structlog

logger = structlog.get_logger()

TOOL_DEFINITION = {
    "name": "play_hold_music",
    "description": "Play a song the customer requests while they wait on hold. Ask the customer what song they'd like to hear.",
    "input_schema": {
        "type": "object",
        "properties": {
            "song_query": {
                "type": "string",
                "description": "Song name, artist, or description, e.g. 'Tum Hi Ho by Arijit Singh' or 'some Bollywood music'",
            },
        },
        "required": ["song_query"],
    },
}


async def play_hold_music(
    tenant_id: str,
    caller_number: str,
    song_query: str,
    **kwargs,
) -> dict:
    # TODO: Implement yt-dlp + ffmpeg audio streaming
    logger.info(
        "Hold music requested",
        tenant_id=tenant_id,
        song=song_query,
    )

    return {
        "success": True,
        "message": f"Playing '{song_query}' while you wait.",
        "song_query": song_query,
    }
