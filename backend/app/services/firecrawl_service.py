"""LeadFlow AI - Firecrawl & Web Research Service"""
import logging
import re
from typing import Dict, Any, Optional, List
import httpx
from backend.app.config import settings

logger = logging.getLogger("leadflow.firecrawl")


class FirecrawlService:
    BASE_URL = "https://api.firecrawl.dev/v1"

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.FIRECRAWL_API_KEY

    def is_configured(self) -> bool:
        return bool(self.api_key)

    async def search_web(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Executes a live web search using Firecrawl's /search endpoint.
        Returns actual web results with titles, descriptions, URLs, and snippets.
        """
        if not self.is_configured():
            logger.warning("Firecrawl API key not configured for search.")
            return []

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "query": query,
            "limit": limit
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(f"{self.BASE_URL}/search", json=payload, headers=headers)
                if response.status_code == 200:
                    data = response.json().get("data", [])
                    results = []
                    for item in data:
                        results.append({
                            "url": item.get("url", ""),
                            "title": item.get("title", ""),
                            "description": item.get("description", ""),
                            "content": item.get("markdown", "") or item.get("description", ""),
                        })
                    return results
                else:
                    logger.warning(f"Firecrawl search returned status {response.status_code}: {response.text}")
                    return []
        except Exception as e:
            logger.error(f"Firecrawl search request failed: {e}")
            return []

    async def investigate_official_website(
        self,
        company_name: str,
        location: str,
        initial_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Investigates whether a business has an official, dedicated website or only directory listings.
        Distinguishes:
        - HAS_OFFICIAL_WEBSITE (dedicated brand domain found)
        - NO_OFFICIAL_WEBSITE_FOUND (only directory profiles like TripAdvisor, Facebook, Booking.com, YellowPages found)
        - WEBSITE_STATUS_UNCERTAIN (inconclusive evidence)
        """
        # If an explicit non-directory URL is already supplied
        if initial_url and not any(dir_domain in initial_url.lower() for dir_domain in [
            "tripadvisor", "booking.com", "facebook.com", "instagram.com", "yellowpages", "expedia", "hotels.com"
        ]):
            return {
                "website_status": "HAS_OFFICIAL_WEBSITE",
                "website": initial_url,
                "evidence": f"Confirmed dedicated website domain: {initial_url}"
            }

        search_query = f'"{company_name}" "{location}" official website'
        search_results = await self.search_web(search_query, limit=5)

        if not search_results:
            return {
                "website_status": "WEBSITE_STATUS_UNCERTAIN",
                "website": initial_url or f"{company_name.lower().replace(' ', '')}-listing.local",
                "evidence": f"Search for {company_name} in {location} was inconclusive (no web search results returned)."
            }

        # Check search results for dedicated domains vs aggregator/directory listings
        directory_domains = [
            "tripadvisor.", "booking.com", "facebook.com", "instagram.com",
            "yellowpages.", "expedia.", "hotels.com", "agoda.com", "kayak.com",
            "google.com/maps", "yelp.com", "linkedin.com"
        ]

        dedicated_website = None
        directory_matches = []

        clean_comp_words = set(re.findall(r"[a-zA-Z]{3,}", company_name.lower()))

        for res in search_results:
            url = res.get("url", "").lower()
            is_directory = any(d in url for d in directory_domains)
            if is_directory:
                directory_matches.append(res.get("url"))
            else:
                # Check if URL appears to be the business's own domain
                domain_part = url.replace("https://", "").replace("http://", "").split("/")[0]
                if any(w in domain_part for w in clean_comp_words):
                    dedicated_website = res.get("url")
                    break

        if dedicated_website:
            return {
                "website_status": "HAS_OFFICIAL_WEBSITE",
                "website": dedicated_website.replace("https://", "").replace("http://", "").split("/")[0],
                "evidence": f"Identified official website: {dedicated_website}"
            }
        elif directory_matches:
            return {
                "website_status": "NO_OFFICIAL_WEBSITE_FOUND",
                "website": directory_matches[0].replace("https://", "").replace("http://", "").split("/")[0],
                "evidence": f"Found business listings only ({', '.join([d.split('/')[2] for d in directory_matches[:2]])}). No dedicated official website identified."
            }
        else:
            return {
                "website_status": "WEBSITE_STATUS_UNCERTAIN",
                "website": initial_url or f"{company_name.lower().replace(' ', '')}.directory",
                "evidence": "Web search returned general mentions but no verifiable official website or business listing."
            }

    async def scrape_company_website(self, url: str) -> Dict[str, Any]:
        """
        Extract readable markdown or structured text from a company's website.
        Attempts Firecrawl API first; falls back to direct HTTP scraping if key is missing or quota is exhausted.
        Never fabricates content; clearly labels fallback extraction.
        """
        if not url:
            return {
                "success": False,
                "source": "empty_url",
                "title": "",
                "description": "No website URL provided for scraping",
                "content": "No website provided",
                "source_urls": []
            }

        if not url.startswith("http"):
            url = f"https://{url}"

        # 1. Try Firecrawl API if configured
        if self.is_configured():
            try:
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "url": url,
                    "formats": ["markdown"],
                    "onlyMainContent": True
                }
                async with httpx.AsyncClient(timeout=15.0) as client:
                    response = await client.post(f"{self.BASE_URL}/scrape", json=payload, headers=headers)
                    if response.status_code == 200:
                        data = response.json().get("data", {})
                        markdown = data.get("markdown", "")
                        metadata = data.get("metadata", {})
                        return {
                            "success": True,
                            "source": "firecrawl",
                            "title": metadata.get("title", ""),
                            "description": metadata.get("description", ""),
                            "content": markdown[:5000],
                            "source_urls": [url]
                        }
                    elif response.status_code in (402, 429):
                        logger.warning(f"Firecrawl quota exhausted or rate-limited (HTTP {response.status_code}). Falling back to direct extraction.")
                    else:
                        logger.warning(f"Firecrawl scrape failed with status {response.status_code}: {response.text}")
            except Exception as e:
                logger.error(f"Firecrawl API error: {e}. Falling back to direct extraction.")

        # 2. Fallback to direct HTTP fetch & regex text cleaner
        return await self._direct_fetch_and_clean(url)

    async def _direct_fetch_and_clean(self, url: str) -> Dict[str, Any]:
        """Direct lightweight scraper using standard HTTP and regex tag stripping."""
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) LeadFlowBot/1.0 (B2B Lead Research)"
        }
        try:
            async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    html = resp.text
                    
                    title_match = re.search(r"<title>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
                    title = title_match.group(1).strip() if title_match else ""
                    
                    desc_match = re.search(r'<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']', html, re.IGNORECASE)
                    description = desc_match.group(1).strip() if desc_match else ""
                    
                    clean_text = re.sub(r"<(script|style).*?>.*?</\1>", "", html, flags=re.DOTALL | re.IGNORECASE)
                    clean_text = re.sub(r"<[^>]+>", " ", clean_text)
                    clean_text = re.sub(r"\s+", " ", clean_text).strip()

                    extracted_summary = f"{title}\n{description}\n\nKey Highlights: {clean_text[:1500]}"
                    return {
                        "success": True,
                        "source": "direct_http",
                        "title": title,
                        "description": description,
                        "content": extracted_summary,
                        "source_urls": [url]
                    }
                else:
                    return {
                        "success": False,
                        "source": "direct_http_error",
                        "title": "",
                        "description": f"Website returned HTTP {resp.status_code}",
                        "content": f"Unable to retrieve website content from {url} (HTTP {resp.status_code}).",
                        "source_urls": [url]
                    }
        except Exception as e:
            logger.info(f"Direct fetch failed for {url}: {e}.")
            return {
                "success": False,
                "source": "fetch_failed",
                "title": "",
                "description": f"Website connection failed: {str(e)}",
                "content": f"Could not connect to {url}. Website may be offline or inaccessible.",
                "source_urls": [url]
            }


firecrawl_service = FirecrawlService()
