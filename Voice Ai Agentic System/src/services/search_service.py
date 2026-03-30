"""Web search service using Tavily."""

import structlog

from src.config import get_settings

logger = structlog.get_logger()
settings = get_settings()


async def tavily_search(query: str, max_results: int = 3) -> list[dict]:
    """Search the web using Tavily API.

    Returns empty list with helpful message if API key is not configured.
    """
    if not settings.tavily_api_key:
        logger.info("Web search skipped — no Tavily API key configured", query=query)
        return [{
            "title": "Web search unavailable",
            "content": "Web search is not configured yet. Please answer based on your existing knowledge, or offer to connect the customer to the shop for more details.",
            "url": "",
        }]

    try:
        from tavily import AsyncTavilyClient

        client = AsyncTavilyClient(api_key=settings.tavily_api_key)
        response = await client.search(
            query=query,
            search_depth="basic",
            max_results=max_results,
            include_answer=True,
        )

        results = []
        if response.get("answer"):
            results.append({
                "title": "AI Summary",
                "content": response["answer"],
                "url": "",
            })

        for item in response.get("results", [])[:max_results]:
            results.append({
                "title": item.get("title", ""),
                "content": item.get("content", ""),
                "url": item.get("url", ""),
            })

        return results

    except Exception as e:
        logger.error("Tavily search error", error=str(e))
        return [{
            "title": "Search error",
            "content": f"Web search failed. Please try answering from your knowledge or offer to connect to the shop.",
            "url": "",
        }]
