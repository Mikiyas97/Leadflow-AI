"""LeadFlow AI - Chatbot API Router with General-Purpose 8-Step Pipeline & Strict Qualification Gates"""
from datetime import datetime, timedelta, timezone
import logging
from typing import List, Optional, Dict, Any
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
from backend.app.services.pipeline_logger import pipeline_logger

from backend.app.schemas import (
    PipelineContact,
    PipelineDraft,
    PipelineLead,
    LeadSearchRequest
)

logger = logging.getLogger("leadflow.chat")

router = APIRouter(prefix="/chat", tags=["Chat"])


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant" | "system"
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    system_prompt: Optional[str] = None
    criteria: Optional[LeadSearchRequest] = None


class ParsedCriteria(BaseModel):
    industry: str
    location: str
    target_quantity: int
    service_offered: str
    require_no_website: bool



class ChatResponse(BaseModel):
    role: str = "assistant"
    content: str
    parsed_criteria: Optional[ParsedCriteria] = None
    pipeline_leads: Optional[List[PipelineLead]] = None
    qualified_count: int = 0
    total_candidates: int = 0


def format_lead_pipeline_obj(lead: Lead) -> PipelineLead:
    """Helper to convert a DB Lead into a full PipelineLead object."""
    saved_contacts: List[PipelineContact] = []
    for c in (lead.contacts or []):
        saved_contacts.append(PipelineContact(
            id=c.id,
            name=c.name,
            job_title=c.job_title,
            email=c.email,
            email_status=c.email_status,
            confidence_score=c.confidence_score
        ))

    draft_obj = None
    if lead.drafts:
        d = lead.drafts[-1]
        draft_obj = PipelineDraft(
            id=d.id,
            subject=d.subject,
            body=d.body,
            status=d.status,
            approved_at=d.approved_at.isoformat() if d.approved_at else None,
            sent_at=d.sent_at.isoformat() if d.sent_at else None,
            send_error=d.send_error
        )

    research_text = None
    if lead.research_records:
        research_text = lead.research_records[-1].summary or lead.research_records[-1].raw_content[:200]

    follow_up_str = lead.follow_up_date.strftime("%b %d, %Y") if lead.follow_up_date else None

    # Determine qualification status
    q_status = "QUALIFIED"
    if lead.fit_score is not None and lead.fit_score < 65:
        q_status = "UNQUALIFIED"
    if lead.status in ("UNQUALIFIED", "REJECTED_MISMATCH"):
        q_status = lead.status

    return PipelineLead(
        id=lead.id,
        company_name=lead.company_name,
        website=lead.website,
        industry=lead.industry,
        location=lead.location,
        company_size=lead.company_size,
        website_status=lead.website_status or "HAS_OFFICIAL_WEBSITE",
        fit_score=lead.fit_score or 0,
        fit_reason=lead.fit_reason,
        fit_strengths=lead.fit_strengths or [],
        fit_risks=lead.fit_risks or [],
        qualification_status=q_status,
        research_summary=research_text,
        contacts=saved_contacts,
        draft=draft_obj,
        follow_up_date=follow_up_str,
        follow_up_notes=lead.follow_up_notes,
        follow_up_status=lead.follow_up_status or "AWAITING_EMAIL_SEND"
    )


@router.post("", response_model=ChatResponse)
async def chat_with_agent(payload: ChatRequest, db: Session = Depends(get_db)):
    """
    Handles conversational interactions and executes the 8-step sales ops pipeline
    with strict qualification gating, live Firecrawl research, and location integrity.
    """
    user_messages = [m for m in payload.messages if m.role == "user"]
    latest_user_text = user_messages[-1].content if user_messages else "Hello"
    lower_text = latest_user_text.lower().strip()

    # -------------------------------------------------------------------------
    # Intent 1: Check if the user is asking to view the Activity Log / Audit Trail
    # -------------------------------------------------------------------------
    if any(k in lower_text for k in ["activity log", "audit trail", "view activity", "show activities", "what activities"]):
        logs = db.query(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(15).all()
        if not logs:
            return ChatResponse(
                role="assistant",
                content="📋 **Activity Log**: No pipeline activities recorded yet. Run a prospecting workflow to generate activity."
            )
        log_rows = []
        for l in logs:
            time_str = l.created_at.strftime("%H:%M:%S")
            level_emoji = "✅" if l.level == "SUCCESS" else ("⚠️" if l.level == "WARNING" else "ℹ️")
            log_rows.append(f"• `{time_str}` {level_emoji} **{l.action}**: {l.details}")

        summary = "📋 **LeadFlow Activity Log & Audit Trail (Recent 15 Events):**\n\n" + "\n".join(log_rows)
        return ChatResponse(role="assistant", content=summary)

    # -------------------------------------------------------------------------
    # Intent 2: Check if user wants to APPROVE drafts via chat command
    # -------------------------------------------------------------------------
    if "approve" in lower_text and ("draft" in lower_text or "outreach" in lower_text or "all" in lower_text or any(l.company_name.lower() in lower_text for l in db.query(Lead).all())):
        pending_drafts = db.query(OutreachDraft).filter(OutreachDraft.status == "DRAFT").all()
        if not pending_drafts:
            return ChatResponse(
                role="assistant",
                content="ℹ️ No pending outreach drafts require approval. All qualified leads are either approved, sent, or awaiting drafting."
            )

        approved_leads: List[Lead] = []
        for d in pending_drafts:
            lead = db.query(Lead).filter(Lead.id == d.lead_id).first()
            if not lead:
                continue
            if "all" in lower_text or lead.company_name.lower() in lower_text or str(d.id) in lower_text:
                d.status = "APPROVED"
                d.approved_at = datetime.utcnow()
                db.add(ActivityLog(
                    lead_id=lead.id,
                    action="DRAFT_APPROVED",
                    level="SUCCESS",
                    details=f"Approved draft #{d.id} for {lead.company_name} via chat command. Ready for Gmail SMTP send confirmation."
                ))
                approved_leads.append(lead)

        db.commit()

        if approved_leads:
            names = ", ".join([f"**{l.company_name}**" for l in approved_leads])
            content_resp = (
                f"✅ **Outreach Draft(s) Approved**\n\n"
                f"Approved drafts for {names}. Draft status updated to **APPROVED**.\n\n"
                f"⚠️ *Note: Follow-up is strictly scheduled ONLY after the email is confirmed sent via Gmail SMTP.* "
                f"Use the **'Send Email via Gmail SMTP'** action to dispatch."
            )
            pipeline_data = [format_lead_pipeline_obj(l) for l in approved_leads]
            return ChatResponse(role="assistant", content=content_resp, pipeline_leads=pipeline_data)

    # -------------------------------------------------------------------------
    # Intent 3: Prospecting & Lead Generation Request
    # -------------------------------------------------------------------------
    prospecting_keywords = [
        "saas", "companies", "company", "find", "prospect", "automation",
        "leads", "search", "discover", "hotels", "hotel", "businesses",
        "get", "source", "hospitality", "website"
    ]
    is_prospecting_request = payload.criteria is not None or any(kw in lower_text for kw in prospecting_keywords)

    if is_prospecting_request:
        if payload.criteria:
            crit = payload.criteria
            industry = ", ".join(crit.target_business) if crit.target_business else "Businesses"
            location = crit.location
            target_qty = crit.lead_quantity
            service_offered = crit.service_offered
            website_status_req = crit.website_status
            require_no_website = website_status_req in ("Missing", "Missing or Outdated")
            score_threshold = crit.min_qualification_score
            decision_makers = crit.decision_makers
            company_size = crit.company_size if crit.company_size != "Any" else None
            parsed_data = crit.dict()
        else:
            # Step 1: Parse criteria from user prompt with zero location loss
            parsed = discovery_service.parse_search_query(latest_user_text)
            industry = parsed["industry"] or "B2B Companies"
            location = parsed["location"] or "Unspecified Location"
            target_qty = parsed["target_quantity"]
            service_offered = parsed["service_offered"]
            require_no_website = parsed["require_no_website"]
            website_status_req = "Missing" if require_no_website else "Any"
            score_threshold = 60
            decision_makers = []
            company_size = parsed.get("company_size")
            parsed_data = parsed

        parsed_obj = ParsedCriteria(
            industry=industry,
            location=location,
            target_quantity=target_qty,
            service_offered=service_offered,
            require_no_website=require_no_website
        )

        # Record automation run
        run = AutomationRun(
            status="RUNNING",
            input_profile=parsed_data,
            started_at=datetime.now(timezone.utc)
        )
        db.add(run)
        db.commit()
        db.refresh(run)

        # Log pipeline initiation
        db.add(ActivityLog(
            run_id=run.id,
            action="PIPELINE_INITIATED",
            level="INFO",
            details=(
                f"Criteria Parsed: Target {industry} in {location} "
                f"(Quantity: {target_qty}, Service: {service_offered}, Score Threshold: {score_threshold}, Website Status: {website_status_req})"
            )
        ))
        db.commit()

        pipeline_logger.log_start(
            run_id=run.id,
            campaign_name="Chat Lead Prospecting",
            target_businesses=payload.criteria.target_business if payload.criteria else [industry],
            location=location,
            service_offered=service_offered,
            decision_makers=decision_makers or [],
            company_size=company_size,
            website_status=website_status_req,
            lead_quantity=target_qty,
            min_qualification_score=score_threshold
        )
        pipeline_logger.log_discovery_query(query=industry, location=location, status_filter=website_status_req)

        # Step 2: Discover matching companies in requested location
        existing_websites = [row[0] for row in db.query(Lead.website).all()]

        candidates = await discovery_service.discover_companies(
            industry=industry,
            location=location,
            service_offered=service_offered,
            require_no_website=require_no_website,
            website_status=website_status_req,
            company_size=company_size,
            target_businesses=payload.criteria.target_business if payload.criteria else None,
            limit=target_qty,
            exclude_websites=existing_websites
        )

        pipeline_logger.log_discovery_results(candidates)

        if not candidates:
            run.status = "COMPLETED"
            run.completed_at = datetime.now(timezone.utc)
            run.leads_discovered = 0
            run.leads_qualified = 0
            db.commit()

            db.add(ActivityLog(
                run_id=run.id,
                action="DISCOVERY_COMPLETED_ZERO",
                level="WARNING",
                details=f"No matching candidates found in {location} for {industry} via live search."
            ))
            db.commit()

            pipeline_logger.log_finish(
                run_id=run.id,
                total_evaluated=0,
                qualified_count=0,
                drafts_count=0,
                threshold=score_threshold
            )

            return ChatResponse(
                role="assistant",
                content=(
                    f"⚠️ **Completed — 0 qualified leads found**\n\n"
                    f"**Parsed Criteria:**\n"
                    f"• **Industry:** {industry}\n"
                    f"• **Location:** {location}\n"
                    f"• **Service Offered:** {service_offered}\n"
                    f"• **Constraint:** {'Must lack official website' if require_no_website else 'Standard'}\n\n"
                    f"No matching candidates could be verified in **{location}** via live web search. "
                    f"LeadFlow does not fabricate mock data. Try broadening your criteria or verifying regional directory listings."
                ),
                parsed_criteria=parsed_obj,
                pipeline_leads=[],
                qualified_count=0,
                total_candidates=0
            )

        pipeline_leads_result: List[PipelineLead] = []
        total_candidates = len(candidates)

        for idx, cand in enumerate(candidates, 1):
            company_name = cand["company_name"]
            website = cand["website"]
            cand_location = cand.get("location", location)
            website_status = cand.get("website_status", "HAS_OFFICIAL_WEBSITE")
            website_evidence = cand.get("website_evidence", "")

            # Deduplication check
            lead = db.query(Lead).filter(Lead.website == website).first()
            if not lead:
                lead = Lead(
                    company_name=company_name,
                    website=website,
                    industry=cand.get("industry", industry),
                    location=cand_location,
                    website_status=website_status,
                    status="NEW",
                    source_url=cand.get("source_url")
                )
                db.add(lead)
                db.commit()
                db.refresh(lead)

            # Log Step 2: Discovery
            db.add(ActivityLog(
                run_id=run.id,
                lead_id=lead.id,
                action="LEAD_DISCOVERED",
                level="INFO",
                details=f"Step 2: Located candidate '{company_name}' in {cand_location} (Website Status: {website_status})"
            ))
            db.commit()

            # Step 3: Firecrawl researches website or directory listing
            research_res = await firecrawl_service.scrape_company_website(website)
            research_content = research_res.get("content", f"Business listing overview for {company_name}")
            research_summary = (
                research_res.get("description")
                or research_res.get("title")
                or website_evidence
                or f"Listing for {company_name} in {cand_location}"
            )

            research_record = ResearchRecord(
                lead_id=lead.id,
                summary=research_summary,
                raw_content=research_content,
                source_urls=research_res.get("source_urls", [f"https://{website}"])
            )
            db.add(research_record)
            db.commit()

            pipeline_logger.log_website_verification(
                index=idx,
                total=total_candidates,
                company_name=company_name,
                website=website,
                website_status=website_status,
                evidence=website_evidence
            )

            # Step 4: Strict Qualification Gates
            assessment = gemini_service.analyze_lead_suitability(
                company_name=company_name,
                website=website,
                research_summary=research_content,
                target_criteria=latest_user_text,
                target_industry=industry,
                target_location=location,
                actual_location=cand_location,
                service_offered=service_offered,
                require_no_website=require_no_website,
                website_status=website_status,
                min_qualification_score=score_threshold,
                requested_website_status=website_status_req,
                decision_makers=decision_makers,
                company_size=company_size
            )

            lead.fit_score = assessment.get("fit_score", 0)
            lead.fit_reason = assessment.get("fit_reason")
            lead.fit_strengths = assessment.get("fit_strengths", [])
            lead.fit_risks = assessment.get("fit_risks", [])
            lead.status = assessment.get("status", "UNQUALIFIED")
            db.commit()

            is_qualified = lead.status == "QUALIFIED" and (lead.fit_score or 0) >= score_threshold

            pipeline_logger.log_ai_qualification(
                index=idx,
                total=total_candidates,
                company_name=company_name,
                score=lead.fit_score or 0,
                threshold=score_threshold,
                status=lead.status,
                reason=lead.fit_reason,
                strengths=lead.fit_strengths,
                risks=lead.fit_risks
            )

            # Log Step 4
            db.add(ActivityLog(
                run_id=run.id,
                lead_id=lead.id,
                action="LEAD_QUALIFIED" if is_qualified else "LEAD_REJECTED",
                level="SUCCESS" if is_qualified else "INFO",
                details=f"Step 4: AI Qualification score {lead.fit_score}/100 (Threshold: {score_threshold}). Status: {lead.status}. Reason: {lead.fit_reason}"
            ))
            db.commit()

            saved_contacts: List[PipelineContact] = []
            draft_obj: Optional[PipelineDraft] = None

            # --- STRICT GATE: ONLY PROCEED IF QUALIFIED ---
            if is_qualified:
                # Step 5: Hunter.io contact discovery & verification (Prioritizing Decision-Makers)
                raw_contacts = await hunter_service.search_domain(website, limit=3)

                # If named person identified from company search/research, use Hunter Email Finder
                named_person = cand.get("contact_name")
                if named_person and not any(named_person.lower() in (c.get("name") or "").lower() for c in raw_contacts):
                    finder_contact = await hunter_service.find_email(domain=website, full_name=named_person, company=company_name)
                    if finder_contact:
                        raw_contacts.insert(0, finder_contact)

                # Prioritize decision-makers in contact ranking
                if decision_makers:
                    dm_lowers = [dm.lower() for dm in decision_makers]
                    raw_contacts.sort(
                        key=lambda c: any(dm in (c.get("job_title") or "").lower() for dm in dm_lowers),
                        reverse=True
                    )

                # Check deliverability via Hunter Email Verifier
                for rc in raw_contacts:
                    if rc.get("email") and hunter_service.is_configured():
                        verify_res = await hunter_service.verify_email(rc["email"])
                        if verify_res.get("status") in ("deliverable", "risky", "undeliverable"):
                            rc["email_status"] = verify_res["status"]

                for rc in raw_contacts:
                    contact = Contact(
                        lead_id=lead.id,
                        name=rc["name"],
                        job_title=rc.get("job_title"),
                        email=rc.get("email"),
                        email_status=rc.get("email_status", "unverified"),
                        confidence_score=rc.get("confidence_score", 0),
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

                pipeline_logger.log_contacts(
                    company_name=company_name,
                    website=website,
                    decision_makers=decision_makers or [],
                    contacts=saved_contacts
                )

                contact_log_msg = (
                    f"Hunter.io identified {len(saved_contacts)} contact(s)"
                    if saved_contacts
                    else "No verified Hunter.io contacts found (flagged for manual review)"
                )
                db.add(ActivityLog(
                    run_id=run.id,
                    lead_id=lead.id,
                    action="CONTACT_DISCOVERED" if saved_contacts else "CONTACT_UNAVAILABLE",
                    level="INFO",
                    details=f"Step 5: {contact_log_msg} for {company_name}"
                ))
                db.commit()

                # Step 6: Gemini drafts personalized introduction email (Grounded strictly in evidence)
                primary_contact = saved_contacts[0] if saved_contacts else None
                draft_res = gemini_service.generate_outreach_email(
                    company_name=company_name,
                    website=website,
                    research_summary=research_content,
                    target_criteria=latest_user_text,
                    service_offered=service_offered,
                    contact_name=primary_contact.name if primary_contact else None,
                    contact_role=primary_contact.job_title if primary_contact else None,
                    website_status=website_status
                )

                draft = OutreachDraft(
                    lead_id=lead.id,
                    contact_id=primary_contact.id if primary_contact else None,
                    subject=draft_res.get("subject", f"Inquiry for {company_name}"),
                    body=draft_res.get("body", "Hello..."),
                    status="DRAFT"
                )
                db.add(draft)
                db.commit()
                db.refresh(draft)

                pipeline_logger.log_outreach_draft(
                    company_name=company_name,
                    recipient=primary_contact.name if primary_contact else "Decision-Maker",
                    subject=draft.subject
                )

                db.add(ActivityLog(
                    run_id=run.id,
                    lead_id=lead.id,
                    action="DRAFT_GENERATED",
                    level="SUCCESS",
                    details=f"Step 6: Gemini drafted email #{draft.id} ('{draft.subject}'). Awaiting human review."
                ))
                db.commit()

                draft_obj = PipelineDraft(
                    id=draft.id,
                    subject=draft.subject,
                    body=draft.body,
                    status=draft.status
                )
            else:
                # Disqualified lead: NO contact lookup, NO email drafting, NO follow-up
                db.add(ActivityLog(
                    run_id=run.id,
                    lead_id=lead.id,
                    action="OUTREACH_SKIPPED",
                    level="INFO",
                    details=f"Disqualified prospect '{company_name}' ({lead.fit_score}/100) skipped for email drafting and follow-up."
                ))
                db.commit()

            pipeline_leads_result.append(PipelineLead(
                id=lead.id,
                company_name=company_name,
                website=website,
                industry=lead.industry,
                location=cand_location,
                website_status=website_status,
                website_evidence=website_evidence,
                fit_score=lead.fit_score or 0,
                fit_reason=lead.fit_reason,
                fit_strengths=lead.fit_strengths or [],
                fit_risks=lead.fit_risks or [],
                qualification_status=lead.status,
                research_summary=research_summary,
                contacts=saved_contacts,
                draft=draft_obj,
                follow_up_date=None,  # STRICT: Follow-up is None until email is actually sent!
                follow_up_notes=None,
                follow_up_status="AWAITING_EMAIL_SEND" if is_qualified else "DISQUALIFIED"
            ))

        pipeline_leads_result = pipeline_leads_result[:target_qty]
        qualified_leads = [p for p in pipeline_leads_result if p.qualification_status == "QUALIFIED"]
        run.status = "COMPLETED"
        run.completed_at = datetime.now(timezone.utc)
        run.leads_discovered = len(pipeline_leads_result)
        run.leads_qualified = len(qualified_leads)
        run.drafts_generated = sum(1 for p in pipeline_leads_result if p.draft is not None)
        db.commit()

        pipeline_logger.log_finish(
            run_id=run.id,
            total_evaluated=len(pipeline_leads_result),
            qualified_count=len(qualified_leads),
            drafts_count=run.drafts_generated,
            threshold=score_threshold
        )

        # Build accurate status report
        if not qualified_leads:
            conversational_summary = (
                f"⚠️ **Completed — 0 qualified leads**\n\n"
                f"**Parsed Search Criteria:**\n"
                f"• **Industry/Business:** {industry}\n"
                f"• **Location:** {location}\n"
                f"• **Target Quantity:** {target_qty}\n"
                f"• **Service Offered:** {service_offered}\n"
                f"• **Website Status:** {website_status_req}\n"
                f"• **Min Score:** {score_threshold}\n\n"
                f"Evaluated {len(pipeline_leads_result)} candidate(s). None met the qualification threshold (score >= {score_threshold} and location match). "
                f"Disqualified candidates are shown below with detailed reasoning."
            )
        else:
            conversational_summary = (
                f"🎯 **LeadFlow Pipeline Completed: {len(qualified_leads)} of {len(pipeline_leads_result)} Leads Qualified**\n\n"
                f"**Parsed Search Criteria:**\n"
                f"• **Industry/Business:** {industry}\n"
                f"• **Location:** {location}\n"
                f"• **Service Offered:** {service_offered}\n"
                f"• **Website Status:** {website_status_req}\n"
                f"• **Min Score:** {score_threshold}\n\n"
                f"Review the evaluated prospects below. Inspect research evidence, edit or approve drafts, "
                f"and send via Gmail SMTP when ready:"
            )

        return ChatResponse(
            role="assistant",
            content=conversational_summary,
            parsed_criteria=parsed_obj,
            pipeline_leads=pipeline_leads_result,
            qualified_count=len(qualified_leads),
            total_candidates=len(pipeline_leads_result)
        )

    # -------------------------------------------------------------------------
    # Intent 4: General conversational assistance using Gemini
    # -------------------------------------------------------------------------
    system_instruction = (
        "You are LeadFlow AI, an ethical, general-purpose B2B Sales Operations Agent. "
        "You help users discover prospects, research companies using Firecrawl, qualify customer fit using Gemini, "
        "find professional emails with Hunter.io, generate personalized cold emails, review drafts, and send approved messages via Gmail SMTP. "
        "Always preserve the user's exact geographical and industry requirements without inventing mock data."
    )

    if gemini_service.is_configured():
        try:
            from google.genai import types
            contents = [f"{m.role.upper()}: {m.content}" for m in payload.messages[-6:]]
            full_prompt = f"{system_instruction}\n\n" + "\n\n".join(contents) + "\n\nASSISTANT:"
            response = gemini_service.generate_content_with_fallback(
                contents=full_prompt,
                config=types.GenerateContentConfig(temperature=0.7)
            )
            return ChatResponse(role="assistant", content=response.text.strip())
        except Exception as e:
            logger.error(f"Gemini chat error: {e}")

    return ChatResponse(
        role="assistant",
        content="I am ready to help you find and qualify prospective B2B customers. Try entering: *'Find 5 hotels in Addis Ababa without official websites and draft emails offering website development'* or *'Find SaaS companies in Ethiopia that may need AI automation'*"
    )
