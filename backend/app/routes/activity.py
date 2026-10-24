"""Activity Logs API Router"""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import ActivityLog
from backend.app.schemas import ActivityLogResponse

router = APIRouter(prefix="/activity", tags=["Activity Logs"])


@router.get("", response_model=List[ActivityLogResponse])
def list_activity_logs(
    run_id: Optional[int] = None,
    lead_id: Optional[int] = None,
    level: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Retrieve system activity logs, run events, and audit history."""
    query = db.query(ActivityLog)
    if run_id:
        query = query.filter(ActivityLog.run_id == run_id)
    if lead_id:
        query = query.filter(ActivityLog.lead_id == lead_id)
    if level:
        query = query.filter(ActivityLog.level == level)

    return query.order_by(ActivityLog.created_at.desc()).limit(limit).all()
