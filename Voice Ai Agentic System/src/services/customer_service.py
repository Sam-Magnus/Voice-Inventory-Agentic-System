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
    result = (
        supabase.table("order_items")
        .select("quantity, unit_price, discount, products(name), orders(created_at, order_number)")
        .eq("orders.tenant_id", tenant_id)
        .eq("orders.customer_id", customer_id)
        .order("orders.created_at", desc=True)
        .limit(limit)
        .execute()
    )

    purchases = []
    for item in result.data or []:
        purchases.append(
            {
                "product_name": item.get("products", {}).get("name", "Unknown"),
                "unit_price": item.get("unit_price", 0),
                "quantity": item.get("quantity", 1),
                "date": item.get("orders", {}).get("created_at", ""),
                "order_number": item.get("orders", {}).get("order_number", ""),
            }
        )

    return purchases
