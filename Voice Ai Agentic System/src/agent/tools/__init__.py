"""Agent tool definitions and execution."""

import json
from typing import Any
import structlog

from src.agent.tools.inventory_search import search_inventory, TOOL_DEFINITION as INVENTORY_SEARCH_DEF
from src.agent.tools.stock_check import check_stock, TOOL_DEFINITION as STOCK_CHECK_DEF
from src.agent.tools.quote_generator import generate_quote, TOOL_DEFINITION as QUOTE_DEF
from src.agent.tools.whatsapp_sender import send_whatsapp, TOOL_DEFINITION as WHATSAPP_DEF
from src.agent.tools.web_search import web_search, TOOL_DEFINITION as WEB_SEARCH_DEF
from src.agent.tools.human_handoff import transfer_to_human, TOOL_DEFINITION as HANDOFF_DEF
from src.agent.tools.hold_music import play_hold_music, TOOL_DEFINITION as HOLD_MUSIC_DEF
from src.agent.tools.pc_build_wizard import pc_build_wizard, TOOL_DEFINITION as PC_BUILD_DEF

logger = structlog.get_logger()

ALL_TOOLS = [
    INVENTORY_SEARCH_DEF,
    STOCK_CHECK_DEF,
    QUOTE_DEF,
    WHATSAPP_DEF,
    WEB_SEARCH_DEF,
    HANDOFF_DEF,
    HOLD_MUSIC_DEF,
    PC_BUILD_DEF,
]

TOOL_EXECUTORS = {
    "search_inventory": search_inventory,
    "check_stock": check_stock,
    "generate_quote": generate_quote,
    "send_whatsapp": send_whatsapp,
    "web_search": web_search,
    "transfer_to_human": transfer_to_human,
    "play_hold_music": play_hold_music,
    "pc_build_wizard": pc_build_wizard,
}


def get_tool_definitions() -> list[dict]:
    return ALL_TOOLS


async def execute_tool(
    tool_name: str,
    tool_input: dict[str, Any],
    tenant_id: str,
    caller_number: str,
) -> Any:
    """Execute a tool call and return the result."""
    executor = TOOL_EXECUTORS.get(tool_name)
    if not executor:
        logger.warning("Unknown tool", tool=tool_name)
        return {"error": f"Unknown tool: {tool_name}"}

    try:
        # Coerce types (Groq/Llama sometimes sends wrong types)
        for k, v in tool_input.items():
            if isinstance(v, str) and v.lower() in ("true", "false"):
                tool_input[k] = v.lower() == "true"
            elif isinstance(v, str) and v.replace(".", "", 1).isdigit():
                tool_input[k] = float(v) if "." in v else int(v)
            elif isinstance(v, str) and v.startswith("["):
                # Groq sometimes sends arrays as JSON strings
                try:
                    tool_input[k] = json.loads(v)
                except (json.JSONDecodeError, ValueError):
                    pass

        result = await executor(
            tenant_id=tenant_id,
            caller_number=caller_number,
            **tool_input,
        )
        logger.info("Tool executed", tool=tool_name, success=True)
        return result
    except Exception as e:
        logger.error("Tool execution failed", tool=tool_name, error=str(e))
        return {"error": f"Tool failed: {str(e)}"}
