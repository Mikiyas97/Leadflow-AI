"""
LeadFlow AI - Unit & Integration Tests for FR-09 (Overdue Follow-ups), FR-10 (Schedules), FR-11 (Performance Summaries)
"""
import uuid
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import SessionLocal
from backend.app.models import Lead, OutreachDraft, DiscoverySchedule

client = TestClient(app)


def test_fr09_overdue_followups_identification():
    """FR-09: System identifies overdue follow-ups and exposes them in dashboard and leads API."""
    db = SessionLocal()
    unique_domain = f"overdue-{uuid.uuid4().hex[:8]}.com"
    try:
        past_date = datetime.utcnow() - timedelta(days=2)
        lead = Lead(
            company_name="Overdue Hospitality Corp",
            website=unique_domain,
            location="Addis Ababa, Ethiopia",
            industry="Hospitality",
            fit_score=88,
            status="CONTACTED",
            follow_up_date=past_date,
            follow_up_status="SCHEDULED",
            follow_up_notes="Needs second touchpoint"
        )
        db.add(lead)
        db.commit()
        db.refresh(lead)

        # 1. Check /api/dashboard/stats contains overdue items
        stats_res = client.get("/api/dashboard/stats")
        assert stats_res.status_code == 200
        stats_data = stats_res.json()
        assert stats_data["overdue_followups_count"] >= 1
        matching_in_stats = [l for l in stats_data["overdue_leads"] if l["id"] == lead.id]
        assert len(matching_in_stats) == 1
        assert matching_in_stats[0]["days_overdue"] >= 1

        # 2. Check /api/leads/overdue
        overdue_res = client.get("/api/leads/overdue")
        assert overdue_res.status_code == 200
        overdue_leads = overdue_res.json()
        matching_leads = [l for l in overdue_leads if l["id"] == lead.id]
        assert len(matching_leads) == 1

        # 3. Check /api/leads?is_overdue=true
        filter_res = client.get("/api/leads?is_overdue=true")
        assert filter_res.status_code == 200
        filter_leads = filter_res.json()
        assert any(l["id"] == lead.id for l in filter_leads)

    finally:
        db.close()


def test_fr10_scheduled_discovery_runs():
    """FR-10: System supports scheduled lead discovery runs."""
    # 1. Create a discovery schedule
    schedule_payload = {
        "name": "Daily Addis Ababa Hotel Discovery",
        "interval_hours": 12,
        "industry": "Hospitality / Hotels",
        "location": "Addis Ababa, Ethiopia",
        "criteria": "Hotels in Addis Ababa without an official website",
        "max_leads": 3,
        "is_active": True
    }
    create_res = client.post("/api/schedules", json=schedule_payload)
    assert create_res.status_code == 201
    sched = create_res.json()
    sched_id = sched["id"]
    assert sched["name"] == schedule_payload["name"]
    assert sched["interval_hours"] == 12
    assert sched["is_active"] is True
    assert sched["next_run_at"] is not None

    # 2. List schedules
    list_res = client.get("/api/schedules")
    assert list_res.status_code == 200
    schedules = list_res.json()
    assert any(s["id"] == sched_id for s in schedules)

    # 3. Update schedule (toggle active / interval)
    patch_res = client.patch(f"/api/schedules/{sched_id}", json={"is_active": False, "interval_hours": 6})
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["is_active"] is False
    assert updated["interval_hours"] == 6

    # 4. Trigger schedule run immediately
    trigger_res = client.post(f"/api/schedules/{sched_id}/trigger")
    assert trigger_res.status_code == 200
    trigger_data = trigger_res.json()
    assert trigger_data["success"] is True
    assert "run_id" in trigger_data

    # 5. Clean up delete
    del_res = client.delete(f"/api/schedules/{sched_id}")
    assert del_res.status_code == 204


def test_fr11_performance_summaries():
    """FR-11: System provides performance summaries including leads discovered, qualified, and drafts prepared."""
    stats_res = client.get("/api/dashboard/stats")
    assert stats_res.status_code == 200
    data = stats_res.json()

    assert "performance_summary" in data
    perf = data["performance_summary"]
    assert perf is not None
    assert "total_leads_discovered" in perf
    assert "total_qualified_leads" in perf
    assert "total_drafts_prepared" in perf
    assert "total_approved_drafts" in perf
    assert "total_sent_emails" in perf
    assert "qualification_rate" in perf
    assert isinstance(perf["qualification_rate"], (int, float))
