"""Tenant resolution and management."""

from typing import Optional
import structlog

from src.db.connection import get_supabase

logger = structlog.get_logger()


async def resolve_tenant_by_phone(phone_number: str) -> Optional[dict]:
    """Resolve a tenant by their Twilio phone number."""
    supabase = get_supabase()
    result = (
        supabase.table("tenants")
        .select("*")
        .eq("twilio_phone", phone_number)
        .single()
        .execute()
    )
    return result.data if result.data else None


async def get_tenant_by_id(tenant_id: str) -> Optional[dict]:
    """Get tenant details by ID."""
    supabase = get_supabase()
    result = (
        supabase.table("tenants")
        .select("*")
        .eq("id", tenant_id)
        .single()
        .execute()
    )
    return result.data if result.data else None
