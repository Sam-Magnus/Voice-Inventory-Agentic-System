"""Customer data access service."""

from typing import Optional
import structlog

from src.db.connection import get_supabase

logger = structlog.get_logger()


async def lookup_customer_by_phone(
    tenant_id: str, phone: str
) -> Optional[dict]:
    """Find a customer by phone number."""
    supabase = get_supabase()
    result = (
        supabase.table("customers")
        .select("*")
        .eq("tenant_id", tenant_id)
        .eq("phone", phone)
        .limit(1)
        .maybe_single()
        .execute()
    )
    return result.data if result.data else None


async def get_customer_purchases(
    tenant_id: str, customer_id: str, limit: int = 10
) -> list[dict]:
    """Get recent purchase history for a customer."""
    supabase = get_supabase()

    # Query orders for this customer, then get items
    orders_result = (
        supabase.table("orders")
        .select("id, order_number, created_at, order_items(quantity, unit_price, product_id, products(name))")
        .eq("tenant_id", tenant_id)
        .eq("customer_id", customer_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )

    purchases = []
    for order in orders_result.data or []:
        for item in order.get("order_items", []):
            purchases.append({
                "product_name": item.get("products", {}).get("name", "Unknown"),
                "unit_price": item.get("unit_price", 0),
                "quantity": item.get("quantity", 1),
                "date": order.get("created_at", ""),
                "order_number": order.get("order_number", ""),
            })

    return purchases
