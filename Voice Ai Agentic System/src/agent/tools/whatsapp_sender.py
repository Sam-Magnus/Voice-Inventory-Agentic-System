"""Send WhatsApp messages to the customer during a call."""

from src.services.whatsapp_service import send_whatsapp_message

TOOL_DEFINITION = {
    "name": "send_whatsapp",
    "description": "Send a message, quote, or offer to the customer's WhatsApp number. Use this to send itemized quotes, active offers, or custom messages.",
    "input_schema": {
        "type": "object",
        "properties": {
            "message_type": {
                "type": "string",
                "enum": ["quote", "offer", "tracking", "custom"],
                "description": "Type of message to send",
            },
            "content": {
                "type": "string",
                "description": "Message content or custom text",
            },
            "quote_id": {
                "type": "string",
                "description": "Quote/order ID to send (for quote type)",
            },
        },
        "required": ["message_type"],
    },
}


async def send_whatsapp(
    tenant_id: str,
    caller_number: str,
    message_type: str,
    content: str = None,
    quote_id: str = None,
    **kwargs,
) -> dict:
    result = await send_whatsapp_message(
        tenant_id=tenant_id,
        to_number=caller_number,
        message_type=message_type,
        content=content,
        quote_id=quote_id,
    )

    if result.get("success"):
        return {
            "success": True,
            "message": f"WhatsApp {message_type} sent to {caller_number}",
        }
    else:
        return {
            "success": False,
            "message": f"Failed to send WhatsApp: {result.get('error', 'unknown error')}",
        }
