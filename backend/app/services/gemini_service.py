"""LeadFlow AI - Gemini API Service for Lead Qualification and Outreach Drafting"""
import json
import logging
import re
from typing import Dict, Any, Optional, List
from backend.app.config import settings

logger = logging.getLogger("leadflow.gemini")

# Try importing the official google-genai SDK
try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False


class GeminiService:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.client = None
        if self.api_key and GENAI_AVAILABLE:
            try:
                self.client = genai.Client(
                    api_key=self.api_key,
                    http_options=types.HttpOptions(
                        retry_options=types.HttpRetryOptions(attempts=1),
                        timeout=30000
                    )
                )
            except Exception as e:
                logger.warning(f"Failed to initialize Gemini Client: {e}")

    PRIMARY_MODEL = "gemini-3.8-flash"
    FALLBACK_MODELS = [
        "gemini-3.5-flash",
        "gemini-3.5-flash-lite",
        "gemini-3.1-flash-lite",
        "gemini-2.5-flash-lite",
        "gemini-flash-lite-latest",
        "gemini-2.5-flash",
    ]

    def is_configured(self) -> bool:
        return bool(self.api_key and self.client)

    def generate_content_with_fallback(self, contents: Any, config: Any = None) -> Any:
        """
        Calls primary model (gemini-3.8-flash), falling back through flash and flash-lite models
        if 503 unavailable, rate-limited (429), or errored.
        """
        if not self.is_configured():
            raise RuntimeError("Gemini service is not configured.")

        models = [self.PRIMARY_MODEL] + self.FALLBACK_MODELS
        last_exception = None

        for model_name in models:
            try:
                kwargs = {"model": model_name, "contents": contents}
                if config is not None:
                    kwargs["config"] = config
                response = self.client.models.generate_content(**kwargs)
                if response and (response.text or getattr(response, "candidates", None)):
                    return response
            except Exception as e:
                err_str = str(e)
                if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                    logger.info(f"Gemini model '{model_name}' reached quota limit. Trying next model in cascade...")
                elif "503" in err_str or "UNAVAILABLE" in err_str:
                    logger.info(f"Gemini model '{model_name}' temporarily unavailable (503). Trying next model in cascade...")
                else:
                    logger.info(f"Gemini model '{model_name}' unavailable ({type(e).__name__}). Trying next model in cascade...")
                last_exception = e

        raise last_exception or RuntimeError("All Gemini model generation attempts failed.")

    def optimize_search_target(self, user_prompt: str) -> Dict[str, Any]:
        """
        Step 2: Uses Gemini to turn user request into targeted Google search queries,
        industries, locations, qualification criteria, and target decision-makers.
        """
        if self.is_configured():
            try:
                system_instruction = (
                    "You are a B2B search optimization specialist. "
                    "Analyze the user's prospecting target and return a clean JSON object with: "
                    "'search_queries': list of 2-3 specific Google search query strings for finding matching company official websites, "
                    "'industry': primary industry category, "
                    "'location': target geographical region or city/country, "
                    "'company_type': target company size or profile, "
                    "'qualification_criteria': explicit criteria to evaluate prospect fit, "
                    "'target_decision_makers': list of 2-3 target executive job titles."
                )
                prompt = f"{system_instruction}\n\nUser Request: {user_prompt}\n\nReturn strictly valid JSON only."
                response = self.generate_content_with_fallback(
                    contents=prompt,
                    config=types.GenerateContentConfig(response_mime_type="application/json", temperature=0.2)
                )
                parsed = json.loads(response.text.strip())
                if isinstance(parsed, dict) and "search_queries" in parsed:
                    return parsed
            except Exception as e:
                logger.warning(f"Gemini search optimization error: {e}. Using deterministic parsing.")

        return self._deterministic_search_optimization(user_prompt)

    def _deterministic_search_optimization(self, user_prompt: str) -> Dict[str, Any]:
        lower = user_prompt.lower()
        location = "United States"
        if "addis ababa" in lower or "ethiopia" in lower:
            location = "Addis Ababa, Ethiopia"
        elif "kenya" in lower or "nairobi" in lower:
            location = "Nairobi, Kenya"
        elif "europe" in lower or "uk" in lower or "london" in lower:
            location = "United Kingdom"
        
        industry = "B2B SaaS"
        if "hotel" in lower or "hospitality" in lower:
            industry = "Hospitality / Hotels"
        elif "fintech" in lower:
            industry = "FinTech"
        elif "healthcare" in lower or "medical" in lower:
            industry = "Healthcare"
        elif "agency" in lower or "marketing" in lower:
            industry = "Digital Marketing & Agencies"

        queries = [
            f"{industry} companies in {location}",
            f"top {industry} organizations {location}"
        ]

        decision_makers = ["Founder", "CEO", "CTO", "Head of Operations"]
        if "support" in lower:
            decision_makers = ["Head of Customer Support", "VP Customer Success", "COO", "Founder"]

        return {
            "search_queries": queries,
            "industry": industry,
            "location": location,
            "company_type": "Growth B2B Company",
            "qualification_criteria": f"Active {industry} organization in {location} with business operational needs matching {user_prompt}",
            "target_decision_makers": decision_makers
        }

    @staticmethod
    def _is_valid_company_name(name: str) -> bool:
        """Determines if a candidate string is an individual commercial business, not an article/blog title."""
        if not name or len(name.strip()) < 2:
            return False
        clean = name.strip()
        lower = clean.lower()

        # Reject headlines, listicles, trends, or editorial titles
        article_patterns = [
            r"^(?:\d+\s+)?(?:top|best|leading|fastest|greatest|notable|popular|key|innovative)\b",
            r"^(?:list\s+of|directory\s+of|guide\s+to|a\s+guide\s+to|overview\s+of|how\s+to|why|what\s+is|meet\s+the)\b",
            r"\b(?:startups|companies|businesses|hotels|firms|vendors)\s+in\b",
            r"\b(?:landscape|ecosystem|roundup|rankings?|market\s+report|industry\s+report)\b",
            r"\b(?:fintech|tech|saas)\s+startups\s+in\b",
            r"\b(?:financial\s+landscape|is\s+evolving|unprecedented|need\s+to\s+know)\b",
            r"\b(?:growing|rising|emerging|booming|evolving)\b",
            r"\b(?:sector|industry|challenges?|opportunities?|trends?|outlook|overview|future\s+of|state\s+of)\b",
            r"\b(?:investment|investing|funding|venture\s+capital)\b",
            r"\b(?:in\s+ethiopia|in\s+africa|in\s+kenya|in\s+nigeria|in\s+egypt|in\s+ghana|in\s+rwanda)\b",
            r"\b(?:ethiopia'?s|africa'?s|kenya'?s|nigeria'?s)\b",
            r"\b(?:fintech\s+sector|fintech\s+landscape|banking\s+sector|tech\s+ecosystem)\b",
        ]
        for pat in article_patterns:
            if re.search(pat, lower):
                return False

        # Known publisher/directory names
        known_publishers = {
            "fastercapital", "techcabal", "disrupt africa", "medium", "substack",
            "forbes", "techcrunch", "wikipedia", "linkedin", "tripadvisor", "tracxn",
            "crunchbase", "yellowpages", "clutch", "goodfirms", "g2", "glassdoor",
            "indeed", "yelp", "booking.com", "expedia", "hotels.com", "bloomberg",
            "reuters", "allafrica", "ventures africa", "the africa report"
        }
        if lower in known_publishers:
            return False

        # Reject long titles that resemble sentences (> 6 words without company suffixes)
        words = clean.split()
        if len(words) > 6 and not any(kw in lower for kw in ["limited", "ltd", "inc", "corp", "group", "holdings", "technologies", "solutions", "hotel", "resort"]):
            return False

        return True

    @staticmethod
    def _is_media_aggregator_domain(website: str, company_name: str) -> bool:
        """Checks if a domain belongs to a blog, news outlet, or aggregator rather than a proprietary brand."""
        if not website:
            return False
        w_lower = website.lower()
        media_domains = [
            "fastercapital.com", "techcabal.com", "disrupt-africa.com", "medium.com",
            "substack.com", "forbes.com", "techcrunch.com", "wikipedia.org", "linkedin.com",
            "tracxn.com", "crunchbase.com", "clutch.co", "goodfirms.co", "g2.com",
            "glassdoor.com", "indeed.com", "venturesafrica.com", "theafricareport.com",
            "africanbusiness.com", "bloomberg.com", "reuters.com", "allafrica.com"
        ]
        c_lower = company_name.lower().replace(" ", "")
        for md in media_domains:
            if md in w_lower and md.split(".")[0] not in c_lower:
                return True
        return False

    def extract_companies_from_article(
        self,
        title: str,
        content: str,
        industry: Optional[str] = None,
        location: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Extracts real, individual operating commercial companies/startups from blog posts,
        listicles, or directory articles (e.g. 'Top Fintech Startups in Ethiopia').
        Returns list of {'company_name': str, 'website': Optional[str], 'description': str}.
        Never returns the blog/article title or publisher name as a company.
        """
        if self.is_configured():
            try:
                system_instruction = (
                    "You are an expert B2B research specialist. A web search returned an article or listicle "
                    "(e.g., 'Top Fintech Startups in Ethiopia'). "
                    "Your job is to extract the ACTUAL INDIVIDUAL OPERATING COMPANIES or STARTUPS mentioned inside the text. "
                    "CRITICAL RULES: "
                    "1. NEVER return the article title, publisher (e.g. FasterCapital), or author as a company. "
                    "2. Return a JSON array of up to 5 real commercial businesses mentioned in the content: "
                    "[{\"company_name\": \"...\", \"website\": \"domain.com or null\", \"description\": \"...\"}]. "
                    "3. Each entry MUST be a distinct operating enterprise in the target industry/location."
                )
                prompt = (
                    f"{system_instruction}\n\n"
                    f"Article Title: {title}\n"
                    f"Target Industry: {industry or 'Business'}\n"
                    f"Target Location: {location or 'Region'}\n"
                    f"Article Content/Snippet:\n{content[:2000]}\n\n"
                    f"Return strictly valid JSON array only."
                )
                from google.genai import types
                response = self.generate_content_with_fallback(
                    contents=prompt,
                    config=types.GenerateContentConfig(response_mime_type="application/json", temperature=0.1)
                )
                raw = response.text.strip()
                parsed = json.loads(raw)
                if isinstance(parsed, list):
                    valid_companies = []
                    for item in parsed:
                        c_name = item.get("company_name", "").strip()
                        if self._is_valid_company_name(c_name):
                            valid_companies.append({
                                "company_name": c_name,
                                "website": item.get("website"),
                                "description": item.get("description", f"{c_name} operating in {location or 'target region'}")
                            })
                    if valid_companies:
                        return valid_companies
            except Exception as e:
                logger.warning(f"Gemini company extraction from article error: {e}. Using deterministic parsing.")

        return self._deterministic_extract_companies_from_text(title, content, industry, location)

    def _deterministic_extract_companies_from_text(
        self,
        title: str,
        content: str,
        industry: Optional[str] = None,
        location: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Fallback deterministic extractor for companies mentioned in articles."""
        extracted: List[Dict[str, Any]] = []
        combined = f"{title}\n{content}"

        # 1. Check for prominent Ethiopian fintechs if query matches
        ind_loc = f"{industry or ''} {location or ''} {title} {content}".lower()
        if "fintech" in ind_loc or ("ethiopia" in ind_loc and ("payment" in ind_loc or "finance" in ind_loc or "startup" in ind_loc)):
            known_ethiopian_fintechs = [
                ("Chapa", "chapa.co", "Payment gateway and financial technology provider in Ethiopia"),
                ("ArifPay", "arifpay.net", "Licensed mobile POS and digital payment service in Ethiopia"),
                ("SantimPay", "santimpay.com", "Digital payment gateway and mobile wallet solution in Ethiopia"),
                ("Kifiya", "kifiya.com", "Digital finance and technology solutions provider in Ethiopia"),
                ("EagleLion", "eaglelionsystems.com", "Financial technology and banking software developer in Ethiopia")
            ]
            for name, web, desc in known_ethiopian_fintechs:
                if name.lower() in combined.lower() and not any(e["company_name"].lower() == name.lower() for e in extracted):
                    extracted.append({
                        "company_name": name,
                        "website": web,
                        "description": desc
                    })

        # 2. Look for numbered listicle items: "1. CompanyName", "1) CompanyName", "• CompanyName"
        item_matches = re.findall(r"(?:^|\n|\.\s+)(?:\d+[\.\)]|[-•*])\s*([A-Z][a-zA-Z0-9\s&'-]{2,28}?)(?:\s*[-–:]|\s+is\s+|\s+provides\s+|\s+offers\s+|\s*\n)", combined)
        for m in item_matches:
            c_name = m.strip()
            if self._is_valid_company_name(c_name) and not any(e["company_name"].lower() == c_name.lower() for e in extracted):
                extracted.append({
                    "company_name": c_name,
                    "website": None,
                    "description": f"Identified {c_name} operating in {industry or 'target sector'} in {location or 'target region'}."
                })

        return extracted[:5]

    def analyze_lead_suitability(
        self,
        company_name: str,
        website: str,
        research_summary: str,
        target_criteria: str,
        target_industry: Optional[str] = None,
        target_location: Optional[str] = None,
        actual_location: Optional[str] = None,
        service_offered: Optional[str] = None,
        require_no_website: bool = False,
        website_status: Optional[str] = None,
        min_qualification_score: int = 60,
        requested_website_status: Optional[str] = "Any",
        decision_makers: Optional[List[str]] = None,
        company_size: Optional[str] = "Any"
    ) -> Dict[str, Any]:
        """
        Evaluates a prospective lead against target criteria with strict qualification gates:
        Gate 0: Entity Validation (Must be an individual commercial company, NOT an article or blog).
        Gate 1: Location match & Website constraint checks based on research evidence.
        Gate 2: Dynamic score threshold (>= min_qualification_score). Scores below are UNQUALIFIED.
        Gate 3: Company size treated as optional; decision-maker alignment rewarded.
        """
        # --- GATE 0: Entity Validation (Must be a real company, not a blog post or listicle title) ---
        if not self._is_valid_company_name(company_name):
            return {
                "fit_score": 0,
                "fit_reason": f"Disqualified: '{company_name}' is a blog post, article title, or media aggregator, not an individual operating commercial enterprise.",
                "fit_strengths": [],
                "fit_risks": ["Not an individual commercial company (article/blog/listicle headline)"],
                "status": "DISQUALIFIED",
                "qualification_status": "DISQUALIFIED",
                "is_qualified": False
            }

        # Gate 0B: Media aggregator domain rejection
        if self._is_media_aggregator_domain(website, company_name):
            return {
                "fit_score": 0,
                "fit_reason": f"Disqualified: Domain '{website}' is a media publication or directory platform, not the candidate's proprietary commercial website.",
                "fit_strengths": [],
                "fit_risks": ["Third-party media or directory domain"],
                "status": "DISQUALIFIED",
                "qualification_status": "DISQUALIFIED",
                "is_qualified": False
            }

        # --- GATE 1: Deterministic Geography Checks ---
        if target_location and actual_location:
            t_loc = target_location.lower()
            a_loc = actual_location.lower()
            # If target asks for a specific city/country (e.g. Ethiopia/Addis) and lead is elsewhere, reject immediately
            if ("ethiopia" in t_loc or "addis" in t_loc) and not ("ethiopia" in a_loc or "addis" in a_loc):
                return {
                    "fit_score": 0,
                    "fit_reason": f"Geographical mismatch: Prospect is located in {actual_location}, but requested geography is {target_location}.",
                    "fit_strengths": [],
                    "fit_risks": [f"Located in {actual_location} instead of {target_location}"],
                    "status": "REJECTED_MISMATCH",
                    "qualification_status": "REJECTED_MISMATCH",
                    "is_qualified": False
                }

        # --- GATE 1B: Website Status Evidence Validation ---
        w_req = (requested_website_status or "Any").lower()
        if require_no_website or w_req in ("missing", "no_official_website"):
            if website_status == "HAS_OFFICIAL_WEBSITE":
                return {
                    "fit_score": 15,
                    "fit_reason": f"Disqualified: Prospect already possesses an active official website ({website}). Not suitable for website creation outreach.",
                    "fit_strengths": [],
                    "fit_risks": ["Already has verified official website contrary to 'Missing' filter"],
                    "status": "UNQUALIFIED",
                    "qualification_status": "UNQUALIFIED",
                    "is_qualified": False
                }
            elif website_status == "OUTDATED_WEBSITE":
                return {
                    "fit_score": 30,
                    "fit_reason": f"Caveat: Prospect has an existing official website ({website}) that appears outdated, rather than missing entirely.",
                    "fit_strengths": ["Has website needing redesign"],
                    "fit_risks": ["Not completely missing an official website"],
                    "status": "UNQUALIFIED",
                    "qualification_status": "UNQUALIFIED",
                    "is_qualified": False
                }
            elif website_status == "NO_OFFICIAL_WEBSITE_FOUND":
                score = 88
                is_qual = score >= min_qualification_score
                return {
                    "fit_score": score,
                    "fit_reason": (
                        f"High Fit: Business is active in {actual_location or target_location} with confirmed directory presence, "
                        f"and research evidence confirms no dedicated official website exists. Prime candidate for {service_offered or 'website development'}."
                    ),
                    "fit_strengths": [
                        "Confirmed missing official website from live search evidence",
                        "Active business with verified directory presence",
                        f"Direct need for {service_offered or 'website development'}"
                    ],
                    "fit_risks": ["Contact details may require phone or directory verification"],
                    "status": "QUALIFIED" if is_qual else "UNQUALIFIED",
                    "qualification_status": "QUALIFIED" if is_qual else "UNQUALIFIED",
                    "is_qualified": is_qual
                }
            elif website_status == "WEBSITE_STATUS_UNCERTAIN":
                score = 62
                is_qual = score >= min_qualification_score
                return {
                    "fit_score": score,
                    "fit_reason": f"Moderate Fit: Operating in target geography ({target_location}), but official website status could not be verified with 100% certainty.",
                    "fit_strengths": [f"Operating in {target_location}"],
                    "fit_risks": ["Website status could not be verified with certainty"],
                    "status": "QUALIFIED" if is_qual else "UNQUALIFIED",
                    "qualification_status": "QUALIFIED" if is_qual else "UNQUALIFIED",
                    "is_qualified": is_qual
                }

        elif w_req == "outdated":
            if website_status == "OUTDATED_WEBSITE":
                score = 88
                is_qual = score >= min_qualification_score
                return {
                    "fit_score": score,
                    "fit_reason": f"High Fit: Official website exists ({website}) and research evidence confirms outdated design or legacy copyright.",
                    "fit_strengths": [
                        "Verified outdated official website",
                        f"Direct need for modern redesign / {service_offered or 'website modernization'}"
                    ],
                    "fit_risks": [],
                    "status": "QUALIFIED" if is_qual else "UNQUALIFIED",
                    "qualification_status": "QUALIFIED" if is_qual else "UNQUALIFIED",
                    "is_qualified": is_qual
                }
            elif website_status == "HAS_OFFICIAL_WEBSITE":
                return {
                    "fit_score": 25,
                    "fit_reason": f"Disqualified: Prospect already possesses a modern, active official website ({website}).",
                    "fit_strengths": [],
                    "fit_risks": ["Already has modern active official website contrary to 'Outdated' filter"],
                    "status": "UNQUALIFIED",
                    "qualification_status": "UNQUALIFIED",
                    "is_qualified": False
                }
            elif website_status == "NO_OFFICIAL_WEBSITE_FOUND":
                return {
                    "fit_score": 25,
                    "fit_reason": f"Disqualified: Business completely lacks an official website, but search requested prospects with an outdated website.",
                    "fit_strengths": [],
                    "fit_risks": ["No website found to modernize"],
                    "status": "UNQUALIFIED",
                    "qualification_status": "UNQUALIFIED",
                    "is_qualified": False
                }

        elif w_req in ("missing or outdated", "missing_or_outdated"):
            if website_status in ("NO_OFFICIAL_WEBSITE_FOUND", "OUTDATED_WEBSITE"):
                score = 88
                is_qual = score >= min_qualification_score
                status_desc = "confirmed missing official website" if website_status == "NO_OFFICIAL_WEBSITE_FOUND" else "verified outdated website"
                return {
                    "fit_score": score,
                    "fit_reason": f"High Fit: Prospect has {status_desc} in {actual_location or target_location}, perfectly matching {service_offered or 'website development'}.",
                    "fit_strengths": [
                        f"{status_desc.capitalize()}",
                        f"Immediate need for {service_offered or 'website development'}"
                    ],
                    "fit_risks": [],
                    "status": "QUALIFIED" if is_qual else "UNQUALIFIED",
                    "qualification_status": "QUALIFIED" if is_qual else "UNQUALIFIED",
                    "is_qualified": is_qual
                }
            elif website_status == "HAS_OFFICIAL_WEBSITE":
                return {
                    "fit_score": 20,
                    "fit_reason": f"Disqualified: Prospect possesses an active modern official website ({website}).",
                    "fit_strengths": [],
                    "fit_risks": ["Already has active modern official website"],
                    "status": "UNQUALIFIED",
                    "qualification_status": "UNQUALIFIED",
                    "is_qualified": False
                }
            elif website_status == "WEBSITE_STATUS_UNCERTAIN":
                score = 62
                is_qual = score >= min_qualification_score
                return {
                    "fit_score": score,
                    "fit_reason": f"Moderate Fit: Business located in {target_location}, but official website status could not be verified with certainty.",
                    "fit_strengths": [f"Operating in {target_location}"],
                    "fit_risks": ["Official website status could not be verified with certainty"],
                    "status": "QUALIFIED" if is_qual else "UNQUALIFIED",
                    "qualification_status": "QUALIFIED" if is_qual else "UNQUALIFIED",
                    "is_qualified": is_qual
                }

        # --- GATE 2: Gemini AI Evaluation ---
        if self.is_configured():
            dm_str = f"Target Decision-Makers: {', '.join(decision_makers)}" if decision_makers else ""
            prompt = f"""
You are a strict, evidence-based B2B Sales Operations Specialist qualifying potential business prospects.

[TARGET CRITERIA]
Target Industry/Business: {target_industry or 'General'}
Target Location: {target_location or 'Any'}
Service Being Offered: {service_offered or 'B2B Solutions'}
Minimum Qualification Score Threshold: {min_qualification_score}
{dm_str}
Detailed Criteria: {target_criteria}

[PROSPECT EVIDENCE]
Company Name: {company_name}
Location: {actual_location or target_location}
Website / Link: {website}
Extracted Research / Landing Page Intel:
{research_summary[:2500]}

[TASK & QUALIFICATION RULES]
1. The prospect MUST be a real individual operating commercial company. If Company Name ('{company_name}') or Landing Page Intel indicates it is a blog article, listicle (e.g., 'Top Fintech Startups in Ethiopia', '10 Best Hotels...'), media outlet, or directory rather than an actual company, assign fit_score: 0 and status: 'UNQUALIFIED'.
2. Evaluate whether this company genuinely matches the target industry, geography, and service need.
3. A poor match MUST receive a low score (< 50) and status "UNQUALIFIED".
4. A score of {min_qualification_score} or above requires concrete evidence from the prospect's profile supporting customer fit.
5. Output MUST be valid JSON strictly matching:
{{
  "fit_score": <integer 0 to 100>,
  "fit_reason": "<2-3 sentence explanation based strictly on provided facts>",
  "fit_strengths": ["<factual strength 1>", "<factual strength 2>"],
  "fit_risks": ["<risk or blocker 1>"],
  "status": "<'QUALIFIED' if fit_score >= {min_qualification_score} else 'UNQUALIFIED'>"
}}
Do not include markdown backticks or extra text outside the JSON.
"""
            try:
                response = self.generate_content_with_fallback(
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.2,
                    )
                )
                raw_text = response.text.strip()
                if raw_text.startswith("```"):
                    lines = raw_text.splitlines()
                    if lines[0].startswith("```"):
                        lines = lines[1:]
                    if lines and lines[-1].startswith("```"):
                        lines = lines[:-1]
                    raw_text = "\n".join(lines).strip()

                data = json.loads(raw_text)
                fit_score = int(data.get("fit_score", 40))
                is_qual = fit_score >= min_qualification_score
                status = "QUALIFIED" if is_qual else "UNQUALIFIED"
                return {
                    "fit_score": fit_score,
                    "fit_reason": data.get("fit_reason", "Evaluation completed."),
                    "fit_strengths": data.get("fit_strengths", []),
                    "fit_risks": data.get("fit_risks", []),
                    "status": status,
                    "qualification_status": status,
                    "is_qualified": is_qual
                }
            except Exception as e:
                err_msg = "Rate limit / quota reached" if ("429" in str(e) or "RESOURCE_EXHAUSTED" in str(e)) else str(e)[:120]
                logger.info(f"Gemini qualification unavailable ({err_msg}). Using deterministic evaluation.")

        # Deterministic Rule-Based Fallback (never fabricates generic fake 78 score)
        return self._deterministic_lead_analysis(
            company_name=company_name,
            target_industry=target_industry,
            target_location=target_location,
            actual_location=actual_location,
            service_offered=service_offered,
            research_summary=research_summary,
            min_qualification_score=min_qualification_score,
            decision_makers=decision_makers
        )

    def _deterministic_lead_analysis(
        self,
        company_name: str,
        target_industry: Optional[str],
        target_location: Optional[str],
        actual_location: Optional[str],
        service_offered: Optional[str],
        research_summary: str,
        min_qualification_score: int = 60,
        decision_makers: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Strict deterministic fallback when AI API is unavailable."""
        summary_lower = research_summary.lower()
        score = 50
        strengths = []
        risks = []

        ind_matched = False
        if target_industry:
            t_ind = target_industry.lower()
            ind_matched = t_ind in summary_lower or any(p in summary_lower for p in ["saas", "software", "tech", "hotel", "resort", "fintech", "health", "agency", "restaurant", "hospitality"] if p in t_ind)

        if ind_matched:
            strengths.append(f"Profile confirms operations in {target_industry}")
            score += 25
        elif target_industry:
            score -= 30
            risks.append(f"Industry mismatch: does not appear to operate in {target_industry}")

        if actual_location and target_location and target_location.lower() in actual_location.lower():
            strengths.append(f"Confirmed operations in target geography ({target_location})")
            score += 15
        elif actual_location and target_location:
            score -= 40
            risks.append(f"Geographic mismatch: located in {actual_location} instead of {target_location}")

        if decision_makers:
            for dm in decision_makers:
                if dm.lower() in summary_lower:
                    strengths.append(f"Identified leadership reference to {dm}")
                    score += 5
                    break

        score = max(0, min(100, score))
        is_qual = score >= min_qualification_score
        status = "QUALIFIED" if is_qual else "UNQUALIFIED"
        return {
            "fit_score": score,
            "fit_reason": f"Evaluated {company_name} in {actual_location or target_location} for {service_offered or 'B2B outreach'}.",
            "fit_strengths": strengths,
            "fit_risks": risks,
            "status": status,
            "qualification_status": status,
            "is_qualified": is_qual
        }

    def generate_outreach_email(
        self,
        company_name: str,
        website: str,
        research_summary: str,
        target_criteria: str,
        service_offered: Optional[str] = None,
        contact_name: Optional[str] = None,
        contact_role: Optional[str] = None,
        custom_instructions: Optional[str] = None,
        website_status: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Generates a personalized, concise B2B outreach email draft grounded strictly in real evidence.
        Avoids invented stats, fake familiarity, or assumed meeting times.
        """
        recipient_line = f"{contact_name} ({contact_role})" if contact_name and contact_role else (contact_name or "Manager / Owner")
        instructions = f"Additional instructions: {custom_instructions}" if custom_instructions else ""

        # Context-specific guidance
        if website_status == "NO_OFFICIAL_WEBSITE_FOUND":
            offer_context = (
                f"The prospect is {company_name}, an active business with directory listings but no official dedicated website. "
                f"We are reaching out to offer professional website development to enable direct customer inquiries, bookings, and brand credibility."
            )
        else:
            offer_context = f"We are reaching out to discuss {service_offered or 'workflow automation and operations'}."

        if self.is_configured():
            prompt = f"""
You are an ethical, consultative B2B copywriter drafting an introduction email.

[CONTEXT & OFFER]
{offer_context}
Criteria / Value Prop: {target_criteria}

[PROSPECT EVIDENCE]
Company: {company_name} ({website})
Recipient: {recipient_line}
Research Evidence:
{research_summary[:2000]}
{instructions}

[STRICT GUIDELINES]
- Under 130 words. Professional, respectful, and concise.
- Reference ONLY verified details from the research.
- DO NOT invent statistics (e.g. do NOT claim 'save 15 hours' or '10 hours a week').
- DO NOT claim fake familiarity (e.g. do NOT say 'I have been following your growth for a long time').
- DO NOT assume specific meeting availability (e.g. do NOT say 'Let's chat this Thursday at 2pm').
- Include a low-pressure consultative call to action (e.g. asking if they would be open to a brief conversation).
- Return strictly a valid JSON object matching:
{{
  "subject": "<Concise, relevant subject line>",
  "body": "<Email body in clean text with greeting and sign-off placeholder>"
}}
No markdown backticks or extra text outside JSON.
"""
            try:
                response = self.generate_content_with_fallback(
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.3,
                    )
                )
                raw_text = response.text.strip()
                if raw_text.startswith("```"):
                    lines = raw_text.splitlines()
                    if lines[0].startswith("```"):
                        lines = lines[1:]
                    if lines and lines[-1].startswith("```"):
                        lines = lines[:-1]
                    raw_text = "\n".join(lines).strip()

                data = json.loads(raw_text)
                return {
                    "subject": data.get("subject", f"Inquiry regarding {company_name}"),
                    "body": data.get("body", f"Hello {contact_name or 'there'},\n\nI am contacting you regarding {company_name}...")
                }
            except Exception as e:
                err_msg = "Rate limit / quota reached" if ("429" in str(e) or "RESOURCE_EXHAUSTED" in str(e)) else str(e)[:120]
                logger.info(f"Gemini email draft generation unavailable ({err_msg}). Using deterministic template.")

        # Deterministic Grounded Draft Fallback (no invented statistics)
        return self._deterministic_outreach_email(
            company_name=company_name,
            service_offered=service_offered,
            contact_name=contact_name,
            contact_role=contact_role,
            website_status=website_status
        )

    def _deterministic_outreach_email(
        self,
        company_name: str,
        service_offered: Optional[str],
        contact_name: Optional[str],
        contact_role: Optional[str],
        website_status: Optional[str]
    ) -> Dict[str, str]:
        """Provides an honest, professional template grounded in verified business context."""
        recipient = contact_name or "Team"
        role_mention = f" ({contact_role})" if contact_role else ""

        if website_status == "NO_OFFICIAL_WEBSITE_FOUND":
            subject = f"Website and direct booking inquiries for {company_name}"
            body = f"""Dear {recipient}{role_mention},

I came across {company_name}'s business listing while researching hospitality and travel accommodations in your area.

I noticed that while {company_name} has a presence on third-party directories, you do not appear to have a dedicated official website for direct bookings and customer inquiries.

We help independent hotels and businesses establish custom, mobile-friendly websites that allow guests to view rooms, book directly, and avoid third-party platform commissions.

Would you be open to a brief introductory conversation to see if having a dedicated website would benefit {company_name}?

Sincerely,
Outreach Operations Team"""
        else:
            service = service_offered or "AI automation and workflow solutions"
            subject = f"{service} for {company_name}"
            body = f"""Hello {recipient}{role_mention},

I am reaching out regarding {company_name}'s current operations. We provide {service} designed to help growing teams streamline operational workflows and reduce manual administrative overhead.

Given your focus on delivering quality service, I wanted to see if exploring automated workflow integration would align with your team's priorities this quarter.

If you are open to a brief introductory conversation, please let me know what day works best for you.

Best regards,
Outreach Operations Team"""

        return {
            "subject": subject,
            "body": body
        }


gemini_service = GeminiService()
