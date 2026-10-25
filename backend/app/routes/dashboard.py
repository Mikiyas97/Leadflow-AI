"""Dashboard and Overview Statistics API Router"""
import json
from datetime import datetime
from typing import Any, Dict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.database import get_db
from backend.app.models import Lead, OutreachDraft, AutomationRun, ActivityLog
from backend.app.schemas import DashboardStatsResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def resolve_run_search_name(run: AutomationRun) -> str:
    """Generate a descriptive search query name from the run's input_profile or target profile."""
    if run.profile and run.profile.name:
        return run.profile.name

    inp = run.input_profile
    if isinstance(inp, str):
        try:
            inp = json.loads(inp)
        except Exception:
            inp = None

    if isinstance(inp, dict):
        camp = inp.get("campaign_name")
        if camp and str(camp).strip():
            return str(camp).strip()

        tb = inp.get("target_business")
        if isinstance(tb, list) and tb:
            ind = ", ".join(tb)
        else:
            ind = inp.get("industry") or ""

        loc = inp.get("location") or ""
        service = inp.get("service_offered")

        if ind and loc:
            return f"{ind} in {loc}"
        elif ind:
            return f"{ind} Search"
        elif loc:
            return f"Companies in {loc}"
        elif service:
            return f"{service} Search"

    return f"Lead Search #{run.id}"


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

    recent_runs_raw = db.query(AutomationRun).order_by(AutomationRun.started_at.desc()).limit(10).all()
    recent_runs = []
    for r in recent_runs_raw:
        s_name = resolve_run_search_name(r)
        recent_runs.append({
            "id": r.id,
            "profile_id": r.profile_id,
            "status": r.status,
            "name": s_name,
            "search_name": s_name,
            "input_profile": r.input_profile,
            "leads_discovered": r.leads_discovered,
            "leads_qualified": r.leads_qualified,
            "drafts_generated": r.drafts_generated,
            "error_summary": r.error_summary,
            "started_at": r.started_at,
            "completed_at": r.completed_at
        })

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
