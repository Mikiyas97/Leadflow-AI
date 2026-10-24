"""LeadFlow AI - Gemini API Service for Lead Qualification and Outreach Drafting"""
import json
import logging
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
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.warning(f"Failed to initialize Gemini Client: {e}")

    def is_configured(self) -> bool:
        return bool(self.api_key and self.client)

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
                response = self.client.models.generate_content(
                    model="gemini-2.5-flash",
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
        website_status: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Evaluates a prospective lead against target criteria with strict qualification gates:
        Gate 1: Location & Industry match.
        Gate 2: Minimum score threshold (>= 65/100). Low scores (< 65) are flagged UNQUALIFIED.
        Gate 3: Website constraint check (if user requires no official website).
        """
        # --- GATE 1: Deterministic Geography & Constraint Checks ---
        if target_location and actual_location:
            t_loc = target_location.lower()
            a_loc = actual_location.lower()
            # If target asks for Ethiopia/Addis Ababa and lead is in US, reject immediately
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

        # If user explicitly requested businesses without an official website
        if require_no_website:
            if website_status == "HAS_OFFICIAL_WEBSITE":
                return {
                    "fit_score": 15,
                    "fit_reason": f"Disqualified: Prospect already possesses an active official website ({website}). Not suitable for website development cold outreach.",
                    "fit_strengths": [],
                    "fit_risks": ["Already has dedicated official website domain"],
                    "status": "UNQUALIFIED",
                    "qualification_status": "UNQUALIFIED",
                    "is_qualified": False
                }
            elif website_status == "NO_OFFICIAL_WEBSITE_FOUND":
                return {
                    "fit_score": 88,
                    "fit_reason": (
                        f"High Fit: Business is active in {actual_location or target_location} with online directory listings, "
                        f"but has no official, dedicated website. Prime candidate for {service_offered or 'website development'}."
                    ),
                    "fit_strengths": [
                        "Active business with verified directory presence",
                        "No existing official website identified",
                        f"Direct need for {service_offered or 'website development'}"
                    ],
                    "fit_risks": ["Contact details may require manual phone/directory verification"],
                    "status": "QUALIFIED",
                    "qualification_status": "QUALIFIED",
                    "is_qualified": True
                }
            elif website_status == "WEBSITE_STATUS_UNCERTAIN":
                return {
                    "fit_score": 68,
                    "fit_reason": f"Potential Fit: Official website status is currently uncertain. Business is verified in {target_location}, but requires human confirmation before dispatch.",
                    "fit_strengths": [f"Operating in target geography ({target_location})"],
                    "fit_risks": ["Website presence could not be verified with 100% certainty"],
                    "status": "QUALIFIED",
                    "qualification_status": "QUALIFIED",
                    "is_qualified": True
                }

        # --- GATE 2: Gemini AI Evaluation ---
        if self.is_configured():
            prompt = f"""
You are a strict, evidence-based B2B Sales Operations Specialist qualifying potential business prospects.

[TARGET CRITERIA]
Target Industry: {target_industry or 'General'}
Target Location: {target_location or 'Any'}
Service Being Offered: {service_offered or 'B2B Solutions'}
Detailed Criteria: {target_criteria}

[PROSPECT EVIDENCE]
Company Name: {company_name}
Location: {actual_location or target_location}
Website / Link: {website}
Extracted Research / Landing Page Intel:
{research_summary[:2500]}

[TASK & QUALIFICATION RULES]
1. Evaluate whether this company genuinely matches the target industry, geography, and service need.
2. A poor match (such as an established leader with no need, or an irrelevant business) MUST receive a low score (< 50) and status "UNQUALIFIED".
3. A score of 65 or above requires concrete evidence from the prospect's profile supporting customer fit.
4. Output MUST be valid JSON strictly matching:
{{
  "fit_score": <integer 0 to 100>,
  "fit_reason": "<2-3 sentence explanation based strictly on provided facts>",
  "fit_strengths": ["<factual strength 1>", "<factual strength 2>"],
  "fit_risks": ["<risk or blocker 1>"],
  "status": "<'QUALIFIED' if fit_score >= 65 else 'UNQUALIFIED'>"
}}
Do not include markdown backticks or extra text outside the JSON.
"""
            try:
                response = self.client.models.generate_content(
                    model='gemini-2.5-flash',
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
                is_qual = fit_score >= 65
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
                logger.error(f"Gemini API error during qualification: {e}. Using deterministic evaluation.")

        # Deterministic Rule-Based Fallback (never fabricates generic fake 78 score)
        return self._deterministic_lead_analysis(
            company_name=company_name,
            target_industry=target_industry,
            target_location=target_location,
            actual_location=actual_location,
            service_offered=service_offered,
            research_summary=research_summary
        )

    def _deterministic_lead_analysis(
        self,
        company_name: str,
        target_industry: Optional[str],
        target_location: Optional[str],
        actual_location: Optional[str],
        service_offered: Optional[str],
        research_summary: str
    ) -> Dict[str, Any]:
        """Strict deterministic fallback when AI API is unavailable."""
        summary_lower = research_summary.lower()
        score = 50
        strengths = []
        risks = []

        ind_matched = False
        if target_industry:
            t_ind = target_industry.lower()
            ind_matched = t_ind in summary_lower or any(p in summary_lower for p in ["saas", "software", "tech", "hotel", "fintech", "health", "agency"] if p in t_ind)

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

        score = max(0, min(100, score))
        is_qual = score >= 65
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
                response = self.client.models.generate_content(
                    model='gemini-2.5-flash',
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
                logger.error(f"Gemini API error during email draft generation: {e}")

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
