"""Transfer the call to a human (shop owner/staff)."""

import structlog

logger = structlog.get_logger()

TOOL_DEFINITION = {
    "name": "transfer_to_human",
    "description": "Transfer the call to the shop owner or staff. Use when: customer explicitly asks, AI cannot resolve the query after web search, or the interaction requires human judgment.",
    "input_schema": {
        "type": "object",
        "properties": {
            "reason": {
                "type": "string",
                "description": "Why the call is being transferred",
            },
            "priority": {
                "type": "string",
                "enum": ["normal", "urgent"],
                "description": "Transfer priority level",
            },
        },
        "required": ["reason"],
    },
}


async def transfer_to_human(
    tenant_id: str,
    caller_number: str,
    reason: str,
    priority: str = "normal",
    **kwargs,
) -> dict:
    # TODO: Implement actual Twilio call transfer / queue placement
    logger.info(
        "Human handoff requested",
        tenant_id=tenant_id,
        caller=caller_number,
        reason=reason,
        priority=priority,
    )

    return {
        "success": True,
        "action": "transferring",
        "message": f"Transferring call to shop. Reason: {reason}",
        "queue_position": 1,
    }
