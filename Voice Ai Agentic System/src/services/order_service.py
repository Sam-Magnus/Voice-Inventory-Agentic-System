"""Order and quote management service."""

import uuid
from datetime import datetime
import structlog

from src.db.connection import get_supabase
from src.services.customer_service import lookup_customer_by_phone

logger = structlog.get_logger()


async def create_quote(
    tenant_id: str,
    caller_number: str,
    customer_name: str = None,
    line_items: list[dict] = None,
    total: float = 0,
    offer_id: str = None,
    notes: str = None,
) -> dict:
    """Create a quote (draft order) from a voice call."""
    supabase = get_supabase()

    # Find or create customer
    customer = await lookup_customer_by_phone(tenant_id, caller_number)
    if not customer:
        # Create a new customer record
        customer_data = {
            "tenant_id": tenant_id,
            "name": customer_name or "Phone Customer",
            "phone": caller_number,
            "whatsapp_opted_in": True,
        }
        result = supabase.table("customers").insert(customer_data).execute()
        customer = result.data[0] if result.data else customer_data

    # Generate order number
    timestamp = datetime.now().strftime("%y%m%d%H%M")
    order_number = f"Q-{timestamp}-{str(uuid.uuid4())[:4].upper()}"

    # Create the order
    order_data = {
        "tenant_id": tenant_id,
        "customer_id": str(customer.get("id", "")),
        "order_number": order_number,
        "status": "quoted",
        "total_amount": total,
        "discount_amount": 0,
        "source": "voice-agent",
        "notes": notes,
    }

    result = supabase.table("orders").insert(order_data).execute()
    order = result.data[0] if result.data else order_data

    # Create order items
    if line_items and order.get("id"):
        for item in line_items:
            supabase.table("order_items").insert(
                {
                    "order_id": str(order["id"]),
                    "product_id": item.get("product_id", ""),
                    "quantity": item.get("quantity", 1),
                    "unit_price": item.get("unit_price", 0),
                    "discount": 0,
                }
            ).execute()

    logger.info("Quote created", order_number=order_number, total=total)
    return order
