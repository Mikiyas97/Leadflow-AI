"""Outreach Drafts API Router"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import OutreachDraft, ActivityLog
from backend.app.schemas import OutreachDraftUpdate, OutreachDraftResponse

router = APIRouter(prefix="/drafts", tags=["Outreach Drafts"])


@router.get("", response_model=List[OutreachDraftResponse])
def list_drafts(
    status: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """List email drafts, filterable by status (DRAFT, APPROVED, REJECTED)."""
    query = db.query(OutreachDraft)
    if status:
        query = query.filter(OutreachDraft.status == status)
    return query.order_by(OutreachDraft.created_at.desc()).limit(limit).all()


@router.get("/{draft_id}", response_model=OutreachDraftResponse)
def get_draft(draft_id: int, db: Session = Depends(get_db)):
    """Retrieve an email draft."""
    draft = db.query(OutreachDraft).filter(OutreachDraft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    return draft


@router.patch("/{draft_id}", response_model=OutreachDraftResponse)
def update_draft(draft_id: int, payload: OutreachDraftUpdate, db: Session = Depends(get_db)):
    """Update draft subject, body, or status."""
    draft = db.query(OutreachDraft).filter(OutreachDraft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    if payload.subject is not None:
        draft.subject = payload.subject
    if payload.body is not None:
        draft.body = payload.body
    if payload.status is not None:
        draft.status = payload.status
        if payload.status == "APPROVED" and not draft.approved_at:
            draft.approved_at = datetime.utcnow()

    db.commit()
    db.refresh(draft)

    db.add(ActivityLog(
        lead_id=draft.lead_id,
        action="DRAFT_UPDATED",
        level="INFO",
        details=f"Edited outreach draft #{draft.id}"
    ))
    db.commit()

    return draft


@router.post("/{draft_id}/approve", response_model=OutreachDraftResponse)
def approve_draft(draft_id: int, db: Session = Depends(get_db)):
    """
    Approve an outreach draft for human-controlled sending (FR-07).
    Marks the draft as APPROVED with timestamp; does not send autonomous cold emails.
    """
    draft = db.query(OutreachDraft).filter(OutreachDraft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    draft.status = "APPROVED"
    draft.approved_at = datetime.utcnow()
    db.commit()
    db.refresh(draft)

    db.add(ActivityLog(
        lead_id=draft.lead_id,
        action="DRAFT_APPROVED",
        level="SUCCESS",
        details=f"Approved draft '{draft.subject}' for human outreach."
    ))
    db.commit()

    return draft
