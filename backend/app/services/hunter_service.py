"""LeadFlow AI - Hunter.io Service for Domain Search and Email Verification"""
import logging
from typing import List, Dict, Any, Optional
import httpx
from backend.app.config import settings

logger = logging.getLogger("leadflow.hunter")


class HunterService:
    BASE_URL = "https://api.hunter.io/v2"

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.HUNTER_API_KEY

    def is_configured(self) -> bool:
        return bool(self.api_key)

    async def search_domain(self, domain: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Search Hunter.io for verified email contacts associated with a company domain.
        Returns empty list if no contacts found or service unavailable. Never fabricates contacts.
        """
        clean_domain = self._clean_domain(domain)
        if not clean_domain or clean_domain.endswith(".local") or clean_domain.endswith(".directory"):
            return []

        if not self.is_configured():
            logger.info(f"Hunter API key not configured. Returning empty contacts for {clean_domain}.")
            return []

        url = f"{self.BASE_URL}/domain-search"
        params = {
            "domain": clean_domain,
            "api_key": self.api_key,
            "limit": limit
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url, params=params)
                
                if response.status_code == 200:
                    data = response.json().get("data", {})
                    emails = data.get("emails", [])
                    contacts = []
                    for item in emails:
                        first = item.get("first_name") or ""
                        last = item.get("last_name") or ""
                        name = f"{first} {last}".strip() or "Business Representative"
                        sources = item.get("sources", [])
                        source_url = sources[0].get("uri") if sources else f"https://{clean_domain}"
                        confidence = item.get("confidence") or 0
                        email_val = item.get("value")

                        # Strict verification: verified ONLY if confidence >= 80
                        status = "verified" if confidence >= 80 else "unverified"
                        
                        contacts.append({
                            "name": name,
                            "job_title": item.get("position") or "Decision Maker",
                            "email": email_val,
                            "email_status": status,
                            "confidence_score": confidence,
                            "source_url": source_url
                        })
                    return contacts
                
                elif response.status_code in (402, 429):
                    logger.warning(f"Hunter.io quota reached or rate-limited (status {response.status_code}).")
                    return []
                else:
                    logger.warning(f"Hunter.io returned status {response.status_code} for {clean_domain}: {response.text}")
                    return []

        except Exception as e:
            logger.error(f"Hunter.io network error for {clean_domain}: {e}")
            return []

    async def verify_email(self, email: str) -> Dict[str, Any]:
        """
        Verify an email address using Hunter.io email-verifier endpoint.
        """
        if not email or not self.is_configured():
            return {"status": "unverified", "score": 0, "result": "api_not_configured_or_empty"}

        url = f"{self.BASE_URL}/email-verifier"
        params = {"email": email, "api_key": self.api_key}

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.get(url, params=params)
                if res.status_code == 200:
                    data = res.json().get("data", {})
                    status_raw = data.get("status", "unknown")
                    score = data.get("score") or 0
                    
                    # Strict verification gate: verified only if valid and deliverable
                    status = "verified" if status_raw == "valid" and score >= 80 else "unverified"
                    if status_raw in ("invalid", "disposable"):
                        status = "invalid"

                    return {
                        "status": status,
                        "score": score,
                        "result": data.get("result", status_raw)
                    }
                else:
                    return {"status": "unverified", "score": 0, "result": f"http_{res.status_code}"}
        except Exception as e:
            logger.error(f"Hunter email verification error: {e}")
            return {"status": "unverified", "score": 0, "result": str(e)}

    def _clean_domain(self, domain: str) -> str:
        clean = domain.replace("https://", "").replace("http://", "").split("/")[0]
        return clean.strip().lower()


hunter_service = HunterService()
