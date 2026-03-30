"""WhatsApp Cloud API integration service."""

import httpx
import structlog

from src.config import get_settings
from src.db.connection import get_supabase

logger = structlog.get_logger()
settings = get_settings()

WHATSAPP_API_BASE = f"https://graph.facebook.com/{settings.whatsapp_api_version}"


async def send_whatsapp_message(
    tenant_id: str,
    to_number: str,
    message_type: str,
    content: str = None,
    quote_id: str = None,
) -> dict:
    """Send a WhatsApp message via Meta Cloud API.

    If WhatsApp is not configured, logs the message that would be sent
    and returns success (for demo/testing).
    """
    supabase = get_supabase()
    tenant = (
        supabase.table("tenants")
        .select("whatsapp_phone_id, name")
        .eq("id", tenant_id)
        .single()
        .execute()
    )

    shop_name = tenant.data.get("name", "Shop") if tenant.data else "Shop"

    # Build the message body
    if message_type == "quote" and quote_id:
        message_body = await _format_quote_message(quote_id, shop_name)
    elif message_type == "offer":
        message_body = content or "Check out our latest offers!"
    elif message_type == "tracking":
        message_body = content or "Your order status has been updated."
    else:
        message_body = content or "Thank you for contacting us!"

    # If WhatsApp not configured, log and return success (demo mode)
    if not tenant.data or not tenant.data.get("whatsapp_phone_id") or not settings.whatsapp_access_token:
        logger.info(
            "WhatsApp (DEMO MODE - not sent)",
            to=to_number,
            type=message_type,
            message_preview=message_body[:200],
        )
        return {
            "success": True,
            "demo_mode": True,
            "message_body": message_body,
            "note": "WhatsApp not configured — message logged but not sent. Configure whatsapp_phone_id in tenant settings.",
        }

    phone_id = tenant.data["whatsapp_phone_id"]
    to_number_clean = to_number.lstrip("+")

    payload = {
        "messaging_product": "whatsapp",
        "to": to_number_clean,
        "type": "text",
        "text": {"body": message_body},
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{WHATSAPP_API_BASE}/{phone_id}/messages",
                json=payload,
                headers={
                    "Authorization": f"Bearer {settings.whatsapp_access_token}",
                    "Content-Type": "application/json",
                },
            )

            if response.status_code == 200:
                logger.info("WhatsApp sent", to=to_number, type=message_type)
                return {"success": True, "response": response.json()}
            else:
                logger.error("WhatsApp send failed", status=response.status_code, body=response.text)
                return {"success": False, "error": response.text}

    except Exception as e:
        logger.error("WhatsApp API error", error=str(e))
        return {"success": False, "error": str(e)}


async def _format_quote_message(quote_id: str, shop_name: str) -> str:
    """Format a quote into a WhatsApp-friendly message."""
    supabase = get_supabase()

    order = (
        supabase.table("orders")
        .select("*, order_items(*, products(name, brand))")
        .eq("id", quote_id)
        .single()
        .execute()
    )

    if not order.data:
        return "Your quote is being prepared. We'll send it shortly!"

    data = order.data
    lines = [
        f"*Quote from {shop_name}*",
        f"Order #: {data['order_number']}",
        "",
    ]

    for item in data.get("order_items", []):
        product = item.get("products", {})
        name = product.get("name", "Product")
        qty = item.get("quantity", 1)
        price = item.get("unit_price", 0)
        lines.append(f"  {name} x{qty} -- Rs.{float(price):,.0f}")

    lines.append("")
    lines.append(f"*Total: Rs.{float(data['total_amount']):,.0f}*")
    lines.append("")
    lines.append("Reply YES to confirm or call us for changes!")
    lines.append(f"\n- {shop_name}, Nehru Place")

    return "\n".join(lines)
