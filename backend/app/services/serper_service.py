"""LeadFlow AI - Serper.dev Google Search API Service"""
import logging
from typing import List, Dict, Any, Optional
import httpx
from backend.app.config import settings

logger = logging.getLogger("leadflow.serper")


class SerperService:
    BASE_URL = "https://google.serper.dev/search"

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.SERPER_API_KEY

    def is_configured(self) -> bool:
        return bool(self.api_key)

    async def search_google(
        self,
        query: str,
        num: int = 10,
        country: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Execute Google Search via Serper.dev API.
        Returns list of organic search results with title, link, snippet, and sitelinks.
        """
        if not self.is_configured():
            logger.info("Serper.dev API key not configured. Will use Firecrawl fallback.")
            return []

        headers = {
            "X-API-KEY": self.api_key,
            "Content-Type": "application/json"
        }
        payload: Dict[str, Any] = {
            "q": query,
            "num": min(num, 20)
        }
        if country:
            payload["gl"] = country.lower()

        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                res = await client.post(self.BASE_URL, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    organic = data.get("organic", [])
                    results = []
                    for item in organic:
                        results.append({
                            "title": item.get("title", ""),
                            "link": item.get("link", ""),
                            "snippet": item.get("snippet", ""),
                            "position": item.get("position", 0),
                            "sitelinks": [
                                {"title": sl.get("title", ""), "link": sl.get("link", "")}
                                for sl in item.get("sitelinks", [])
                            ]
                        })
                    logger.info(f"Serper.dev returned {len(results)} organic Google results for '{query}'.")
                    return results
                else:
                    logger.warning(f"Serper.dev returned status {res.status_code}: {res.text}")
                    return []
        except Exception as e:
            logger.error(f"Serper.dev request error for query '{query}': {e}")
            return []

    def clean_domain(self, url: str) -> str:
        """Extract clean root domain from URL."""
        if not url:
            return ""
        cleaned = url.replace("https://", "").replace("http://", "").split("/")[0].strip().lower()
        if cleaned.startswith("www."):
            cleaned = cleaned[4:]
        return cleaned


serper_service = SerperService()
