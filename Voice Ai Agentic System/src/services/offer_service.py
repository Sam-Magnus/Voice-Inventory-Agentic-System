"""Offer and promotions service."""

import structlog
from src.db.connection import get_supabase

logger = structlog.get_logger()


async def get_active_offers(tenant_id: str) -> list[dict]:
    """Get all currently active offers for a tenant."""
    supabase = get_supabase()
    result = (
        supabase.table("offers")
        .select("*")
        .eq("tenant_id", tenant_id)
        .eq("is_active", True)
        .execute()
    )
    return result.data or []
