"""LeadFlow AI - SQLAlchemy Database Models"""
from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    JSON,
    Enum,
    Float
)
from sqlalchemy.orm import relationship
from backend.app.database import Base


class TargetProfile(Base):
    __tablename__ = "target_profiles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    industry = Column(String(255), nullable=False)
    location = Column(String(255), nullable=True)
    company_size = Column(String(100), nullable=True)
    criteria = Column(Text, nullable=False)  # Description of ideal fit / pain points
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    leads = relationship("Lead", back_populates="profile", cascade="all, delete-orphan")
    runs = relationship("AutomationRun", back_populates="profile")


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("target_profiles.id", ondelete="SET NULL"), nullable=True)
    company_name = Column(String(255), nullable=False)
    website = Column(String(255), nullable=False, unique=True, index=True)
    industry = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)
    company_size = Column(String(100), nullable=True)
    
    # Qualification results
    fit_score = Column(Integer, nullable=True)  # 0 to 100
    fit_reason = Column(Text, nullable=True)
    fit_strengths = Column(JSON, nullable=True)  # List of positive signals
    fit_risks = Column(JSON, nullable=True)      # List of caveats/disqualifiers
    
    # Status: NEW, QUALIFIED, UNQUALIFIED, CONTACTED, ARCHIVED
    status = Column(String(50), default="NEW", index=True)
    source_url = Column(String(500), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    profile = relationship("TargetProfile", back_populates="leads")
    contacts = relationship("Contact", back_populates="lead", cascade="all, delete-orphan")
    research_records = relationship("ResearchRecord", back_populates="lead", cascade="all, delete-orphan")
    drafts = relationship("OutreachDraft", back_populates="lead", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="lead")


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    job_title = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    # email_status: "verified", "guessed", "unavailable"
    email_status = Column(String(50), default="unverified")
    confidence_score = Column(Integer, nullable=True)  # 0 to 100 confidence
    source_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    lead = relationship("Lead", back_populates="contacts")
    drafts = relationship("OutreachDraft", back_populates="contact")


class ResearchRecord(Base):
    __tablename__ = "research_records"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="CASCADE"), nullable=False)
    summary = Column(Text, nullable=True)
    raw_content = Column(Text, nullable=True)
    source_urls = Column(JSON, nullable=True)
    researched_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    lead = relationship("Lead", back_populates="research_records")


class OutreachDraft(Base):
    __tablename__ = "outreach_drafts"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="CASCADE"), nullable=False)
    contact_id = Column(Integer, ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True)
    subject = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    # status: "DRAFT", "APPROVED", "REJECTED"
    status = Column(String(50), default="DRAFT", index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)

    # Relationships
    lead = relationship("Lead", back_populates="drafts")
    contact = relationship("Contact", back_populates="drafts")


class AutomationRun(Base):
    __tablename__ = "automation_runs"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("target_profiles.id", ondelete="SET NULL"), nullable=True)
    # status: "RUNNING", "COMPLETED", "FAILED"
    status = Column(String(50), default="RUNNING", index=True)
    input_profile = Column(JSON, nullable=True)
    leads_discovered = Column(Integer, default=0)
    leads_qualified = Column(Integer, default=0)
    drafts_generated = Column(Integer, default=0)
    error_summary = Column(Text, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    profile = relationship("TargetProfile", back_populates="runs")
    activity_logs = relationship("ActivityLog", back_populates="run")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("automation_runs.id", ondelete="SET NULL"), nullable=True)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False)
    level = Column(String(20), default="INFO")  # INFO, WARNING, ERROR, SUCCESS
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    run = relationship("AutomationRun", back_populates="activity_logs")
    lead = relationship("Lead", back_populates="activity_logs")
