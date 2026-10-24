"""Target Profiles API Router"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import TargetProfile
from backend.app.schemas import TargetProfileCreate, TargetProfileResponse

router = APIRouter(prefix="/target-profiles", tags=["Target Profiles"])


@router.post("", response_model=TargetProfileResponse, status_code=status.HTTP_201_CREATED)
def create_profile(payload: TargetProfileCreate, db: Session = Depends(get_db)):
    """Create a new target customer profile."""
    profile = TargetProfile(
        name=payload.name,
        industry=payload.industry,
        location=payload.location,
        company_size=payload.company_size,
        criteria=payload.criteria
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("", response_model=List[TargetProfileResponse])
def list_profiles(db: Session = Depends(get_db)):
    """List all saved customer profiles."""
    return db.query(TargetProfile).order_by(TargetProfile.created_at.desc()).all()


@router.get("/{profile_id}", response_model=TargetProfileResponse)
def get_profile(profile_id: int, db: Session = Depends(get_db)):
    """Retrieve a specific target profile."""
    profile = db.query(TargetProfile).filter(TargetProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Target profile not found")
    return profile


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_profile(profile_id: int, db: Session = Depends(get_db)):
    """Delete a target profile."""
    profile = db.query(TargetProfile).filter(TargetProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Target profile not found")
    db.delete(profile)
    db.commit()
    return None
