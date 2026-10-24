"""Leads API Router"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.app.database import get_db
from backend.app.models import Lead, Contact, ResearchRecord, OutreachDraft, TargetProfile, ActivityLog
from backend.app.schemas import (
    LeadResponse,
    LeadDetailResponse,
    LeadUpdate,
    LeadAnalyzeRequest,
    LeadDraftRequest,
    OutreachDraftResponse
)
from backend.app.services.gemini_service import gemini_service
from backend.app.services.firecrawl_service import firecrawl_service

router = APIRouter(prefix="/leads", tags=["Leads"])


@router.get("", response_model=List[LeadResponse])
def list_leads(
    search: Optional[str] = None,
    status: Optional[str] = None,
    min_score: Optional[int] = None,
    limit: int = Query(default=50, ge=1, le=100),
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

    return query.order_by(Lead.created_at.desc()).offset(offset).limit(limit).all()


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
