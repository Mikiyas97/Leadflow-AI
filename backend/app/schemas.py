"""LeadFlow AI - Pydantic Request & Response Schemas"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


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

    model_config = ConfigDict(from_attributes=True)


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

    model_config = ConfigDict(from_attributes=True)


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

    model_config = ConfigDict(from_attributes=True)


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
    sent_at: Optional[datetime] = None
    send_error: Optional[str] = None
    idempotency_key: Optional[str] = None
    contact: Optional[ContactResponse] = None

    model_config = ConfigDict(from_attributes=True)


class SendDraftEmailRequest(BaseModel):
    recipient_email: Optional[str] = None
    idempotency_key: Optional[str] = None


class TestEmailRequest(BaseModel):
    recipient_email: str


# ==========================================
# Lead Schemas
# ==========================================
class LeadBase(BaseModel):
    company_name: str
    website: str
    industry: Optional[str] = None
    location: Optional[str] = None
    company_size: Optional[str] = None
    website_status: Optional[str] = None


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
    follow_up_date: Optional[datetime] = None
    follow_up_notes: Optional[str] = None
    follow_up_status: Optional[str] = None


class LeadResponse(LeadBase):
    id: int
    profile_id: Optional[int] = None
    fit_score: Optional[int] = None
    fit_reason: Optional[str] = None
    fit_strengths: Optional[List[str]] = None
    fit_risks: Optional[List[str]] = None
    status: str
    source_url: Optional[str] = None
    follow_up_date: Optional[datetime] = None
    follow_up_notes: Optional[str] = None
    follow_up_status: Optional[str] = None
    contacts: List[ContactResponse] = []
    drafts: List[OutreachDraftResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


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

    model_config = ConfigDict(from_attributes=True)


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

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Dashboard & Stats Schemas (FR-09, FR-11)
# ==========================================
class OverdueLeadItem(BaseModel):
    id: int
    company_name: str
    website: str
    location: Optional[str] = None
    industry: Optional[str] = None
    follow_up_date: datetime
    follow_up_notes: Optional[str] = None
    follow_up_status: Optional[str] = None
    days_overdue: int

    model_config = ConfigDict(from_attributes=True)


class PerformanceSummary(BaseModel):
    total_leads_discovered: int
    total_qualified_leads: int
    total_drafts_prepared: int
    total_approved_drafts: int
    total_sent_emails: int
    qualification_rate: float


class DashboardStatsResponse(BaseModel):
    total_leads: int
    qualified_leads: int
    pending_drafts: int
    approved_drafts: int
    overdue_followups_count: int = 0
    total_drafts_prepared: int = 0
    sent_emails: int = 0
    qualification_rate: float = 0.0
    overdue_leads: List[OverdueLeadItem] = []
    performance_summary: Optional[PerformanceSummary] = None
    recent_runs: List[DiscoveryRunResponse]
    recent_activities: List[ActivityLogResponse]


# ==========================================
# Discovery Schedule Schemas (FR-10)
# ==========================================
class DiscoveryScheduleBase(BaseModel):
    name: str
    interval_hours: int = 24
    industry: str
    location: Optional[str] = "United States"
    company_size: Optional[str] = "20-100"
    criteria: str
    max_leads: int = 5
    is_active: bool = True
    profile_id: Optional[int] = None


class DiscoveryScheduleCreate(DiscoveryScheduleBase):
    pass


class DiscoveryScheduleUpdate(BaseModel):
    name: Optional[str] = None
    interval_hours: Optional[int] = None
    industry: Optional[str] = None
    location: Optional[str] = None
    company_size: Optional[str] = None
    criteria: Optional[str] = None
    max_leads: Optional[int] = None
    is_active: Optional[bool] = None


class DiscoveryScheduleResponse(DiscoveryScheduleBase):
    id: int
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Lead Search & Pipeline Execution Schemas
# ==========================================
class PipelineContact(BaseModel):
    id: Optional[int] = None
    name: str
    job_title: Optional[str] = None
    email: Optional[str] = None
    email_status: str = "unverified"
    confidence_score: Optional[int] = None


class PipelineDraft(BaseModel):
    id: int
    subject: str
    body: str
    status: str = "DRAFT"  # DRAFT, APPROVED, SENT, FAILED
    approved_at: Optional[str] = None
    sent_at: Optional[str] = None
    send_error: Optional[str] = None


class PipelineLead(BaseModel):
    id: int
    company_name: str
    website: str
    industry: Optional[str] = None
    location: Optional[str] = None
    company_size: Optional[str] = None
    description: Optional[str] = None
    email_count: Optional[int] = None
    website_status: Optional[str] = "HAS_OFFICIAL_WEBSITE"
    website_evidence: Optional[str] = None
    fit_score: int
    fit_reason: Optional[str] = None
    fit_strengths: List[str] = []
    fit_risks: List[str] = []
    qualification_status: str = "QUALIFIED"  # QUALIFIED, UNQUALIFIED, REJECTED_MISMATCH
    research_summary: Optional[str] = None
    contacts: List[PipelineContact] = []
    draft: Optional[PipelineDraft] = None
    follow_up_date: Optional[str] = None
    follow_up_notes: Optional[str] = None
    follow_up_status: Optional[str] = None


class LeadSearchRequest(BaseModel):
    campaign_name: Optional[str] = Field(None, description="Campaign or search persona name")
    target_business: List[str] = Field(default_factory=list, description="Target business types or industries (e.g. ['Hotels'])")
    service_offered: str = Field(default="General B2B Services", description="Service or value proposition offered (e.g. Website development)")
    location: str = Field(..., description="Target geographical location (e.g. Addis Ababa, Ethiopia)")
    decision_makers: List[str] = Field(default_factory=list, description="Target decision-maker roles (e.g. ['Owner', 'General Manager'])")
    company_size: Optional[str] = Field(default="Any", description="Optional company size filter (default: Any)")
    website_status: str = Field(default="Any", description="Website status filter: Missing, Outdated, Missing or Outdated, Any")
    lead_quantity: int = Field(default=10, ge=1, le=25, description="Number of leads to return (1-25)")
    min_qualification_score: int = Field(default=60, ge=0, le=100, description="Minimum score threshold (0-100)")


class LeadSearchResponse(BaseModel):
    campaign_name: Optional[str] = None
    pipeline_leads: List[PipelineLead]
    qualified_count: int
    total_candidates: int
    min_qualification_score: int
    search_summary: str
    run_id: Optional[int] = None
    logs: List[ActivityLogResponse] = []


