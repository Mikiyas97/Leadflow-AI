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
        directory_domains = [
            "tripadvisor.", "booking.com", "facebook.com", "instagram.com",
            "yellowpages.", "expedia.", "hotels.com", "agoda.com", "kayak.com",
            "google.com", "yelp.com", "linkedin.com", "twitter.com", "x.com",
            "fastercapital.com", "techcabal.com", "disrupt-africa.com", "medium.com",
            "substack.com", "forbes.com", "techcrunch.com", "wikipedia.org", "tracxn.com",
            "crunchbase.com", "clutch.co", "goodfirms.co", "g2.com", "glassdoor.com",
            "indeed.com", "venturesafrica.com", "theafricareport.com", "africanbusiness.com",
            "f6s.com", "startupranking.com", "pitchbook.com", "allafrica.com", "bloomberg.com"
        ]

        clean_comp_words = set(re.findall(r"[a-zA-Z]{3,}", company_name.lower())) - {
            "hotel", "resort", "ltd", "inc", "the", "and", "group", "holdings", "company", "technologies", "services"
        }

        # If an explicit initial URL is supplied, ONLY accept if it is not a media/directory domain
        # AND its domain name shares token characters with the candidate company name
        if initial_url:
            init_lower = initial_url.lower()
            is_media_or_dir = any(d in init_lower for d in directory_domains)
            domain_part = init_lower.replace("https://", "").replace("http://", "").split("/")[0]
            name_in_domain = any(w in domain_part for w in clean_comp_words) if clean_comp_words else True
            if not is_media_or_dir and name_in_domain:
                return {
                    "website_status": "HAS_OFFICIAL_WEBSITE",
                    "website": initial_url,
                    "evidence": f"Confirmed dedicated brand domain: {initial_url}"
                }

        search_query = f'"{company_name}" "{location}" official website'
        search_results = await self.search_web(search_query, limit=5)

        if not search_results:
            clean_token = re.sub(r"[^a-z0-9-]", "", company_name.lower().replace(" ", "-"))
            return {
                "website_status": "WEBSITE_STATUS_UNCERTAIN",
                "website": initial_url or f"{clean_token or 'company'}-listing.local",
                "evidence": f"Search for {company_name} in {location} was inconclusive (no web search results returned)."
            }

        dedicated_website = None
        directory_matches = []

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
            domain_only = dedicated_website.replace("https://", "").replace("http://", "").split("/")[0]
            # Check for outdated website signals via content analysis
            scrape_data = await self.scrape_company_website(dedicated_website)
            content_sample = (scrape_data.get("content", "") + " " + scrape_data.get("title", "")).lower()

            # Detect outdated indicators: e.g. legacy copyright year (<= 2021), unmaintained placeholders
            copyright_years = re.findall(r"(?:©|&copy;|copyright)\s*(?:[12][0-9]{3}\s*[-–]\s*)?([12][0-9]{3})", content_sample)
            is_outdated = False
            outdated_reason = ""
            if copyright_years:
                valid_years = [int(y) for y in copyright_years if 1995 <= int(y) <= 2030]
                if valid_years:
                    latest_year = max(valid_years)
                    if latest_year <= 2021:
                        is_outdated = True
                        outdated_reason = f"legacy copyright year © {latest_year}"

            if not is_outdated and any(p in content_sample for p in ["under construction", "coming soon", "site is under maintenance"]):
                is_outdated = True
                outdated_reason = "placeholder or unmaintained notice"

            if is_outdated:
                return {
                    "website_status": "OUTDATED_WEBSITE",
                    "website": domain_only,
                    "evidence": f"Identified official website ({domain_only}), but evidence confirms outdated status ({outdated_reason})."
                }

            return {
                "website_status": "HAS_OFFICIAL_WEBSITE",
                "website": domain_only,
                "evidence": f"Identified active official website: {dedicated_website}"
            }
        elif directory_matches:
            return {
                "website_status": "NO_OFFICIAL_WEBSITE_FOUND",
                "website": directory_matches[0].replace("https://", "").replace("http://", "").split("/")[0],
                "evidence": f"Confirmed missing official website. Found regional directory/business listings only ({', '.join([d.split('/')[2] for d in directory_matches[:2]])})."
            }
        else:
            clean_token = re.sub(r"[^a-z0-9-]", "", company_name.lower().replace(" ", "-"))
            return {
                "website_status": "WEBSITE_STATUS_UNCERTAIN",
                "website": initial_url or f"{clean_token or 'company'}.directory",
                "evidence": "Search was inconclusive. Official website could not be found or verified with certainty."
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

        # Skip local, placeholder, or synthetic domains without internet endpoints
        clean_u = url.strip()
        if any(d in clean_u.lower() for d in [".local", ".directory", "localhost"]) or " " in clean_u or "'" in clean_u or '"' in clean_u:
            return {
                "success": False,
                "source": "placeholder_url",
                "title": "",
                "description": "Local/directory placeholder domain - skipping web scrape.",
                "content": "",
                "source_urls": []
            }

        if not clean_u.startswith("http://") and not clean_u.startswith("https://"):
            clean_u = f"https://{clean_u}"

        # Validate URL format before sending to external scraping API
        if not re.match(r"^https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:/.*)?$", clean_u):
            return {
                "success": False,
                "source": "invalid_url",
                "title": "",
                "description": "Malformed URL format - skipping web scrape.",
                "content": "",
                "source_urls": []
            }

        # 1. Try Firecrawl API if configured
        if self.is_configured():
            try:
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "url": clean_u,
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
                            "source_urls": [clean_u]
                        }
                    elif response.status_code in (402, 429):
                        logger.warning(f"Firecrawl quota exhausted or rate-limited (HTTP {response.status_code}). Falling back to direct extraction.")
                    elif response.status_code == 400:
                        logger.warning(f"Firecrawl cannot scrape {clean_u} (HTTP 400 Bad Request). Falling back to direct extraction.")
                    else:
                        logger.warning(f"Firecrawl scrape failed with status {response.status_code}")
            except Exception as e:
                logger.error(f"Firecrawl API error: {e}. Falling back to direct extraction.")

        # 2. Fallback to direct HTTP fetch & regex text cleaner
        return await self._direct_fetch_and_clean(clean_u)

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
