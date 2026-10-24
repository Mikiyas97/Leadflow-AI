"""
LeadFlow AI - Comprehensive Acceptance Tests & Gmail SMTP Integration Tests
Covers:
- Acceptance Tests A through F
- SMTP configuration validation
- Mocked SMTP send handling (STARTTLS & SSL)
- SMTP authentication failure handling
- SMTP rejected recipient handling
- Idempotency & duplicate send prevention
- Follow-up conditional scheduling (only after confirmed send)
- Hunter.io zero fake contacts enforcement
"""
import uuid
import pytest
from unittest.mock import MagicMock, patch, AsyncMock
import smtplib
from datetime import datetime, timezone

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.email_service import EmailService
from backend.app.services.discovery_service import discovery_service
from backend.app.services.gemini_service import gemini_service
from backend.app.services.firecrawl_service import firecrawl_service
from backend.app.services.hunter_service import hunter_service
from backend.app.database import SessionLocal
from backend.app.models import Lead, OutreachDraft

client = TestClient(app)


# ---------------------------------------------------------------------------
# Acceptance Test A: Exact Criteria & Website Investigation for Addis Ababa
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_acceptance_a_hotels_addis_ababa_website_investigation():
    query = "Find 5 hotels in Addis Ababa without an official website and draft website-development emails"
    parsed = discovery_service.parse_search_query(query)

    # 1. Preserves Addis Ababa / Ethiopia location (never reverts to US)
    assert "Addis Ababa" in parsed["location"] or "Ethiopia" in parsed["location"]
    assert "United States" not in parsed["location"]
    assert parsed["target_quantity"] == 5
    assert parsed["require_no_website"] is True
    assert "Website" in parsed["service_offered"]

    # 2. Investigates official website status with evidence (Mocked search for deterministic testing)
    with patch.object(firecrawl_service, "search_web", new_callable=AsyncMock) as mock_search:
        # Candidate with directory listings only
        mock_search.return_value = [
            {"url": "https://www.tripadvisor.com/Hotel_Review-g293791-d12345-Addis.html", "title": "Bole Ambassador Hotel - TripAdvisor"},
            {"url": "https://www.facebook.com/boleambassador", "title": "Bole Ambassador Hotel Facebook"}
        ]
        result_with_dirs = await firecrawl_service.investigate_official_website(
            company_name="Bole Ambassador Hotel",
            location="Addis Ababa, Ethiopia",
            initial_url="https://facebook.com/boleambassador"
        )
        assert result_with_dirs["website_status"] == "NO_OFFICIAL_WEBSITE_FOUND"
        assert "tripadvisor.com" in result_with_dirs["evidence"].lower() or "facebook.com" in result_with_dirs["evidence"].lower()

        # Candidate with dedicated official domain
        mock_search.return_value = [
            {"url": "https://sheratonaddis.com/en-us", "title": "Sheraton Addis Official Hotel Site"}
        ]
        result_official = await firecrawl_service.investigate_official_website(
            company_name="Sheraton Addis",
            location="Addis Ababa, Ethiopia",
            initial_url=None
        )
        assert result_official["website_status"] == "HAS_OFFICIAL_WEBSITE"


# ---------------------------------------------------------------------------
# Acceptance Test B: Strict Ethiopian SaaS Criteria (No US bleed)
# ---------------------------------------------------------------------------
def test_acceptance_b_ethiopian_saas_location_preservation():
    query = "Find Ethiopian SaaS companies that may need AI automation"
    parsed = discovery_service.parse_search_query(query)

    assert parsed["location"] == "Ethiopia"
    assert "SaaS" in parsed["industry"]

    # Verify Gate 1 excludes a US company from Ethiopian results
    eval_result = gemini_service.analyze_lead_suitability(
        company_name="Zapier Inc",
        website="zapier.com",
        research_summary="Workflow automation platform based in San Francisco, CA.",
        target_criteria="Ethiopian SaaS companies that may need AI automation",
        target_industry="SaaS",
        target_location="Ethiopia",
        actual_location="San Francisco, CA, United States",
        service_offered="AI Automation"
    )
    assert eval_result["is_qualified"] is False
    assert eval_result["status"] in ["REJECTED_MISMATCH", "UNQUALIFIED"]
    assert eval_result["fit_score"] < 65


# ---------------------------------------------------------------------------
# Acceptance Test C: Gate 1 & Gate 2 Disqualification (Low Score Lead)
# ---------------------------------------------------------------------------
def test_acceptance_c_disqualified_lead_scores_under_threshold():
    eval_result = gemini_service.analyze_lead_suitability(
        company_name="Global Heavy Industrial",
        website="heavyindustry.com",
        research_summary="Heavy mining equipment and oil drilling supply.",
        target_criteria="B2B SaaS companies needing sales automation",
        target_industry="SaaS",
        target_location="United States",
        actual_location="United States",
        service_offered="Sales Automation"
    )
    assert eval_result["is_qualified"] is False
    assert eval_result["fit_score"] < 65
    assert eval_result["status"] == "UNQUALIFIED"


# ---------------------------------------------------------------------------
# Acceptance Test D: Hunter.io Returns Zero Fake Contacts
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_acceptance_d_hunter_returns_no_fake_contacts():
    with patch.object(hunter_service, "is_configured", return_value=False):
        contacts = await hunter_service.search_domain("some-nonexistent-domain.com")
        assert len(contacts) == 0

    with patch("httpx.AsyncClient.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "data": {
                "emails": [
                    {
                        "value": "lowconf@example.com",
                        "first_name": "Low",
                        "last_name": "Confidence",
                        "confidence": 45
                    }
                ]
            }
        }
        mock_get.return_value = mock_resp
        with patch.object(hunter_service, "is_configured", return_value=True):
            contacts = await hunter_service.search_domain("example.com")
            assert len(contacts) == 1
            assert contacts[0]["email_status"] == "unverified"
            assert contacts[0]["name"] != "Sarah Jenkins"


# ---------------------------------------------------------------------------
# Acceptance Test E: Follow-up is None until Email is Confirmed Sent
# ---------------------------------------------------------------------------
def test_acceptance_e_follow_up_null_until_email_sent():
    db = SessionLocal()
    unique_domain = f"testlead-{uuid.uuid4().hex[:8]}.com"
    try:
        lead = Lead(
            company_name="Test Automation Lead",
            website=unique_domain,
            location="United States",
            industry="SaaS",
            fit_score=85,
            status="NEW",
            follow_up_date=None,  # Must start as None
            follow_up_status=None
        )
        db.add(lead)
        db.commit()
        db.refresh(lead)

        draft = OutreachDraft(
            lead_id=lead.id,
            subject="Personalized AI Demo",
            body="Hello, saw your impressive scaling.",
            status="DRAFT"
        )
        db.add(draft)
        db.commit()
        db.refresh(draft)

        # Before send: follow_up_date must be strictly None
        assert lead.follow_up_date is None

        # Approving draft still must NOT schedule follow-up
        approve_res = client.post(f"/api/drafts/{draft.id}/approve")
        assert approve_res.status_code == 200

        db.refresh(lead)
        assert lead.follow_up_date is None

        # Now mock SMTP and execute send
        with patch("smtplib.SMTP") as mock_smtp:
            instance = mock_smtp.return_value
            instance.ehlo.return_value = None
            instance.starttls.return_value = None
            instance.login.return_value = None
            instance.send_message.return_value = {}  # Empty dict = 0 refused recipients

            with patch.object(EmailService, "is_configured", return_value=True):
                send_res = client.post(
                    f"/api/drafts/{draft.id}/send",
                    json={
                        "recipient_email": f"founder@{unique_domain}",
                        "idempotency_key": f"test-key-{draft.id}"
                    }
                )
                assert send_res.status_code == 200
                send_data = send_res.json()
                assert send_data["success"] is True
                assert send_data["status"] == "SENT"
                assert send_data["follow_up_date"] is not None

        # After send: follow_up_date is now scheduled
        db.refresh(lead)
        assert lead.follow_up_date is not None
        assert lead.follow_up_status == "SCHEDULED"

    finally:
        db.close()


# ---------------------------------------------------------------------------
# Acceptance Test F: Truthful Zero Qualified Leads Reporting
# ---------------------------------------------------------------------------
def test_acceptance_f_zero_qualified_reporting():
    with patch("backend.app.services.discovery_service.DiscoveryService.discover_companies", new_callable=AsyncMock) as mock_discover:
        # Returns candidate that fails gate 1
        mock_discover.return_value = [
            {
                "company_name": "Unrelated Firm",
                "website": f"unrelated-{uuid.uuid4().hex[:8]}.com",
                "location": "Antarctica",
                "industry": "Mining",
                "description": "Antarctic ice mining research",
                "website_status": "HAS_OFFICIAL_WEBSITE"
            }
        ]

        chat_payload = {
            "messages": [
                {"role": "user", "content": "Find 5 SaaS companies in Ethiopia that need AI automation"}
            ]
        }
        res = client.post("/api/chat", json=chat_payload)
        assert res.status_code == 200
        data = res.json()

        assert data["qualified_count"] == 0
        assert "0 qualified leads" in data["content"] or "0 qualified" in data["content"]


# ---------------------------------------------------------------------------
# SMTP Service Unit Tests (Validation, STARTTLS, Auth Failure, Idempotency)
# ---------------------------------------------------------------------------
def test_smtp_recipient_validation():
    svc = EmailService(username="test@gmail.com", password="app-password")
    assert svc.validate_email_address("valid.user@example.com") is True
    assert svc.validate_email_address("invalid-email") is False
    assert svc.validate_email_address("") is False

    res_invalid = svc.send_outreach_email("bad-email", "Subj", "Body")
    assert res_invalid["success"] is False
    assert res_invalid["status"] == "INVALID_RECIPIENT"


def test_smtp_missing_fields_validation():
    svc = EmailService(username="test@gmail.com", password="app-password")
    res_subj = svc.send_outreach_email("test@example.com", "", "Body")
    assert res_subj["success"] is False
    assert res_subj["status"] == "MISSING_SUBJECT"

    res_body = svc.send_outreach_email("test@example.com", "Subj", "   ")
    assert res_body["success"] is False
    assert res_body["status"] == "MISSING_BODY"


def test_smtp_unconfigured_credentials():
    svc = EmailService(username="", password="")
    res = svc.send_outreach_email("test@example.com", "Subj", "Body")
    assert res["success"] is False
    assert res["status"] == "NOT_CONFIGURED"


def test_smtp_auth_failure_sanitized():
    svc = EmailService(
        smtp_host="smtp.gmail.com",
        smtp_port=587,
        username="test@gmail.com",
        password="bad-password"
    )
    with patch("smtplib.SMTP") as mock_smtp:
        instance = mock_smtp.return_value
        instance.login.side_effect = smtplib.SMTPAuthenticationError(535, b"5.7.8 Username and Password not accepted")

        res = svc.send_outreach_email("recipient@example.com", "Hello", "Demo text")
        assert res["success"] is False
        assert res["status"] == "AUTHENTICATION_FAILED"
        # Never expose password in error
        assert "bad-password" not in res["error"]
        assert "Google App Password" in res["error"]


def test_smtp_rejected_recipient():
    svc = EmailService(
        smtp_host="smtp.gmail.com",
        smtp_port=587,
        username="test@gmail.com",
        password="good-password"
    )
    with patch("smtplib.SMTP") as mock_smtp:
        instance = mock_smtp.return_value
        # smtplib.send_message returns a dict of refused recipients
        instance.send_message.return_value = {"bad_recipient@example.com": (550, b"User not found")}

        res = svc.send_outreach_email("bad_recipient@example.com", "Hello", "Demo text")
        assert res["success"] is False
        assert res["status"] == "RECIPIENTS_REFUSED"


def test_smtp_duplicate_send_prevention():
    db = SessionLocal()
    unique_domain = f"dup-{uuid.uuid4().hex[:8]}.com"
    try:
        lead = Lead(
            company_name="Duplicate Prevention Co",
            website=unique_domain,
            location="US",
            industry="SaaS",
            fit_score=90
        )
        db.add(lead)
        db.commit()

        draft = OutreachDraft(
            lead_id=lead.id,
            subject="Outreach Subject",
            body="Outreach Body",
            status="SENT",
            sent_at=datetime.now(timezone.utc)
        )
        db.add(draft)
        db.commit()

        # Attempt to send again must trigger 409 Conflict
        res = client.post(
            f"/api/drafts/{draft.id}/send",
            json={"recipient_email": f"lead@{unique_domain}"}
        )
        assert res.status_code == 409
        assert "already sent" in res.json()["detail"].lower()
    finally:
        db.close()


def test_smtp_test_email_endpoint():
    with patch.object(EmailService, "send_test_email") as mock_send_test:
        mock_send_test.return_value = {
            "success": True,
            "message": "Test email successfully accepted by Gmail SMTP for delivery to tester@example.com."
        }
        res = client.post(
            "/api/drafts/test-email",
            json={"recipient_email": "tester@example.com"}
        )
        assert res.status_code == 200
        assert res.json()["success"] is True
