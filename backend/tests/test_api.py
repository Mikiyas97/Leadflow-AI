"""LeadFlow AI - Backend API Unit & Integration Tests"""
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "database" in data


def test_create_and_list_target_profile():
    payload = {
        "name": "Seed Stage AI Startups",
        "industry": "Artificial Intelligence",
        "location": "North America",
        "company_size": "10-50",
        "criteria": "Startups using LLMs needing sales automation"
    }
    create_res = client.post("/api/target-profiles", json=payload)
    assert create_res.status_code == 201
    profile = create_res.json()
    assert profile["name"] == payload["name"]
    assert profile["id"] is not None

    list_res = client.get("/api/target-profiles")
    assert list_res.status_code == 200
    profiles = list_res.json()
    assert len(profiles) >= 1


def test_dashboard_stats():
    response = client.get("/api/dashboard/stats")
    assert response.status_code == 200
    stats = response.json()
    assert "total_leads" in stats
    assert "qualified_leads" in stats
    assert "pending_drafts" in stats
    assert "approved_drafts" in stats


def test_draft_approval_workflow():
    # Verify draft endpoints with mock or existing draft
    drafts_res = client.get("/api/drafts")
    assert drafts_res.status_code == 200
    drafts = drafts_res.json()
    if drafts:
        draft_id = drafts[0]["id"]
        approve_res = client.post(f"/api/drafts/{draft_id}/approve")
        assert approve_res.status_code == 200
        assert approve_res.json()["status"] == "APPROVED"
