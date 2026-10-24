"""Discovery Runs API Router"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import AutomationRun, TargetProfile
from backend.app.schemas import DiscoveryRunCreate, DiscoveryRunResponse
from backend.app.services.orchestrator import execute_discovery_run

router = APIRouter(prefix="/discovery-runs", tags=["Discovery Runs"])


@router.post("", response_model=DiscoveryRunResponse, status_code=status.HTTP_202_ACCEPTED)
async def start_discovery_run(
    payload: DiscoveryRunCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Launch an automated discovery run in the background.
    """
    profile_data = {}
    if payload.profile_id:
        profile = db.query(TargetProfile).filter(TargetProfile.id == payload.profile_id).first()
        if not profile:
            raise HTTPException(status_code=404, detail="Target profile not found")
        profile_data = {
            "industry": payload.industry or profile.industry,
            "location": payload.location or profile.location,
            "company_size": payload.company_size or profile.company_size,
            "criteria": payload.criteria or profile.criteria,
            "max_leads": payload.max_leads
        }
    else:
        profile_data = {
            "industry": payload.industry or "B2B SaaS",
            "location": payload.location or "United States",
            "company_size": payload.company_size or "20-100",
            "criteria": payload.criteria or "High-growth B2B software companies",
            "max_leads": payload.max_leads
        }

    run = AutomationRun(
        profile_id=payload.profile_id,
        status="PENDING",
        input_profile=profile_data
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    # Queue background task
    background_tasks.add_task(execute_discovery_run, run.id)

    return run


@router.get("", response_model=List[DiscoveryRunResponse])
def list_discovery_runs(limit: int = 20, db: Session = Depends(get_db)):
    """List recent discovery runs."""
    return db.query(AutomationRun).order_by(AutomationRun.started_at.desc()).limit(limit).all()


@router.get("/{run_id}", response_model=DiscoveryRunResponse)
def get_discovery_run(run_id: int, db: Session = Depends(get_db)):
    """Check the status and results of a discovery run."""
    run = db.query(AutomationRun).filter(AutomationRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Discovery run not found")
    return run
