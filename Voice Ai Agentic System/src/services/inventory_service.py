"""Inventory data access service."""

from typing import Optional
import structlog

from src.db.connection import get_supabase

logger = structlog.get_logger()


async def search_products(
    tenant_id: str,
    query: str,
    category: str = None,
    brand: str = None,
    max_price: float = None,
    in_stock_only: bool = True,
) -> list[dict]:
    """Search products with filters. Splits query into keywords for broader matching."""
    supabase = get_supabase()
    q = supabase.table("products").select("*").eq("tenant_id", tenant_id).eq("is_active", True)

    if in_stock_only:
        q = q.gt("stock_quantity", 0)

    if brand:
        q = q.ilike("brand", f"%{brand}%")

    if max_price:
        q = q.lte("selling_price", max_price)

    # Split query into keywords for broader matching
    keywords = [k.strip() for k in query.split() if len(k.strip()) >= 2]

    # Try exact substring match first
    exact_result = (
        supabase.table("products").select("*")
        .eq("tenant_id", tenant_id).eq("is_active", True)
        .gt("stock_quantity", 0) if in_stock_only else
        supabase.table("products").select("*")
        .eq("tenant_id", tenant_id).eq("is_active", True)
    )
    if brand:
        exact_result = exact_result.ilike("brand", f"%{brand}%")
    if max_price:
        exact_result = exact_result.lte("selling_price", max_price)

    exact_data = (
        exact_result.ilike("name", f"%{query}%")
        .order("selling_price", desc=False)
        .limit(10)
        .execute()
    )

    if exact_data.data:
        return exact_data.data

    # Fall back: match any individual keyword in the name
    if keywords:
        fallback = (
            supabase.table("products").select("*")
            .eq("tenant_id", tenant_id).eq("is_active", True)
        )
        if in_stock_only:
            fallback = fallback.gt("stock_quantity", 0)
        if brand:
            fallback = fallback.ilike("brand", f"%{brand}%")
        if max_price:
            fallback = fallback.lte("selling_price", max_price)

        or_conditions = ",".join([f"name.ilike.%{kw}%" for kw in keywords])
        result = (
            fallback.or_(or_conditions)
            .order("selling_price", desc=False)
            .limit(10)
            .execute()
        )
        return result.data or []

    return []


async def get_top_products(tenant_id: str, limit: int = 15) -> list[dict]:
    """Get top products for system prompt context."""
    supabase = get_supabase()
    result = (
        supabase.table("products")
        .select("name, brand, selling_price, stock_quantity, specs")
        .eq("tenant_id", tenant_id)
        .eq("is_active", True)
        .order("stock_quantity", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []


async def get_product_stock(
    tenant_id: str,
    product_name: str = None,
    product_id: str = None,
) -> Optional[dict]:
    """Get stock info for a specific product."""
    supabase = get_supabase()
    q = supabase.table("products").select("id, name, selling_price, stock_quantity").eq("tenant_id", tenant_id)

    if product_id:
        q = q.eq("id", product_id)
    elif product_name:
        q = q.ilike("name", f"%{product_name}%")
    else:
        return None

    result = q.limit(1).single().execute()
    return result.data if result.data else None


async def get_products_by_ids(tenant_id: str, product_ids: list[str]) -> list[dict]:
    """Get multiple products by their IDs."""
    supabase = get_supabase()
    result = (
        supabase.table("products")
        .select("*")
        .eq("tenant_id", tenant_id)
        .in_("id", product_ids)
        .execute()
    )
    return result.data or []
