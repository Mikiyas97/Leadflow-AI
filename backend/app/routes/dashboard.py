"""Dashboard and Overview Statistics API Router"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.database import get_db
from backend.app.models import Lead, OutreachDraft, AutomationRun, ActivityLog
from backend.app.schemas import DashboardStatsResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(db: Session = Depends(get_db)):
    """Retrieve summarized metrics and activity feeds for the dashboard."""
    total_leads = db.query(func.count(Lead.id)).scalar() or 0
    qualified_leads = db.query(func.count(Lead.id)).filter(Lead.status == "QUALIFIED").scalar() or 0
    pending_drafts = db.query(func.count(OutreachDraft.id)).filter(OutreachDraft.status == "DRAFT").scalar() or 0
    approved_drafts = db.query(func.count(OutreachDraft.id)).filter(OutreachDraft.status == "APPROVED").scalar() or 0

    recent_runs = db.query(AutomationRun).order_by(AutomationRun.started_at.desc()).limit(5).all()
    recent_activities = db.query(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(10).all()

    return {
        "total_leads": total_leads,
        "qualified_leads": qualified_leads,
        "pending_drafts": pending_drafts,
        "approved_drafts": approved_drafts,
        "recent_runs": recent_runs,
        "recent_activities": recent_activities
    }
