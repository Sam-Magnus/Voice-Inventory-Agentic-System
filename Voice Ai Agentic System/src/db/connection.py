"""Database connection pool using Supabase Python client."""

from functools import lru_cache
from supabase import create_client, Client
import structlog

from src.config import get_settings

logger = structlog.get_logger()
settings = get_settings()

_supabase_client: Client = None


def get_supabase() -> Client:
    """Get or create the Supabase client (service role for backend)."""
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key,
        )
        logger.info("Supabase client initialized")
    return _supabase_client
