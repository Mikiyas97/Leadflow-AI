"""LeadFlow AI - Hunter.io Service for Domain Search, Email Finder, and Deliverability Verification"""
import logging
from typing import List, Dict, Any, Optional
import httpx
from backend.app.config import settings

logger = logging.getLogger("leadflow.hunter")

DECISION_MAKER_TITLES = [
    "founder", "co-founder", "ceo", "cto", "cio", "coo", "chief",
    "chief information officer", "it director", "it manager", "head of it",
    "vp of it", "director of information technology", "information technology",
    "head of operations", "head of", "director", "vice president", "vp",
    "owner", "president", "managing director"
]


class HunterService:
    BASE_URL = "https://api.hunter.io/v2"

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.HUNTER_API_KEY

    def is_configured(self) -> bool:
        return bool(self.api_key)

    async def search_domain(self, domain: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Search Hunter.io for verified email contacts associated with a company domain.
        Prioritizes relevant decision-makers (Founders, CTOs, CEOs, Heads of Operations).
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
                        position = item.get("position") or "Decision Maker"

                        # Strict verification: verified ONLY if confidence >= 80
                        status = "verified" if confidence >= 80 else "unverified"
                        
                        contacts.append({
                            "name": name,
                            "job_title": position,
                            "email": email_val,
                            "email_status": status,
                            "confidence_score": confidence,
                            "source_url": source_url
                        })
                    
                    # Prioritize relevant decision-makers
                    def _rank_contact(c: Dict[str, Any]) -> tuple:
                        pos = (c.get("job_title") or "").lower()
                        is_dm = any(dm in pos for dm in DECISION_MAKER_TITLES)
                        return (1 if is_dm else 0, c.get("confidence_score") or 0)

                    contacts.sort(key=_rank_contact, reverse=True)
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

    async def find_email(
        self,
        domain: str,
        full_name: Optional[str] = None,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        company: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Use Hunter.io Email Finder (/v2/email-finder) to locate a specific decision-maker's work email.
        """
        clean_domain = self._clean_domain(domain)
        if not clean_domain or not self.is_configured():
            return None

        url = f"{self.BASE_URL}/email-finder"
        params: Dict[str, Any] = {"domain": clean_domain, "api_key": self.api_key}
        if first_name and last_name:
            params["first_name"] = first_name
            params["last_name"] = last_name
        elif full_name:
            params["full_name"] = full_name
        if company:
            params["company"] = company

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(url, params=params)
                if res.status_code == 200:
                    data = res.json().get("data", {})
                    email_val = data.get("email")
                    if email_val:
                        first = data.get("first_name") or ""
                        last = data.get("last_name") or ""
                        name = f"{first} {last}".strip() or full_name or "Decision Maker"
                        confidence = data.get("score") or 0
                        status = "verified" if confidence >= 80 else "unverified"
                        return {
                            "name": name,
                            "job_title": data.get("position") or "Decision Maker",
                            "email": email_val,
                            "email_status": status,
                            "confidence_score": confidence,
                            "source_url": f"https://{clean_domain}"
                        }
        except Exception as e:
            logger.error(f"Hunter.io email finder error for {clean_domain}: {e}")
        return None

    async def verify_email(self, email: str) -> Dict[str, Any]:
        """
        Verify an email address using Hunter.io email-verifier endpoint.
        Returns deliverability status: deliverable, risky, undeliverable, or unverified.
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
                    
                    # Deliverability check
                    if status_raw == "valid" and score >= 80:
                        status = "deliverable"
                    elif status_raw in ("accept_all", "webmail") or (score < 80 and status_raw != "invalid"):
                        status = "risky"
                    elif status_raw in ("invalid", "disposable"):
                        status = "undeliverable"
                    else:
                        status = "unverified"

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
