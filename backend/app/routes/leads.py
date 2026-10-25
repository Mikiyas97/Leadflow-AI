"""Leads API Router"""
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.app.database import get_db
from backend.app.models import Lead, Contact, ResearchRecord, OutreachDraft, TargetProfile, ActivityLog, AutomationRun
from backend.app.schemas import (
    LeadResponse,
    LeadDetailResponse,
    LeadUpdate,
    LeadAnalyzeRequest,
    LeadDraftRequest,
    OutreachDraftResponse,
    LeadSearchRequest,
    LeadSearchResponse,
    PipelineLead,
    PipelineContact,
    PipelineDraft
)
from backend.app.services.gemini_service import gemini_service
from backend.app.services.firecrawl_service import firecrawl_service
from backend.app.services.discovery_service import discovery_service, derive_search_name
from backend.app.services.hunter_service import hunter_service
from backend.app.services.pipeline_logger import pipeline_logger

router = APIRouter(prefix="/leads", tags=["Leads"])


@router.get("", response_model=List[LeadResponse])
def list_leads(
    search: Optional[str] = None,
    status: Optional[str] = None,
    min_score: Optional[int] = None,
    is_overdue: Optional[bool] = None,
    limit: int = Query(default=250, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db)
):
    """List, search, and filter leads."""
    query = db.query(Lead)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Lead.company_name.ilike(search_pattern),
                Lead.website.ilike(search_pattern),
                Lead.industry.ilike(search_pattern),
                Lead.location.ilike(search_pattern),
            )
        )

    if status and status != "ALL":
        query = query.filter(Lead.status == status)

    if min_score is not None:
        query = query.filter(Lead.fit_score >= min_score)

    if is_overdue:
        now = datetime.utcnow()
        query = query.filter(
            Lead.follow_up_date.isnot(None),
            Lead.follow_up_date <= now,
            Lead.follow_up_status != "COMPLETED",
            Lead.status != "ARCHIVED"
        )

    return query.order_by(Lead.created_at.desc()).offset(offset).limit(limit).all()


@router.get("/overdue", response_model=List[LeadResponse])
def list_overdue_leads(
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Retrieve all leads with overdue follow-ups (FR-09)."""
    now = datetime.utcnow()
    return db.query(Lead).filter(
        Lead.follow_up_date.isnot(None),
        Lead.follow_up_date <= now,
        Lead.follow_up_status != "COMPLETED",
        Lead.status != "ARCHIVED"
    ).order_by(Lead.follow_up_date.asc()).limit(limit).all()


@router.get("/{lead_id}", response_model=LeadDetailResponse)
def get_lead(lead_id: int, db: Session = Depends(get_db)):
    """Retrieve full details of a lead including research, contacts, and drafts."""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.patch("/{lead_id}", response_model=LeadResponse)
def update_lead(lead_id: int, payload: LeadUpdate, db: Session = Depends(get_db)):
    """Update lead details or operational status (e.g. QUALIFIED, CONTACTED, ARCHIVED)."""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    update_dict = payload.dict(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(lead, field, val)

    lead.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(lead)

    db.add(ActivityLog(
        lead_id=lead.id,
        action="LEAD_UPDATED",
        level="INFO",
        details=f"Updated lead attributes: {', '.join(update_dict.keys())}"
    ))
    db.commit()

    return lead


@router.post("/{lead_id}/analyze", response_model=LeadDetailResponse)
async def analyze_lead(
    lead_id: int,
    payload: LeadAnalyzeRequest,
    db: Session = Depends(get_db)
):
    """Trigger a fresh AI qualification analysis for an existing lead."""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Get target criteria
    criteria = "B2B SaaS companies needing automated sales operations"
    industry = lead.industry
    profile_id = payload.profile_id or lead.profile_id
    if profile_id:
        profile = db.query(TargetProfile).filter(TargetProfile.id == profile_id).first()
        if profile:
            criteria = profile.criteria
            industry = profile.industry

    # Get latest research summary or fetch fresh
    research = db.query(ResearchRecord).filter(ResearchRecord.lead_id == lead.id).order_by(ResearchRecord.researched_at.desc()).first()
    if research and research.raw_content:
        content = research.raw_content
    else:
        scrape_res = await firecrawl_service.scrape_company_website(lead.website)
        content = scrape_res.get("content", f"Company profile for {lead.company_name}")
        research = ResearchRecord(
            lead_id=lead.id,
            summary=scrape_res.get("description", "Scraped website profile"),
            raw_content=content,
            source_urls=scrape_res.get("source_urls", [f"https://{lead.website}"])
        )
        db.add(research)
        db.commit()

    assessment = gemini_service.analyze_lead_suitability(
        company_name=lead.company_name,
        website=lead.website,
        research_summary=content,
        target_criteria=criteria,
        target_industry=industry
    )

    lead.fit_score = assessment.get("fit_score", 60)
    lead.fit_reason = assessment.get("fit_reason")
    lead.fit_strengths = assessment.get("fit_strengths", [])
    lead.fit_risks = assessment.get("fit_risks", [])
    lead.status = assessment.get("status", lead.status)
    lead.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(lead)

    db.add(ActivityLog(
        lead_id=lead.id,
        action="LEAD_REANALYZED",
        level="SUCCESS",
        details=f"Re-analyzed lead. Fit Score: {lead.fit_score}/100"
    ))
    db.commit()

    return lead


@router.post("/{lead_id}/draft", response_model=OutreachDraftResponse)
def generate_draft_for_lead(
    lead_id: int,
    payload: LeadDraftRequest,
    db: Session = Depends(get_db)
):
    """Generate a new personalized outreach email draft using Gemini."""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    contact = None
    if payload.contact_id:
        contact = db.query(Contact).filter(Contact.id == payload.contact_id, Contact.lead_id == lead.id).first()
    elif lead.contacts:
        contact = lead.contacts[0]

    # Get research context
    research = db.query(ResearchRecord).filter(ResearchRecord.lead_id == lead.id).order_by(ResearchRecord.researched_at.desc()).first()
    content = research.raw_content if research else f"{lead.company_name} ({lead.website})"

    criteria = "Help B2B sales teams automate prospecting, qualification, and email prep"
    if lead.profile:
        criteria = lead.profile.criteria

    draft_res = gemini_service.generate_outreach_email(
        company_name=lead.company_name,
        website=lead.website,
        research_summary=content,
        target_criteria=criteria,
        contact_name=contact.name if contact else None,
        contact_role=contact.job_title if contact else None,
        custom_instructions=payload.custom_instructions
    )

    draft = OutreachDraft(
        lead_id=lead.id,
        contact_id=contact.id if contact else None,
        subject=draft_res["subject"],
        body=draft_res["body"],
        status="DRAFT"
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)

    db.add(ActivityLog(
        lead_id=lead.id,
        action="DRAFT_GENERATED",
        level="SUCCESS",
        details=f"Drafted email: '{draft.subject}'"
    ))
    db.commit()

    return draft


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lead(lead_id: int, db: Session = Depends(get_db)):
    """Delete a lead."""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    db.delete(lead)
    db.commit()
    return None


class RescheduleFollowUpRequest(BaseModel):
    days: Optional[int] = None
    date: Optional[str] = None
    notes: Optional[str] = None
    action_type: Optional[str] = None
    status: Optional[str] = None


@router.post("/{lead_id}/reschedule-followup")
def reschedule_lead_followup(
    lead_id: int,
    payload: RescheduleFollowUpRequest,
    db: Session = Depends(get_db)
):
    """Reschedule next follow-up date and manage follow-up operations for a lead (Step 8)."""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    if payload.days is not None:
        target_date = datetime.now(timezone.utc) + timedelta(days=payload.days)
        lead.follow_up_date = target_date
    elif payload.date:
        try:
            target_date = datetime.fromisoformat(payload.date.replace("Z", "+00:00"))
            lead.follow_up_date = target_date
        except Exception:
            target_date = datetime.now(timezone.utc) + timedelta(days=3)
            lead.follow_up_date = target_date
    elif not lead.follow_up_date:
        lead.follow_up_date = datetime.now(timezone.utc) + timedelta(days=3)

    if payload.notes is not None:
        lead.follow_up_notes = payload.notes

    if payload.status is not None:
        lead.follow_up_status = payload.status
        if payload.status == "COMPLETED":
            lead.status = "CONTACTED"

    db.commit()
    db.refresh(lead)

    formatted_date = lead.follow_up_date.strftime("%b %d, %Y") if lead.follow_up_date else "Not set"
    log_action = "FOLLOWUP_COMPLETED" if payload.status == "COMPLETED" else "FOLLOWUP_MANAGED"
    action_desc = f" ({payload.action_type})" if payload.action_type else ""
    notes_desc = f" Notes: '{payload.notes}'" if payload.notes else ""
    status_desc = f" Status: {payload.status}." if payload.status else ""

    db.add(ActivityLog(
        lead_id=lead.id,
        action=log_action,
        level="INFO" if payload.status != "COMPLETED" else "SUCCESS",
        details=f"Follow-up for {lead.company_name}{action_desc}: Scheduled for {formatted_date}.{status_desc}{notes_desc}"
    ))
    db.commit()

    return {
        "lead_id": lead.id,
        "follow_up_date": formatted_date,
        "raw_follow_up_date": lead.follow_up_date.isoformat() if lead.follow_up_date else None,
        "follow_up_notes": lead.follow_up_notes,
        "follow_up_status": lead.follow_up_status,
        "status": lead.status
    }


@router.post("/search", response_model=LeadSearchResponse)
async def search_leads(payload: LeadSearchRequest, db: Session = Depends(get_db)):
    """
    Executes targeted lead search and AI qualification pipeline using 9 controlled fields.
    Honors requested lead quantity, minimum score threshold, verified website status,
    and decision-maker priorities. Never fabricates businesses or scores.
    """
    business_str = ", ".join(payload.target_business) if payload.target_business else "Businesses"
    location_str = payload.location.strip()
    service_str = payload.service_offered.strip() or "General B2B Services"
    score_threshold = payload.min_qualification_score

    # 1. Log Automation Run
    search_name = (payload.campaign_name or "").strip() or derive_search_name(payload.model_dump())
    run = AutomationRun(
        status="RUNNING",
        search_name=search_name,
        input_profile=payload.model_dump(),
        started_at=datetime.now(timezone.utc)
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    pipeline_logger.log_start(
        run_id=run.id,
        campaign_name=payload.campaign_name,
        target_businesses=payload.target_business,
        location=location_str,
        service_offered=service_str,
        decision_makers=payload.decision_makers,
        company_size=payload.company_size,
        website_status=payload.website_status,
        lead_quantity=payload.lead_quantity,
        min_qualification_score=score_threshold
    )

    db.add(ActivityLog(
        run_id=run.id,
        action="SEARCH_INITIATED",
        level="INFO",
        details=(
            f"Initiated search: '{payload.campaign_name or 'Lead Search'}' targeting {business_str} in {location_str} "
            f"(Target Qty: {payload.lead_quantity}, Min Score: {score_threshold}, Website Status: {payload.website_status}, "
            f"Decision-Makers: {', '.join(payload.decision_makers) if payload.decision_makers else 'Any'})"
        )
    ))
    db.commit()

    # 2. Discover matching companies via live web research
    pipeline_logger.log_discovery_query(
        query=f"{business_str}",
        location=location_str,
        status_filter=payload.website_status
    )

    db.add(ActivityLog(
        run_id=run.id,
        action="DISCOVERY_QUERY",
        level="INFO",
        details=f"Querying Google & web directories for '{business_str}' in '{location_str}' (Website status requirement: {payload.website_status})..."
    ))
    db.commit()

    existing_websites = [row[0] for row in db.query(Lead.website).all()]
    candidates = await discovery_service.discover_companies(
        target_businesses=payload.target_business,
        location=location_str,
        service_offered=service_str,
        company_size=payload.company_size if payload.company_size and payload.company_size != "Any" else None,
        website_status=payload.website_status,
        limit=payload.lead_quantity,
        exclude_websites=existing_websites
    )

    pipeline_logger.log_discovery_results(candidates)

    if not candidates:
        run.status = "COMPLETED"
        run.completed_at = datetime.now(timezone.utc)
        run.leads_discovered = 0
        run.leads_qualified = 0
        db.add(ActivityLog(
            run_id=run.id,
            action="DISCOVERY_EMPTY",
            level="WARNING",
            details=f"Zero matching candidates found for '{business_str}' in '{location_str}'. LeadFlow avoids fabricating fake businesses."
        ))
        db.commit()

        run_logs = db.query(ActivityLog).filter(ActivityLog.run_id == run.id).order_by(ActivityLog.id.asc()).all()

        summary_msg = (
            f"Completed — 0 candidates found for {business_str} in {location_str}. "
            f"LeadFlow does not fabricate mock data. Try broadening your criteria or location search."
        )
        pipeline_logger.log_finish(
            run_id=run.id,
            total_evaluated=0,
            qualified_count=0,
            drafts_count=0,
            threshold=score_threshold
        )
        return LeadSearchResponse(
            campaign_name=payload.campaign_name,
            pipeline_leads=[],
            qualified_count=0,
            total_candidates=0,
            min_qualification_score=score_threshold,
            search_summary=summary_msg,
            run_id=run.id,
            logs=run_logs
        )

    db.add(ActivityLog(
        run_id=run.id,
        action="DISCOVERY_SUCCESS",
        level="SUCCESS",
        details=f"Discovered {len(candidates)} prospective company candidate(s): {', '.join(c['company_name'] for c in candidates[:5])}{' and others' if len(candidates) > 5 else ''}."
    ))
    db.commit()

    pipeline_leads_result: List[PipelineLead] = []
    target_candidates = candidates[:payload.lead_quantity]
    total_to_evaluate = len(target_candidates)

    for idx, cand in enumerate(target_candidates, 1):
        company_name = cand["company_name"]
        website = cand["website"]
        cand_location = cand.get("location", location_str)
        website_status = cand.get("website_status", "HAS_OFFICIAL_WEBSITE")
        website_evidence = cand.get("website_evidence", "")

        # Deduplication / DB Lead registration
        lead = db.query(Lead).filter(Lead.website == website).first()
        if not lead:
            lead = Lead(
                company_name=company_name,
                website=website,
                industry=cand.get("industry") or business_str,
                location=cand_location,
                company_size=cand.get("company_size") or (payload.company_size if payload.company_size != "Any" else None),
                website_status=website_status,
                status="NEW",
                source_url=cand.get("source_url")
            )
            db.add(lead)
            db.commit()
            db.refresh(lead)

        # Scrape research record
        research_res = await firecrawl_service.scrape_company_website(website)
        research_content = research_res.get("content", f"Business profile for {company_name}")
        research_summary = (
            research_res.get("description")
            or research_res.get("title")
            or website_evidence
            or f"Business listing for {company_name} in {cand_location}"
        )

        research_record = ResearchRecord(
            lead_id=lead.id,
            summary=research_summary,
            raw_content=research_content,
            source_urls=research_res.get("source_urls", [f"https://{website}"])
        )
        db.add(research_record)

        pipeline_logger.log_website_verification(
            index=idx,
            total=total_to_evaluate,
            company_name=company_name,
            website=website,
            website_status=website_status,
            evidence=website_evidence
        )

        db.add(ActivityLog(
            run_id=run.id,
            lead_id=lead.id,
            action="WEBSITE_RESEARCH",
            level="INFO",
            details=f"[{idx}/{total_to_evaluate}] Verified website status for {company_name} ({website}): {website_status}. Evidence: {website_evidence or 'Standard web presence'}."
        ))
        db.commit()

        # Strict Qualification with dynamic score threshold
        assessment = gemini_service.analyze_lead_suitability(
            company_name=company_name,
            website=website,
            research_summary=research_content,
            target_criteria=f"Target: {business_str} in {location_str} offering {service_str}",
            target_industry=business_str,
            target_location=location_str,
            actual_location=cand_location,
            service_offered=service_str,
            website_status=website_status,
            min_qualification_score=score_threshold,
            requested_website_status=payload.website_status,
            decision_makers=payload.decision_makers,
            company_size=payload.company_size
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
            total=total_to_evaluate,
            company_name=company_name,
            score=lead.fit_score or 0,
            threshold=score_threshold,
            status=lead.status,
            reason=lead.fit_reason,
            strengths=lead.fit_strengths,
            risks=lead.fit_risks
        )

        db.add(ActivityLog(
            run_id=run.id,
            lead_id=lead.id,
            action="AI_EVALUATION",
            level="SUCCESS" if is_qualified else "INFO",
            details=f"[{idx}/{total_to_evaluate}] Gemini AI evaluated {company_name}: Score {lead.fit_score}/100 (Threshold: {score_threshold}). Status: {lead.status}. Rationale: {lead.fit_reason or 'Evaluated based on ICP'}"
        ))
        db.commit()

        saved_contacts: List[PipelineContact] = []
        draft_obj: Optional[PipelineDraft] = None

        if is_qualified:
            # Hunter.io contact discovery prioritizing user decision-makers
            raw_contacts = await hunter_service.search_domain(website, limit=3)
            named_person = cand.get("contact_name")
            if named_person and not any(named_person.lower() in (c.get("name") or "").lower() for c in raw_contacts):
                finder_contact = await hunter_service.find_email(domain=website, full_name=named_person, company=company_name)
                if finder_contact:
                    raw_contacts.insert(0, finder_contact)

            # Prioritize decision-makers in contact ranking
            if payload.decision_makers:
                dm_lowers = [dm.lower() for dm in payload.decision_makers]
                raw_contacts.sort(
                    key=lambda c: any(dm in (c.get("job_title") or "").lower() for dm in dm_lowers),
                    reverse=True
                )

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
                decision_makers=payload.decision_makers,
                contacts=saved_contacts
            )

            if saved_contacts:
                db.add(ActivityLog(
                    run_id=run.id,
                    lead_id=lead.id,
                    action="CONTACTS_DISCOVERED",
                    level="SUCCESS",
                    details=f"[{idx}/{total_to_evaluate}] Hunter.io found {len(saved_contacts)} contact(s) for {company_name}: {', '.join(c.name + ' (' + (c.job_title or 'Unlisted') + ' - ' + (c.email or 'no email') + ')' for c in saved_contacts)}."
                ))
            else:
                db.add(ActivityLog(
                    run_id=run.id,
                    lead_id=lead.id,
                    action="CONTACTS_EMPTY",
                    level="INFO",
                    details=f"[{idx}/{total_to_evaluate}] Hunter.io contact search completed for domain '{website}'; no direct email matches found."
                ))
            db.commit()

            # Gemini drafts personalized outreach email targeting service and decision-maker
            primary_contact = saved_contacts[0] if saved_contacts else None
            draft_res = gemini_service.generate_outreach_email(
                company_name=company_name,
                website=website,
                research_summary=research_content,
                target_criteria=f"{business_str} in {location_str}",
                service_offered=service_str,
                contact_name=primary_contact.name if primary_contact else None,
                contact_role=primary_contact.job_title if primary_contact else (payload.decision_makers[0] if payload.decision_makers else None),
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

            draft_obj = PipelineDraft(
                id=draft.id,
                subject=draft.subject,
                body=draft.body,
                status=draft.status
            )

            pipeline_logger.log_outreach_draft(
                company_name=company_name,
                recipient=primary_contact.name if primary_contact else "Decision-Maker",
                subject=draft.subject
            )

            db.add(ActivityLog(
                run_id=run.id,
                lead_id=lead.id,
                action="OUTREACH_PREPARED",
                level="SUCCESS",
                details=f"[{idx}/{total_to_evaluate}] Outreach draft prepared for {company_name} (Recipient: {primary_contact.name if primary_contact else 'Decision-Maker'}): \"{draft.subject}\""
            ))
            db.commit()
        else:
            db.add(ActivityLog(
                run_id=run.id,
                lead_id=lead.id,
                action="LEAD_DISQUALIFIED",
                level="INFO",
                details=f"[{idx}/{total_to_evaluate}] Disqualified {company_name}: Score {lead.fit_score}/100 is below minimum threshold of {score_threshold}."
            ))
            db.commit()

        pipeline_leads_result.append(PipelineLead(
            id=lead.id,
            company_name=company_name,
            website=website,
            industry=lead.industry,
            location=cand_location,
            company_size=lead.company_size,
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
            follow_up_date=None,
            follow_up_notes=None,
            follow_up_status="AWAITING_EMAIL_SEND" if is_qualified else "DISQUALIFIED"
        ))

    # Rank results by qualification score (highest score first)
    pipeline_leads_result.sort(
        key=lambda p: (
            p.fit_score or 0,
            1 if p.qualification_status == "QUALIFIED" else 0
        ),
        reverse=True
    )

    # Adhere strictly to requested lead quantity limit
    pipeline_leads_result = pipeline_leads_result[:payload.lead_quantity]
    qualified_leads = [p for p in pipeline_leads_result if p.qualification_status == "QUALIFIED"]

    run.status = "COMPLETED"
    run.completed_at = datetime.now(timezone.utc)
    run.leads_discovered = len(pipeline_leads_result)
    run.leads_qualified = len(qualified_leads)
    run.drafts_generated = sum(1 for p in pipeline_leads_result if p.draft is not None)

    db.add(ActivityLog(
        run_id=run.id,
        action="PIPELINE_COMPLETED",
        level="SUCCESS",
        details=(
            f"Pipeline Run #{run.id} finished: {len(pipeline_leads_result)} candidate(s) evaluated, "
            f"{len(qualified_leads)} qualified (score >= {score_threshold}), {run.drafts_generated} cold outreach draft(s) created."
        )
    ))
    db.commit()

    pipeline_logger.log_finish(
        run_id=run.id,
        total_evaluated=len(pipeline_leads_result),
        qualified_count=len(qualified_leads),
        drafts_count=run.drafts_generated,
        threshold=score_threshold
    )

    run_logs = db.query(ActivityLog).filter(ActivityLog.run_id == run.id).order_by(ActivityLog.id.asc()).all()

    search_summary = ""

    return LeadSearchResponse(
        campaign_name=payload.campaign_name,
        pipeline_leads=pipeline_leads_result,
        qualified_count=len(qualified_leads),
        total_candidates=len(pipeline_leads_result),
        min_qualification_score=score_threshold,
        search_summary=search_summary,
        run_id=run.id,
        logs=run_logs
    )


