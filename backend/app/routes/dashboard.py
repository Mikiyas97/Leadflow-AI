"""Dashboard and Overview Statistics API Router"""
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.database import get_db
from backend.app.models import Lead, OutreachDraft, AutomationRun, ActivityLog
from backend.app.schemas import DashboardStatsResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(db: Session = Depends(get_db)):
    """Retrieve summarized metrics, overdue follow-ups, and activity feeds for the dashboard (FR-09, FR-11)."""
    now = datetime.utcnow()
    
    total_leads = db.query(func.count(Lead.id)).scalar() or 0
    qualified_leads = db.query(func.count(Lead.id)).filter(Lead.status == "QUALIFIED").scalar() or 0
    pending_drafts = db.query(func.count(OutreachDraft.id)).filter(OutreachDraft.status == "DRAFT").scalar() or 0
    approved_drafts = db.query(func.count(OutreachDraft.id)).filter(OutreachDraft.status == "APPROVED").scalar() or 0
    total_drafts_prepared = db.query(func.count(OutreachDraft.id)).scalar() or 0
    sent_emails = db.query(func.count(OutreachDraft.id)).filter(OutreachDraft.status == "SENT").scalar() or 0

    qualification_rate = round((qualified_leads / total_leads * 100), 1) if total_leads > 0 else 0.0

    # FR-09: Overdue follow-up identification
    overdue_query = db.query(Lead).filter(
        Lead.follow_up_date.isnot(None),
        Lead.follow_up_date <= now,
        Lead.follow_up_status != "COMPLETED",
        Lead.status != "ARCHIVED"
    )
    overdue_count = overdue_query.count()
    overdue_rows = overdue_query.order_by(Lead.follow_up_date.asc()).limit(50).all()

    overdue_leads = []
    for lead in overdue_rows:
        delta_days = (now - lead.follow_up_date).days if lead.follow_up_date else 0
        overdue_leads.append({
            "id": lead.id,
            "company_name": lead.company_name,
            "website": lead.website,
            "location": lead.location,
            "industry": lead.industry,
            "follow_up_date": lead.follow_up_date,
            "follow_up_notes": lead.follow_up_notes,
            "follow_up_status": lead.follow_up_status,
            "days_overdue": max(0, delta_days)
        })

    performance_summary = {
        "total_leads_discovered": total_leads,
        "total_qualified_leads": qualified_leads,
        "total_drafts_prepared": total_drafts_prepared,
        "total_approved_drafts": approved_drafts,
        "total_sent_emails": sent_emails,
        "qualification_rate": qualification_rate
    }

    recent_runs = db.query(AutomationRun).order_by(AutomationRun.started_at.desc()).limit(5).all()
    recent_activities = db.query(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(10).all()

    return {
        "total_leads": total_leads,
        "qualified_leads": qualified_leads,
        "pending_drafts": pending_drafts,
        "approved_drafts": approved_drafts,
        "overdue_followups_count": overdue_count,
        "total_drafts_prepared": total_drafts_prepared,
        "sent_emails": sent_emails,
        "qualification_rate": qualification_rate,
        "overdue_leads": overdue_leads,
        "performance_summary": performance_summary,
        "recent_runs": recent_runs,
        "recent_activities": recent_activities
    }

