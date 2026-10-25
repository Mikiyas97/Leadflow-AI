"""LeadFlow AI - End-to-End Workflow Orchestration Engine"""
from datetime import datetime
import logging
from typing import Optional, Dict, Any

from sqlalchemy.orm import Session
from backend.app.database import SessionLocal
from backend.app.models import (
    AutomationRun,
    ActivityLog,
    Lead,
    Contact,
    ResearchRecord,
    OutreachDraft,
    TargetProfile
)
from backend.app.services.discovery_service import discovery_service
from backend.app.services.firecrawl_service import firecrawl_service
from backend.app.services.hunter_service import hunter_service
from backend.app.services.gemini_service import gemini_service
from backend.app.services.pipeline_logger import pipeline_logger

logger = logging.getLogger("leadflow.orchestrator")


async def execute_discovery_run(run_id: int):
    """
    Background worker that runs the full lead generation pipeline:
    Discovery -> Deduplication -> Research -> AI Scoring -> Contact Discovery -> Draft Generation.
    """
    db: Session = SessionLocal()
    try:
        run = db.query(AutomationRun).filter(AutomationRun.id == run_id).first()
        if not run:
            logger.error(f"Run {run_id} not found.")
            return

        run.status = "RUNNING"
        run.started_at = datetime.utcnow()
        db.commit()

        # Log run start
        start_log = ActivityLog(
            run_id=run.id,
            action="RUN_STARTED",
            level="INFO",
            details="Lead discovery and qualification workflow initiated."
        )
        db.add(start_log)
        db.commit()

        # Determine target criteria
        input_data = run.input_profile or {}
        industry = input_data.get("industry")
        location = input_data.get("location")
        company_size = input_data.get("company_size")
        criteria = input_data.get("criteria", "B2B SaaS companies needing sales ops automation")
        max_leads = input_data.get("max_leads", 5)

        if run.profile_id and not criteria:
            profile = db.query(TargetProfile).filter(TargetProfile.id == run.profile_id).first()
            if profile:
                industry = industry or profile.industry
                location = location or profile.location
                company_size = company_size or profile.company_size
                criteria = criteria or profile.criteria

        pipeline_logger.log_start(
            run_id=run.id,
            campaign_name=f"Automated Pipeline #{run.id}",
            target_businesses=[industry] if industry else [],
            location=location or "Global",
            service_offered=criteria or "B2B Outreach",
            decision_makers=[],
            company_size=company_size,
            website_status="Any",
            lead_quantity=max_leads,
            min_qualification_score=65
        )
        pipeline_logger.log_discovery_query(query=industry or "Companies", location=location or "Any", status_filter="Any")

        # Step 1: Discover companies
        candidates = await discovery_service.discover_companies(
            industry=industry,
            location=location,
            company_size=company_size,
            limit=max_leads
        )
        pipeline_logger.log_discovery_results(candidates)

        total_candidates = len(candidates)
        for idx, cand in enumerate(candidates, 1):
            website = cand["website"]
            company_name = cand["company_name"]

            # Deduplication Check (FR-08)
            existing = db.query(Lead).filter(Lead.website == website).first()
            if existing:
                dup_log = ActivityLog(
                    run_id=run.id,
                    lead_id=existing.id,
                    action="DUPLICATE_PREVENTED",
                    level="INFO",
                    details=f"Company '{company_name}' ({website}) already exists in database. Skipped to prevent duplicates."
                )
                db.add(dup_log)
                db.commit()
                continue

            # Create new lead
            lead = Lead(
                profile_id=run.profile_id,
                company_name=company_name,
                website=website,
                industry=cand.get("industry"),
                location=cand.get("location"),
                company_size=cand.get("company_size"),
                status="NEW",
                source_url=cand.get("source_url")
            )
            db.add(lead)
            db.commit()
            db.refresh(lead)
            run.leads_discovered += 1

            db.add(ActivityLog(
                run_id=run.id,
                lead_id=lead.id,
                action="LEAD_DISCOVERED",
                level="INFO",
                details=f"Discovered new prospect '{company_name}' ({website})"
            ))
            db.commit()

            # Step 2: Website Research via Firecrawl / Scraping
            research_res = await firecrawl_service.scrape_company_website(website)
            research_summary = research_res.get("content", f"Company profile for {company_name}")
            
            research_record = ResearchRecord(
                lead_id=lead.id,
                summary=research_res.get("description") or research_res.get("title") or "Website research summary",
                raw_content=research_summary,
                source_urls=research_res.get("source_urls", [f"https://{website}"])
            )
            db.add(research_record)
            db.commit()

            db.add(ActivityLog(
                run_id=run.id,
                lead_id=lead.id,
                action="RESEARCH_COMPLETED",
                level="INFO",
                details=f"Extracted website content ({research_res.get('source', 'web')})"
            ))
            db.commit()

            pipeline_logger.log_website_verification(
                index=idx,
                total=total_candidates,
                company_name=company_name,
                website=website,
                website_status="HAS_OFFICIAL_WEBSITE",
                evidence=research_res.get("description")
            )

            # Step 3: AI Qualification via Gemini
            assessment = gemini_service.analyze_lead_suitability(
                company_name=company_name,
                website=website,
                research_summary=research_summary,
                target_criteria=criteria,
                target_industry=industry
            )

            lead.fit_score = assessment.get("fit_score", 60)
            lead.fit_reason = assessment.get("fit_reason")
            lead.fit_strengths = assessment.get("fit_strengths", [])
            lead.fit_risks = assessment.get("fit_risks", [])
            lead.status = assessment.get("status", "NEW")
            
            if lead.status == "QUALIFIED":
                run.leads_qualified += 1

            db.commit()

            pipeline_logger.log_ai_qualification(
                index=idx,
                total=total_candidates,
                company_name=company_name,
                score=lead.fit_score or 0,
                threshold=65,
                status=lead.status,
                reason=lead.fit_reason,
                strengths=lead.fit_strengths,
                risks=lead.fit_risks
            )

            db.add(ActivityLog(
                run_id=run.id,
                lead_id=lead.id,
                action="LEAD_QUALIFIED" if lead.status == "QUALIFIED" else "LEAD_EVALUATED",
                level="SUCCESS" if lead.status == "QUALIFIED" else "INFO",
                details=f"AI Fit Score: {lead.fit_score}/100. Status: {lead.status}. Reason: {lead.fit_reason[:120]}..."
            ))
            is_qualified = lead.status == "QUALIFIED" and (lead.fit_score or 0) >= 65
            if not is_qualified:
                db.add(ActivityLog(
                    run_id=run.id,
                    lead_id=lead.id,
                    action="OUTREACH_SKIPPED",
                    level="INFO",
                    details=f"Lead '{company_name}' ({lead.fit_score}/100) did not meet qualification threshold. Skipping contact discovery and email drafting."
                ))
                db.commit()
                continue

            # Step 5: Contact Discovery via Hunter.io (Prioritizing Decision-Makers)
            raw_contacts = await hunter_service.search_domain(website, limit=3)

            # If specific contact identified from search / research, use Email Finder
            named_person = cand.get("contact_name")
            if named_person and not any(named_person.lower() in (c.get("name") or "").lower() for c in raw_contacts):
                finder_contact = await hunter_service.find_email(domain=website, full_name=named_person, company=company_name)
                if finder_contact:
                    raw_contacts.insert(0, finder_contact)

            # Check deliverability via Hunter Email Verifier
            for rc in raw_contacts:
                if rc.get("email") and hunter_service.is_configured():
                    verify_res = await hunter_service.verify_email(rc["email"])
                    if verify_res.get("status") in ("deliverable", "risky", "undeliverable"):
                        rc["email_status"] = verify_res["status"]

            saved_contacts = []
            for c in raw_contacts:
                contact = Contact(
                    lead_id=lead.id,
                    name=c["name"],
                    job_title=c.get("job_title"),
                    email=c.get("email"),
                    email_status=c.get("email_status", "unverified"),
                    confidence_score=c.get("confidence_score"),
                    source_url=c.get("source_url")
                )
                db.add(contact)
                saved_contacts.append(contact)

            db.commit()

            pipeline_logger.log_contacts(
                company_name=company_name,
                website=website,
                decision_makers=[],
                contacts=saved_contacts
            )

            db.add(ActivityLog(
                run_id=run.id,
                lead_id=lead.id,
                action="CONTACTS_DISCOVERED",
                level="INFO",
                details=f"Identified {len(saved_contacts)} decision maker(s) via Hunter.io"
            ))
            db.commit()

            # Step 5: Draft Personalized Outreach Email via Gemini
            primary_contact = saved_contacts[0] if saved_contacts else None
            draft_res = gemini_service.generate_outreach_email(
                company_name=company_name,
                website=website,
                research_summary=research_summary,
                target_criteria=criteria,
                contact_name=primary_contact.name if primary_contact else None,
                contact_role=primary_contact.job_title if primary_contact else None
            )

            draft = OutreachDraft(
                lead_id=lead.id,
                contact_id=primary_contact.id if primary_contact else None,
                subject=draft_res["subject"],
                body=draft_res["body"],
                status="DRAFT"  # Requires human review and approval (FR-07)
            )
            db.add(draft)
            run.drafts_generated += 1
            db.commit()

            pipeline_logger.log_outreach_draft(
                company_name=company_name,
                recipient=primary_contact.name if primary_contact else "Decision-Maker",
                subject=draft.subject
            )

            db.add(ActivityLog(
                run_id=run.id,
                lead_id=lead.id,
                action="DRAFT_GENERATED",
                level="SUCCESS",
                details=f"Prepared outreach draft: '{draft.subject}' (Requires human approval)"
            ))
            db.commit()

        # Step 6: Finalize Run
        run.status = "COMPLETED"
        run.completed_at = datetime.utcnow()
        db.commit()

        pipeline_logger.log_finish(
            run_id=run.id,
            total_evaluated=run.leads_discovered,
            qualified_count=run.leads_qualified,
            drafts_count=run.drafts_generated,
            threshold=65
        )

        finish_log = ActivityLog(
            run_id=run.id,
            action="RUN_COMPLETED",
            level="SUCCESS",
            details=f"Completed discovery run. Found {run.leads_discovered} leads, {run.leads_qualified} qualified, {run.drafts_generated} outreach drafts generated."
        )
        db.add(finish_log)
        db.commit()

    except Exception as e:
        logger.error(f"Error executing discovery run {run_id}: {e}", exc_info=True)
        pipeline_logger.log_error(stage="Orchestrator Run", message=str(e))
        if run:
            run.status = "FAILED"
            run.error_summary = str(e)
            run.completed_at = datetime.utcnow()
            db.add(ActivityLog(
                run_id=run.id,
                action="RUN_FAILED",
                level="ERROR",
                details=f"Workflow failed: {str(e)}"
            ))
            db.commit()
    finally:
        db.close()
