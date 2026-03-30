"""Web search tool for out-of-bounds queries."""

from src.services.search_service import tavily_search

TOOL_DEFINITION = {
    "name": "web_search",
    "description": "Search the web for current market prices, product reviews, compatibility info, or any query the customer has that isn't in our inventory data.",
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Search query, e.g. 'RTX 4070 vs 4070 Ti benchmark comparison' or 'best motherboard for i7 14700K'",
            },
        },
        "required": ["query"],
    },
}


async def web_search(
    tenant_id: str,
    caller_number: str,
    query: str,
    **kwargs,
) -> dict:
    results = await tavily_search(query)

    if not results:
        return {
            "found": False,
            "message": "No relevant results found.",
        }

    return {
        "found": True,
        "results": results[:3],  # Top 3 results
    }
