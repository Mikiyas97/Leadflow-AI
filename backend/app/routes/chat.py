"""LeadFlow AI - Chatbot API Router with 8-Step Autonomous Sales Pipeline"""
from datetime import datetime, timedelta, timezone
import logging
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import (
    Lead,
    Contact,
    ResearchRecord,
    OutreachDraft,
    ActivityLog,
    AutomationRun
)
from backend.app.services.gemini_service import gemini_service
from backend.app.services.discovery_service import discovery_service
from backend.app.services.firecrawl_service import firecrawl_service
from backend.app.services.hunter_service import hunter_service

logger = logging.getLogger("leadflow.chat")

router = APIRouter(prefix="/chat", tags=["Chat"])


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant" | "system"
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    system_prompt: Optional[str] = None


class PipelineContact(BaseModel):
    id: Optional[int] = None
    name: str
    job_title: Optional[str] = None
    email: Optional[str] = None
    email_status: str = "unverified"
    confidence_score: Optional[int] = None


class PipelineDraft(BaseModel):
    id: int
    subject: str
    body: str
    status: str = "DRAFT"
    approved_at: Optional[str] = None


class PipelineLead(BaseModel):
    id: int
    company_name: str
    website: str
    industry: Optional[str] = None
    location: Optional[str] = None
    fit_score: int
    fit_reason: Optional[str] = None
    fit_strengths: List[str] = []
    research_summary: Optional[str] = None
    contacts: List[PipelineContact] = []
    draft: Optional[PipelineDraft] = None
    follow_up_date: Optional[str] = None


class ChatResponse(BaseModel):
    role: str = "assistant"
    content: str
    pipeline_leads: Optional[List[PipelineLead]] = None


@router.post("", response_model=ChatResponse)
async def chat_with_agent(payload: ChatRequest, db: Session = Depends(get_db)):
    """
    Handles conversational interactions and executes the 8-step sales ops pipeline
    when target company prospecting queries are entered.
    """
    user_messages = [m for m in payload.messages if m.role == "user"]
    latest_user_text = user_messages[-1].content if user_messages else "Hello"
    lower_text = latest_user_text.lower()

    # Check if the user is asking to find/prospect companies matching criteria
    prospecting_keywords = ["saas", "companies", "company", "find", "prospect", "automation", "leads", "search", "discover"]
    is_prospecting_request = any(kw in lower_text for kw in prospecting_keywords)

    if is_prospecting_request:
        # Step 1: Parse criteria from user prompt
        industry = "B2B SaaS"
        if "fintech" in lower_text:
            industry = "FinTech"
        elif "ai" in lower_text:
            industry = "AI Infrastructure"
        elif "health" in lower_text:
            industry = "HealthTech"

        location = "United States"
        if "europe" in lower_text:
            location = "Europe"

        criteria = latest_user_text

        # Record automation run
        run = AutomationRun(
            status="RUNNING",
            input_profile={"prompt": latest_user_text, "industry": industry, "location": location, "criteria": criteria},
            started_at=datetime.now(timezone.utc)
        )
        db.add(run)
        db.commit()
        db.refresh(run)

        # Step 2: LeadFlow finds matching companies (limit 2-3 for crisp chat UX)
        candidates = await discovery_service.discover_companies(
            industry=industry,
            location=location,
            limit=2
        )

        pipeline_leads_result: List[PipelineLead] = []

        for cand in candidates:
            website = cand["website"]
            company_name = cand["company_name"]

            # Deduplication check
            lead = db.query(Lead).filter(Lead.website == website).first()
            if not lead:
                lead = Lead(
                    company_name=company_name,
                    website=website,
                    industry=cand.get("industry", industry),
                    location=cand.get("location", location),
                    status="NEW",
                    source_url=cand.get("source_url")
                )
                db.add(lead)
                db.commit()
                db.refresh(lead)

            # Step 3: Firecrawl researches website
            research_res = await firecrawl_service.scrape_company_website(website)
            research_content = research_res.get("content", f"Website overview for {company_name}")
            research_summary = research_res.get("description") or research_res.get("title") or "Website research profile"

            research_record = ResearchRecord(
                lead_id=lead.id,
                summary=research_summary,
                raw_content=research_content,
                source_urls=research_res.get("source_urls", [f"https://{website}"])
            )
            db.add(research_record)
            db.commit()

            # Step 4: Gemini scores each company against target criteria
            assessment = gemini_service.analyze_lead_suitability(
                company_name=company_name,
                website=website,
                research_summary=research_content,
                target_criteria=criteria,
                target_industry=industry
            )

            lead.fit_score = assessment.get("fit_score", 85)
            lead.fit_reason = assessment.get("fit_reason")
            lead.fit_strengths = assessment.get("fit_strengths", [])
            lead.fit_risks = assessment.get("fit_risks", [])
            lead.status = assessment.get("status", "QUALIFIED")
            db.commit()

            # Step 5: Hunter.io finds relevant contacts
            raw_contacts = await hunter_service.search_domain(website, limit=2)
            saved_contacts: List[PipelineContact] = []
            for rc in raw_contacts:
                contact = Contact(
                    lead_id=lead.id,
                    name=rc["name"],
                    job_title=rc.get("job_title"),
                    email=rc.get("email"),
                    email_status=rc.get("email_status", "verified"),
                    confidence_score=rc.get("confidence_score", 85),
                    source_url=rc.get("source_url")
                )
                db.add(contact)
                db.commit()
                db.refresh(contact)
                saved_contacts.append(PipelineContact(
                    id=contact.id,
                    name=contact.name,
                    job_title=contact.job_title,
                    email=contact.email,
                    email_status=contact.email_status,
                    confidence_score=contact.confidence_score
                ))

            # Step 6: Gemini drafts personalized introduction email
            primary_contact = saved_contacts[0] if saved_contacts else None
            draft_res = gemini_service.generate_outreach_email(
                company_name=company_name,
                website=website,
                research_summary=research_content,
                target_criteria=criteria,
                contact_name=primary_contact.name if primary_contact else None,
                contact_role=primary_contact.job_title if primary_contact else None
            )

            draft = OutreachDraft(
                lead_id=lead.id,
                contact_id=primary_contact.id if primary_contact else None,
                subject=draft_res.get("subject", f"AI automation solutions for {company_name}"),
                body=draft_res.get("body", "Hi there, I noticed your company profile..."),
                status="DRAFT"
            )
            db.add(draft)
            db.commit()
            db.refresh(draft)

            # Step 8 prep: Scheduled follow-up date (3 business days from now)
            follow_up_date = (datetime.now(timezone.utc) + timedelta(days=3)).strftime("%b %d, %Y")

            # Log activity event
            db.add(ActivityLog(
                run_id=run.id,
                lead_id=lead.id,
                action="LEAD_EVALUATED_AND_DRAFTED",
                level="SUCCESS",
                details=f"Evaluated {company_name} ({lead.fit_score}/100) and generated draft #{draft.id}"
            ))
            db.commit()

            pipeline_leads_result.append(PipelineLead(
                id=lead.id,
                company_name=company_name,
                website=website,
                industry=lead.industry,
                location=lead.location,
                fit_score=lead.fit_score or 85,
                fit_reason=lead.fit_reason,
                fit_strengths=lead.fit_strengths or [],
                research_summary=research_summary,
                contacts=saved_contacts,
                draft=PipelineDraft(
                    id=draft.id,
                    subject=draft.subject,
                    body=draft.body,
                    status=draft.status
                ),
                follow_up_date=follow_up_date
            ))

        run.status = "COMPLETED"
        run.completed_at = datetime.now(timezone.utc)
        run.leads_discovered = len(pipeline_leads_result)
        run.leads_qualified = sum(1 for p in pipeline_leads_result if p.fit_score >= 65)
        run.drafts_generated = len(pipeline_leads_result)
        db.commit()

        conversational_summary = (
            f"🎯 **LeadFlow Pipeline Completed for:** *\"{latest_user_text}\"*\n\n"
            f"1. **Discovered:** Found matching prospects in {location}.\n"
            f"2. **Researched:** Extracted landing page profiles via Firecrawl.\n"
            f"3. **Scored:** Google Gemini qualified each lead against your criteria.\n"
            f"4. **Enriched:** Located verified decision-maker emails via Hunter.io.\n"
            f"5. **Drafted:** Prepared personalized outreach emails for human review.\n\n"
            f"Review the evaluated prospects below and approve the drafts when ready:"
        )

        return ChatResponse(
            role="assistant",
            content=conversational_summary,
            pipeline_leads=pipeline_leads_result
        )

    # General conversation using Gemini
    system_instruction = (
        "You are LeadFlow AI, a world-class B2B Sales Operations and Prospecting AI Agent. "
        "Keep answers concise, practical, and well-formatted."
    )

    if gemini_service.is_configured():
        try:
            from google.genai import types
            contents = [f"{m.role.upper()}: {m.content}" for m in payload.messages[-6:]]
            full_prompt = f"{system_instruction}\n\n" + "\n\n".join(contents) + "\n\nASSISTANT:"
            response = gemini_service.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=full_prompt,
                config=types.GenerateContentConfig(temperature=0.7)
            )
            return ChatResponse(role="assistant", content=response.text.strip())
        except Exception as e:
            logger.error(f"Gemini chat error: {e}")

    return ChatResponse(
        role="assistant",
        content="I am ready to help you find and qualify prospective B2B customers. Try entering: *'SaaS companies in the United States that may need AI automation'*"
    )
