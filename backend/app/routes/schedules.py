"""Discovery Schedules API Router (FR-10)"""
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import DiscoverySchedule
from backend.app.schemas import (
    DiscoveryScheduleCreate,
    DiscoveryScheduleUpdate,
    DiscoveryScheduleResponse
)
from backend.app.services.scheduler_service import scheduler_service

router = APIRouter(prefix="/schedules", tags=["Discovery Schedules"])


@router.get("", response_model=List[DiscoveryScheduleResponse])
def list_schedules(db: Session = Depends(get_db)):
    """List all scheduled lead discovery jobs (FR-10)."""
    return db.query(DiscoverySchedule).order_by(DiscoverySchedule.created_at.desc()).all()


@router.post("", response_model=DiscoveryScheduleResponse, status_code=status.HTTP_201_CREATED)
def create_schedule(payload: DiscoveryScheduleCreate, db: Session = Depends(get_db)):
    """Create a new scheduled lead discovery job."""
    now = datetime.utcnow()
    next_run = now + timedelta(hours=payload.interval_hours or 24)

    sched = DiscoverySchedule(
        name=payload.name,
        profile_id=payload.profile_id,
        interval_hours=payload.interval_hours,
        industry=payload.industry,
        location=payload.location,
        company_size=payload.company_size,
        criteria=payload.criteria,
        max_leads=payload.max_leads,
        is_active=payload.is_active,
        next_run_at=next_run
    )
    db.add(sched)
    db.commit()
    db.refresh(sched)
    return sched


@router.get("/{schedule_id}", response_model=DiscoveryScheduleResponse)
def get_schedule(schedule_id: int, db: Session = Depends(get_db)):
    """Get a scheduled lead discovery job by ID."""
    sched = db.query(DiscoverySchedule).filter(DiscoverySchedule.id == schedule_id).first()
    if not sched:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return sched


@router.patch("/{schedule_id}", response_model=DiscoveryScheduleResponse)
def update_schedule(
    schedule_id: int,
    payload: DiscoveryScheduleUpdate,
    db: Session = Depends(get_db)
):
    """Update or toggle active status of a scheduled lead discovery job."""
    sched = db.query(DiscoverySchedule).filter(DiscoverySchedule.id == schedule_id).first()
    if not sched:
        raise HTTPException(status_code=404, detail="Schedule not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(sched, field, value)

    # If interval changed or reactivated, update next_run_at
    if "interval_hours" in update_data or ("is_active" in update_data and update_data["is_active"]):
        sched.next_run_at = datetime.utcnow() + timedelta(hours=sched.interval_hours or 24)

    db.commit()
    db.refresh(sched)
    return sched


@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_schedule(schedule_id: int, db: Session = Depends(get_db)):
    """Delete a scheduled discovery job."""
    sched = db.query(DiscoverySchedule).filter(DiscoverySchedule.id == schedule_id).first()
    if not sched:
        raise HTTPException(status_code=404, detail="Schedule not found")
    db.delete(sched)
    db.commit()
    return None


@router.post("/{schedule_id}/trigger")
async def trigger_schedule(schedule_id: int, db: Session = Depends(get_db)):
    """Trigger a scheduled discovery run immediately now."""
    sched = db.query(DiscoverySchedule).filter(DiscoverySchedule.id == schedule_id).first()
    if not sched:
        raise HTTPException(status_code=404, detail="Schedule not found")

    run_id = await scheduler_service.trigger_schedule_now(schedule_id)
    if not run_id:
        raise HTTPException(status_code=500, detail="Failed to trigger schedule run")

    return {
        "success": True,
        "message": f"Discovery run #{run_id} initiated for schedule '{sched.name}'",
        "run_id": run_id
    }
