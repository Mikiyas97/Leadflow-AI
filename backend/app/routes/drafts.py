"""Outreach Drafts & Gmail SMTP Sending API Router"""
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import OutreachDraft, ActivityLog, Lead
from backend.app.schemas import (
    OutreachDraftUpdate,
    OutreachDraftResponse,
    SendDraftEmailRequest,
    TestEmailRequest
)
from backend.app.services.email_service import email_service

router = APIRouter(prefix="/drafts", tags=["Outreach Drafts"])


@router.get("", response_model=List[OutreachDraftResponse])
def list_drafts(
    status: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """List email drafts, filterable by status (DRAFT, APPROVED, REJECTED, SENT, FAILED)."""
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
    Approve an outreach draft for human-controlled sending.
    Marks the draft as APPROVED with timestamp. Does NOT send email or schedule follow-up.
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
        details=f"Approved draft #{draft.id} ('{draft.subject}') for human outreach review. Follow-up is not scheduled until email is confirmed sent."
    ))
    db.commit()

    return draft


@router.post("/{draft_id}/send")
def send_approved_draft(
    draft_id: int,
    payload: SendDraftEmailRequest,
    db: Session = Depends(get_db)
):
    """
    Sends an outreach email via Gmail SMTP upon explicit user authorization.
    Requires draft to be APPROVED (or approves it implicitly on user send action).
    Enforces idempotency and schedules follow-up ONLY upon verified SMTP acceptance.
    """
    draft = db.query(OutreachDraft).filter(OutreachDraft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    lead = db.query(Lead).filter(Lead.id == draft.lead_id).first()

    # Prevent duplicate sends
    if draft.status == "SENT":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"This draft was already sent on {draft.sent_at.strftime('%Y-%m-%d %H:%M:%S UTC') if draft.sent_at else 'earlier'}. Duplicate send prevented."
        )

    # Idempotency key check
    if payload.idempotency_key and draft.idempotency_key == payload.idempotency_key:
        return {
            "success": True,
            "status": "ALREADY_PROCESSED",
            "message": "Request previously processed via idempotency key.",
            "draft_id": draft.id
        }

    # Determine recipient email address
    recipient = payload.recipient_email
    if not recipient and draft.contact and draft.contact.email:
        recipient = draft.contact.email
    elif not recipient and lead and lead.contacts:
        for c in lead.contacts:
            if c.email:
                recipient = c.email
                break

    if not recipient:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No recipient email address found. Please provide recipient_email in request body."
        )

    # Execute backend Gmail SMTP dispatch
    send_result = email_service.send_outreach_email(
        recipient_email=recipient,
        subject=draft.subject,
        body_text=draft.body,
        idempotency_key=payload.idempotency_key
    )

    if not send_result["success"]:
        draft.status = "FAILED"
        draft.send_error = send_result.get("error", "Failed to send email")
        db.commit()

        db.add(ActivityLog(
            lead_id=draft.lead_id,
            action="EMAIL_SEND_FAILED",
            level="WARNING",
            details=f"SMTP send failed for #{draft.id} to {recipient}: {draft.send_error}"
        ))
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=send_result.get("error", "Email send failed via Gmail SMTP.")
        )

    # Successful SMTP acceptance
    draft.status = "SENT"
    draft.sent_at = send_result.get("sent_at") or datetime.utcnow()
    draft.send_error = None
    if payload.idempotency_key:
        draft.idempotency_key = payload.idempotency_key

    # Update Lead status & SCHEDULE FOLLOW-UP ONLY NOW
    if lead:
        lead.status = "CONTACTED"
        follow_up_datetime = datetime.now(timezone.utc) + timedelta(days=3)
        lead.follow_up_date = follow_up_datetime
        lead.follow_up_status = "SCHEDULED"
        lead.follow_up_notes = f"Initial follow-up scheduled following confirmed email dispatch to {recipient}."

        formatted_followup = follow_up_datetime.strftime("%b %d, %Y")
        db.add(ActivityLog(
            lead_id=lead.id,
            action="FOLLOWUP_SCHEDULED",
            level="INFO",
            details=f"Follow-up for {lead.company_name} scheduled for {formatted_followup} after confirmed email dispatch."
        ))

    db.add(ActivityLog(
        lead_id=draft.lead_id,
        action="EMAIL_SENT",
        level="SUCCESS",
        details=f"Outreach email #{draft.id} accepted by Gmail SMTP for delivery to {recipient}."
    ))
    db.commit()
    db.refresh(draft)

    return {
        "success": True,
        "status": "SENT",
        "message": send_result.get("message"),
        "recipient": recipient,
        "sent_at": draft.sent_at.isoformat() if draft.sent_at else None,
        "follow_up_date": lead.follow_up_date.strftime("%b %d, %Y") if lead and lead.follow_up_date else None,
        "draft_id": draft.id
    }


@router.post("/test-email")
def send_test_email(payload: TestEmailRequest):
    """
    Sends an explicit test email to verify that Gmail SMTP credentials and network access work.
    """
    result = email_service.send_test_email(to_email=payload.recipient_email)
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("error", "SMTP test email failed.")
        )
    return {
        "success": True,
        "message": f"Test email successfully accepted by Gmail SMTP for delivery to {payload.recipient_email}."
    }
