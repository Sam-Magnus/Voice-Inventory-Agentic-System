"""Generate TwiML responses for Twilio voice calls."""


def build_stream_twiml(
    websocket_url: str,
    tenant_id: str,
    caller_number: str,
) -> str:
    """Build TwiML to start a bidirectional Media Stream."""
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="{websocket_url}">
            <Parameter name="tenant_id" value="{tenant_id}" />
            <Parameter name="caller_number" value="{caller_number}" />
        </Stream>
    </Connect>
</Response>"""


def build_transfer_twiml(shop_phone: str) -> str:
    """Build TwiML to transfer call to the shop's direct number."""
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>Connecting you to the shop now. Please hold.</Say>
    <Dial>{shop_phone}</Dial>
</Response>"""


def build_queue_twiml(position: int) -> str:
    """Build TwiML for holding in queue."""
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>You are number {position} in the queue. Please hold while we connect you.</Say>
    <Play loop="0">https://api.twilio.com/cowbell.mp3</Play>
</Response>"""
