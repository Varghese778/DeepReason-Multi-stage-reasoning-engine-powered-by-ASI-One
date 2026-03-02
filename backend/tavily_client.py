"""Optional Tavily web search client for grounding research in live data.

If TAVILY_API_KEY is set, web search results are injected into the research
prompt as <context> blocks. If unset, the client returns empty strings.
"""

from __future__ import annotations

import asyncio
import logging
import os

logger = logging.getLogger("tavily_client")

_API_KEY = os.environ.get("TAVILY_API_KEY")
_client = None

if _API_KEY:
    from tavily import TavilyClient

    _client = TavilyClient(api_key=_API_KEY)


async def search(query: str, max_results: int = 3) -> str:
    if _client is None:
        return ""
    try:
        response = await asyncio.to_thread(
            _client.search, query, max_results=max_results
        )
        return "".join(
            f"Source: {r['url']}\nSnippet: {r['content']}\n\n"
            for r in response.get("results", [])
        )
    except Exception as exc:
        logger.warning("tavily_search_failed query=%r error=%s", query, exc)
        return ""
