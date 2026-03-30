from fastapi import APIRouter
import structlog

logger = structlog.get_logger()

router = APIRouter()


@router.get("/status/{tenant_id}")
async def get_queue_status(tenant_id: str):
    """Get the current call queue status for a tenant."""
    # TODO: Implement queue status from database
    return {
        "tenant_id": tenant_id,
        "queue_length": 0,
        "active_calls": 0,
        "waiting": [],
    }
