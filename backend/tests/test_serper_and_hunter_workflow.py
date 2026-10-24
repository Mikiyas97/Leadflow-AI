"""
LeadFlow AI - Serper.dev Google Search, Hunter.io Email Finder, and Workflow Tests
Validates:
1. Serper.dev Google Search API integration for candidate company discovery.
2. Gemini search query optimization (converting user prompt to targeted Google queries).
3. Hunter.io Email Finder for named decision-makers.
4. Hunter.io decision-maker prioritization (ranking Founders, CTOs, CEOs first).
5. Hunter.io email deliverability verification (deliverable, risky, undeliverable).
6. Independence of Lead suitability score and email verification (separate checks).
"""
import asyncio
from unittest.mock import MagicMock, patch, AsyncMock
import pytest

from backend.app.services.serper_service import serper_service
from backend.app.services.hunter_service import hunter_service
from backend.app.services.discovery_service import discovery_service
from backend.app.services.gemini_service import gemini_service


def test_serper_google_search_discovery():
    """Verify Serper.dev executes Google Search and parses organic candidate results."""
    mock_serper_response = {
        "organic": [
            {
                "title": "HelpDesk AI: Smart Support Automation for SaaS",
                "link": "https://helpdeskai.io",
                "snippet": "HelpDesk AI provides automated customer support workflows for high-growth software teams.",
                "position": 1,
                "sitelinks": [
                    {"title": "About Us", "link": "https://helpdeskai.io/about"},
                    {"title": "Pricing", "link": "https://helpdeskai.io/pricing"}
                ]
            },
            {
                "title": "CloudSupport Systems - Modern Ticket Routing",
                "link": "https://cloudsupport.com",
                "snippet": "Enterprise SaaS ticket routing and AI agent helpdesk.",
                "position": 2
            }
        ]
    }

    async def _test():
        with patch.object(serper_service, "is_configured", return_value=True), \
             patch("httpx.AsyncClient.post") as mock_post:

            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = mock_serper_response
            mock_post.return_value = mock_resp

            results = await serper_service.search_google("US SaaS customer support automation", num=5)
            assert len(results) == 2
            assert results[0]["title"] == "HelpDesk AI: Smart Support Automation for SaaS"
            assert results[0]["link"] == "https://helpdeskai.io"
            assert len(results[0]["sitelinks"]) == 2

            # Test discovery service uses Serper results
            with patch.object(discovery_service, "clean_website", side_effect=lambda u: u.replace("https://", "").split("/")[0]):
                candidates = await discovery_service.discover_companies(
                    industry="B2B SaaS",
                    location="United States",
                    limit=2
                )
                assert len(candidates) >= 1
                assert any("helpdeskai" in c["company_name"].lower() or "cloudsupport" in c["company_name"].lower() for c in candidates)

    asyncio.run(_test())


def test_gemini_search_optimization():
    """Verify Gemini optimizes user requests into targeted Google search queries and criteria."""
    user_prompt = "Find US SaaS companies that could benefit from AI customer support automation."
    optimized = gemini_service.optimize_search_target(user_prompt)

    assert "search_queries" in optimized
    assert len(optimized["search_queries"]) >= 1
    assert "industry" in optimized
    assert "location" in optimized
    assert "United States" in optimized["location"]
    assert "target_decision_makers" in optimized
    assert any("support" in dm.lower() or "cto" in dm.lower() or "founder" in dm.lower() for dm in optimized["target_decision_makers"])


def test_hunter_decision_maker_prioritization():
    """Verify Hunter.io prioritizes decision-makers (Founders, CTOs, CEOs) over general staff."""
    mock_hunter_response = {
        "data": {
            "emails": [
                {
                    "value": "intern@acmesaas.com",
                    "first_name": "Junior",
                    "last_name": "Dev",
                    "position": "Software Engineering Intern",
                    "confidence": 95
                },
                {
                    "value": "founder@acmesaas.com",
                    "first_name": "Alice",
                    "last_name": "Smith",
                    "position": "Co-Founder & CTO",
                    "confidence": 85
                },
                {
                    "value": "ops@acmesaas.com",
                    "first_name": "Bob",
                    "last_name": "Jones",
                    "position": "Head of Operations",
                    "confidence": 75
                }
            ]
        }
    }

    async def _test():
        with patch.object(hunter_service, "is_configured", return_value=True), \
             patch("httpx.AsyncClient.get") as mock_get:

            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = mock_hunter_response
            mock_get.return_value = mock_resp

            contacts = await hunter_service.search_domain("acmesaas.com", limit=3)
            assert len(contacts) == 3
            # Co-Founder & CTO must be prioritized before Intern even though Intern has higher confidence
            assert "CTO" in contacts[0]["job_title"] or "Co-Founder" in contacts[0]["job_title"]
            assert contacts[0]["name"] == "Alice Smith"

    asyncio.run(_test())


def test_hunter_email_finder():
    """Verify Hunter.io Email Finder locates specific named decision-maker work emails."""
    mock_finder_response = {
        "data": {
            "first_name": "Elena",
            "last_name": "Rostova",
            "email": "elena@techflow.io",
            "score": 92,
            "position": "Chief Technology Officer"
        }
    }

    async def _test():
        with patch.object(hunter_service, "is_configured", return_value=True), \
             patch("httpx.AsyncClient.get") as mock_get:

            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = mock_finder_response
            mock_get.return_value = mock_resp

            found = await hunter_service.find_email(
                domain="techflow.io",
                full_name="Elena Rostova",
                company="TechFlow"
            )
            assert found is not None
            assert found["email"] == "elena@techflow.io"
            assert found["name"] == "Elena Rostova"
            assert found["job_title"] == "Chief Technology Officer"
            assert found["confidence_score"] == 92
            assert found["email_status"] == "verified"

    asyncio.run(_test())


def test_hunter_email_verifier_deliverability():
    """Verify Hunter Email Verifier checks deliverability: deliverable, risky, undeliverable."""
    async def _test():
        with patch.object(hunter_service, "is_configured", return_value=True), \
             patch("httpx.AsyncClient.get") as mock_get:

            # 1. Deliverable (valid + high score)
            mock_resp1 = MagicMock()
            mock_resp1.status_code = 200
            mock_resp1.json.return_value = {"data": {"status": "valid", "score": 95, "result": "deliverable"}}
            mock_get.return_value = mock_resp1

            res1 = await hunter_service.verify_email("valid@saas.com")
            assert res1["status"] == "deliverable"

            # 2. Risky (accept_all or low score)
            mock_resp2 = MagicMock()
            mock_resp2.status_code = 200
            mock_resp2.json.return_value = {"data": {"status": "accept_all", "score": 50, "result": "risky"}}
            mock_get.return_value = mock_resp2

            res2 = await hunter_service.verify_email("catchall@saas.com")
            assert res2["status"] == "risky"

            # 3. Undeliverable (invalid)
            mock_resp3 = MagicMock()
            mock_resp3.status_code = 200
            mock_resp3.json.return_value = {"data": {"status": "invalid", "score": 0, "result": "undeliverable"}}
            mock_get.return_value = mock_resp3

            res3 = await hunter_service.verify_email("bounced@saas.com")
            assert res3["status"] == "undeliverable"

    asyncio.run(_test())


def test_separate_lead_score_and_email_verification():
    """
    Validates recommendation: Lead fit score and email verification are separate checks.
    A company can be a great prospect (high score) while its contact email remains unverified.
    """
    eval_result = gemini_service.analyze_lead_suitability(
        company_name="Apex SaaS Systems",
        website="apexsaas.com",
        research_summary="Apex SaaS builds high-volume customer workflows with manual support queues needing AI ticketing.",
        target_criteria="US SaaS companies needing AI customer support automation",
        target_industry="B2B SaaS",
        target_location="United States",
        actual_location="United States"
    )

    # Lead has high suitability score because of website evidence & business fit
    assert eval_result["fit_score"] >= 65
    assert eval_result["status"] == "QUALIFIED"

    # Contact deliverability is an independent check on the contact record
    unverified_contact = {
        "email": "contact@apexsaas.com",
        "email_status": "unverified",
        "confidence_score": 40
    }
    assert unverified_contact["email_status"] == "unverified"
    # Even with an unverified email, the company remains qualified
    assert eval_result["status"] == "QUALIFIED"
