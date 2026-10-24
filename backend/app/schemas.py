"""LeadFlow AI - Pydantic Request & Response Schemas"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


# ==========================================
# Target Customer Profile Schemas
# ==========================================
class TargetProfileBase(BaseModel):
    name: str = Field(..., description="Name for this profile (e.g., 'B2B SaaS Seed Stage')")
    industry: str = Field(..., description="Target industry (e.g., 'Fintech, Healthcare, AI')")
    location: Optional[str] = Field(None, description="Target location/geography (e.g., 'United States', 'Europe')")
    company_size: Optional[str] = Field(None, description="Employee count (e.g., '10-50', '50-200')")
    criteria: str = Field(..., description="Detailed qualification criteria and value proposition fit")


class TargetProfileCreate(TargetProfileBase):
    pass


class TargetProfileResponse(TargetProfileBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# Contact Schemas
# ==========================================
class ContactBase(BaseModel):
    name: str
    job_title: Optional[str] = None
    email: Optional[str] = None
    email_status: str = "unverified"
    confidence_score: Optional[int] = None
    source_url: Optional[str] = None


class ContactCreate(ContactBase):
    pass


class ContactResponse(ContactBase):
    id: int
    lead_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# Research Record Schemas
# ==========================================
class ResearchRecordResponse(BaseModel):
    id: int
    lead_id: int
    summary: Optional[str] = None
    raw_content: Optional[str] = None
    source_urls: Optional[List[str]] = None
    researched_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# Outreach Draft Schemas
# ==========================================
class OutreachDraftBase(BaseModel):
    subject: str
    body: str


class OutreachDraftCreate(OutreachDraftBase):
    lead_id: int
    contact_id: Optional[int] = None


class OutreachDraftUpdate(BaseModel):
    subject: Optional[str] = None
    body: Optional[str] = None
    status: Optional[str] = None  # "DRAFT", "APPROVED", "REJECTED"


class OutreachDraftResponse(OutreachDraftBase):
    id: int
    lead_id: int
    contact_id: Optional[int] = None
    status: str
    created_at: datetime
    approved_at: Optional[datetime] = None
    contact: Optional[ContactResponse] = None

    class Config:
        from_attributes = True


# ==========================================
# Lead Schemas
# ==========================================
class LeadBase(BaseModel):
    company_name: str
    website: str
    industry: Optional[str] = None
    location: Optional[str] = None
    company_size: Optional[str] = None


class LeadCreate(LeadBase):
    profile_id: Optional[int] = None
    source_url: Optional[str] = None


class LeadUpdate(BaseModel):
    company_name: Optional[str] = None
    industry: Optional[str] = None
    location: Optional[str] = None
    company_size: Optional[str] = None
    fit_score: Optional[int] = None
    fit_reason: Optional[str] = None
    status: Optional[str] = None  # NEW, QUALIFIED, UNQUALIFIED, CONTACTED, ARCHIVED


class LeadResponse(LeadBase):
    id: int
    profile_id: Optional[int] = None
    fit_score: Optional[int] = None
    fit_reason: Optional[str] = None
    fit_strengths: Optional[List[str]] = None
    fit_risks: Optional[List[str]] = None
    status: str
    source_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LeadDetailResponse(LeadResponse):
    contacts: List[ContactResponse] = []
    research_records: List[ResearchRecordResponse] = []
    drafts: List[OutreachDraftResponse] = []
    profile: Optional[TargetProfileResponse] = None


class LeadAnalyzeRequest(BaseModel):
    profile_id: Optional[int] = None


class LeadDraftRequest(BaseModel):
    contact_id: Optional[int] = None
    custom_instructions: Optional[str] = None


# ==========================================
# Automation Run Schemas
# ==========================================
class DiscoveryRunCreate(BaseModel):
    profile_id: Optional[int] = None
    industry: Optional[str] = None
    location: Optional[str] = None
    company_size: Optional[str] = None
    criteria: Optional[str] = None
    max_leads: int = Field(default=5, ge=1, le=20)


class DiscoveryRunResponse(BaseModel):
    id: int
    profile_id: Optional[int] = None
    status: str
    leads_discovered: int
    leads_qualified: int
    drafts_generated: int
    error_summary: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ==========================================
# Activity Log Schemas
# ==========================================
class ActivityLogResponse(BaseModel):
    id: int
    run_id: Optional[int] = None
    lead_id: Optional[int] = None
    action: str
    level: str
    details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# Dashboard & Stats Schemas
# ==========================================
class DashboardStatsResponse(BaseModel):
    total_leads: int
    qualified_leads: int
    pending_drafts: int
    approved_drafts: int
    recent_runs: List[DiscoveryRunResponse]
    recent_activities: List[ActivityLogResponse]
