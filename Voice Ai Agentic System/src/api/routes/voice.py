from fastapi import APIRouter, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import Response
import structlog

from src.config import get_settings
from src.voice.telephony.twiml_builder import build_stream_twiml
from src.agent.orchestrator import VoiceAgentOrchestrator
from src.services.tenant_service import resolve_tenant_by_phone

logger = structlog.get_logger()
settings = get_settings()

router = APIRouter()


@router.post("/incoming")
async def handle_incoming_call(request: Request):
    """Twilio webhook for incoming voice calls."""
    form = await request.form()
    called_number = form.get("Called", "")
    caller_number = form.get("From", "")

    logger.info(
        "Incoming call",
        called=called_number,
        caller=caller_number,
    )

    # Resolve which tenant (shop) this call is for
    tenant = await resolve_tenant_by_phone(called_number)
    if not tenant:
        logger.warning("No tenant found for number", number=called_number)
        return Response(
            content='<Response><Say>Sorry, this number is not configured.</Say></Response>',
            media_type="application/xml",
        )

    # Return TwiML to start a Media Stream
    twiml = build_stream_twiml(
        websocket_url=f"wss://{settings.base_url.replace('https://', '').replace('http://', '')}/api/v1/voice/media-stream",
        tenant_id=str(tenant["id"]),
        caller_number=caller_number,
    )

    return Response(content=twiml, media_type="application/xml")


@router.post("/status")
async def handle_call_status(request: Request):
    """Twilio webhook for call status updates."""
    form = await request.form()
    call_sid = form.get("CallSid", "")
    call_status = form.get("CallStatus", "")

    logger.info("Call status update", sid=call_sid, status=call_status)
    return {"status": "ok"}


@router.websocket("/media-stream")
async def media_stream_websocket(websocket: WebSocket):
    """Bidirectional WebSocket for Twilio Media Streams."""
    await websocket.accept()
    logger.info("Media stream WebSocket connected")

    orchestrator = None

    try:
        async for message in websocket.iter_json():
            event = message.get("event")

            if event == "start":
                stream_sid = message["start"]["streamSid"]
                custom_params = message["start"].get("customParameters", {})
                tenant_id = custom_params.get("tenant_id", "")
                caller_number = custom_params.get("caller_number", "")

                logger.info(
                    "Media stream started",
                    stream_sid=stream_sid,
                    tenant_id=tenant_id,
                    caller=caller_number,
                )

                orchestrator = VoiceAgentOrchestrator(
                    websocket=websocket,
                    stream_sid=stream_sid,
                    tenant_id=tenant_id,
                    caller_number=caller_number,
                )
                await orchestrator.start()

            elif event == "media" and orchestrator:
                payload = message["media"]["payload"]
                await orchestrator.handle_audio_in(payload)

            elif event == "stop":
                logger.info("Media stream stopped")
                if orchestrator:
                    await orchestrator.stop()
                break

    except WebSocketDisconnect:
        logger.info("Media stream WebSocket disconnected")
        if orchestrator:
            await orchestrator.stop()
