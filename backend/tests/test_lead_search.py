"""Tests for Lead Search API, Criteria Validation, and Lead Pipeline Processing."""
import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_lead_search_schema_validation():
    """Verify LeadSearchRequest validation rules: lead_quantity (1-25), score (0-100), optional company size."""
    # 1. Missing required location
    res_no_loc = client.post("/api/leads/search", json={
        "target_business": ["Hotels"],
        "service_offered": "Website development"
    })
    assert res_no_loc.status_code == 422

    # 2. Lead quantity < 1
    res_qty_low = client.post("/api/leads/search", json={
        "target_business": ["Hotels"],
        "location": "Addis Ababa, Ethiopia",
        "lead_quantity": 0
    })
    assert res_qty_low.status_code == 422

    # 3. Lead quantity > 25
    res_qty_high = client.post("/api/leads/search", json={
        "target_business": ["Hotels"],
        "location": "Addis Ababa, Ethiopia",
        "lead_quantity": 26
    })
    assert res_qty_high.status_code == 422

    # 4. Score < 0
    res_score_low = client.post("/api/leads/search", json={
        "target_business": ["Hotels"],
        "location": "Addis Ababa, Ethiopia",
        "min_qualification_score": -1
    })
    assert res_score_low.status_code == 422

    # 5. Score > 100
    res_score_high = client.post("/api/leads/search", json={
        "target_business": ["Hotels"],
        "location": "Addis Ababa, Ethiopia",
        "min_qualification_score": 105
    })
    assert res_score_high.status_code == 422


@patch("backend.app.routes.leads.gemini_service")
@patch("backend.app.routes.leads.firecrawl_service")
@patch("backend.app.routes.leads.hunter_service")
@patch("backend.app.routes.leads.discovery_service")
def test_lead_search_flow_and_thresholding(mock_discovery, mock_hunter, mock_firecrawl, mock_gemini):
    """Verify search respects quantity limit and clearly distinguishes qualified from unqualified leads."""
    candidates_list = [
        {
            "company_name": "Addis Regency Hotel",
            "website": "addisregency.com",
            "industry": "Hotels",
            "location": "Addis Ababa, Ethiopia",
            "company_size": "25 - 100",
            "source_url": "https://addisregency.com",
            "website_status": "OUTDATED_WEBSITE",
            "website_evidence": "Legacy copyright year 2018 detected.",
            "description": "Boutique hotel in central Addis Ababa."
        },
        {
            "company_name": "Lucy Guesthouse",
            "website": "tripadvisor.com/lucy_guesthouse",
            "industry": "Hotels",
            "location": "Addis Ababa, Ethiopia",
            "company_size": "1 - 25",
            "source_url": "https://tripadvisor.com/lucy_guesthouse",
            "website_status": "NO_OFFICIAL_WEBSITE_FOUND",
            "website_evidence": "Only directory listings found on TripAdvisor.",
            "description": "Small guest house with listing only."
        },
        {
            "company_name": "Unrelated Firm",
            "website": "unrelatedfirm.com",
            "industry": "Consulting",
            "location": "Addis Ababa, Ethiopia",
            "company_size": "500+",
            "source_url": "https://unrelatedfirm.com",
            "website_status": "HAS_OFFICIAL_WEBSITE",
            "website_evidence": "Active modern corporate website.",
            "description": "Consulting firm not matching hotel need."
        }
    ]

    mock_discovery.discover_companies = AsyncMock(return_value=candidates_list)
    mock_firecrawl.scrape_company_website = AsyncMock(return_value={
        "content": "Website research content",
        "title": "Hotel Page",
        "description": "Evidence from web page"
    })

    # Mock Hunter async functions
    mock_hunter.search_domain = AsyncMock(return_value=[
        {"name": "Abebe Bekele", "job_title": "General Manager", "email": "abebe@addisregency.com", "confidence_score": 92}
    ])
    mock_hunter.find_email = AsyncMock(return_value=None)
    mock_hunter.verify_email = AsyncMock(return_value={"status": "deliverable"})
    mock_hunter.is_configured.return_value = True

    # Mock Gemini qualification analysis: 1 qualifies high, 1 qualifies medium, 1 fails threshold
    def fake_qualification(company_name, **kwargs):
        min_score = kwargs.get("min_qualification_score", 60)
        if "Addis Regency" in company_name:
            return {
                "fit_score": 85,
                "status": "QUALIFIED",
                "fit_reason": "Outdated website in target location with high value potential.",
                "fit_strengths": ["Central location", "Outdated web presence"],
                "fit_risks": []
            }
        elif "Lucy" in company_name:
            return {
                "fit_score": 75,
                "status": "QUALIFIED",
                "fit_reason": "No standalone website found, ideal candidate for website development.",
                "fit_strengths": ["Missing website", "Direct match"],
                "fit_risks": ["Small operation"]
            }
        else:
            return {
                "fit_score": 40,
                "status": "UNQUALIFIED",
                "fit_reason": "Industry mismatch and score below threshold.",
                "fit_strengths": [],
                "fit_risks": ["Not in hotel industry"]
            }

    mock_gemini.analyze_lead_suitability.side_effect = fake_qualification
    mock_gemini.generate_outreach_email.return_value = {
        "subject": "Modern website proposal",
        "body": "Hi, we can modernize your hotel website."
    }

    payload = {
        "campaign_name": "Addis Hotel Website Leads",
        "target_business": ["Hotels"],
        "service_offered": "Website development",
        "location": "Addis Ababa, Ethiopia",
        "decision_makers": ["Owner", "General Manager"],
        "company_size": "Any",
        "website_status": "Missing or Outdated",
        "lead_quantity": 2,  # Requesting at most 2 leads
        "min_qualification_score": 60
    }

    response = client.post("/api/leads/search", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["campaign_name"] == "Addis Hotel Website Leads"
    # Strict limit check: Requested 2 leads, should return at most 2
    assert len(data["pipeline_leads"]) <= 2

    # Check qualified count distinguishes leads meeting threshold
    assert data["qualified_count"] >= 1
    assert data["min_qualification_score"] == 60

    # Verify detailed pipeline activity logs
    assert "logs" in data
    assert len(data["logs"]) >= 4
    log_actions = [log["action"] for log in data["logs"]]
    assert "SEARCH_INITIATED" in log_actions
    assert "DISCOVERY_QUERY" in log_actions
    assert "PIPELINE_COMPLETED" in log_actions


@patch("backend.app.routes.leads.gemini_service")
@patch("backend.app.routes.leads.firecrawl_service")
@patch("backend.app.routes.leads.hunter_service")
@patch("backend.app.routes.leads.discovery_service")
def test_lead_search_unqualified_threshold(mock_discovery, mock_hunter, mock_firecrawl, mock_gemini):
    """Verify that when a lead scores below min_qualification_score, it is marked UNQUALIFIED."""
    mock_discovery.discover_companies = AsyncMock(return_value=[
        {
            "company_name": "Low Fit Enterprise",
            "website": "lowfitenterprise.com",
            "industry": "Retail",
            "location": "Addis Ababa, Ethiopia",
            "company_size": "50 - 100",
            "source_url": "https://lowfitenterprise.com",
            "website_status": "HAS_OFFICIAL_WEBSITE",
            "website_evidence": "Modern website found.",
            "description": "Retail store."
        }
    ])

    mock_firecrawl.scrape_company_website = AsyncMock(return_value={
        "content": "Modern website content",
        "title": "Low Fit",
        "description": "Updated 2026."
    })

    # Score 50 is below threshold of 75
    mock_gemini.analyze_lead_suitability.return_value = {
        "fit_score": 50,
        "status": "UNQUALIFIED",
        "fit_reason": "Below user minimum threshold.",
        "fit_strengths": [],
        "fit_risks": ["Modern site exists"]
    }

    payload = {
        "target_business": ["Hotels"],
        "service_offered": "Website development",
        "location": "Addis Ababa, Ethiopia",
        "lead_quantity": 5,
        "min_qualification_score": 75
    }

    response = client.post("/api/leads/search", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["qualified_count"] == 0
    assert len(data["pipeline_leads"]) == 1
    assert data["pipeline_leads"][0]["qualification_status"] == "UNQUALIFIED"
    assert data["pipeline_leads"][0]["fit_score"] == 50


def test_article_and_blog_rejection_as_company():
    """Verify that blog headlines, listicles, and publishers are strictly rejected as companies."""
    from backend.app.services.discovery_service import discovery_service
    from backend.app.services.gemini_service import gemini_service

    # 1. Headline & listicle titles must be marked invalid
    invalid_titles = [
        "Top Fintech Startups in Ethiopia",
        "10 Best Hotels in Addis Ababa",
        "List of Software Companies in Kenya",
        "Startups in Africa",
        "Fintech Startups in Ethiopia",
        "Ethiopia's Financial Landscape is Evolving",
        "FasterCapital",
        "Medium",
        "Tripadvisor"
    ]
    for title in invalid_titles:
        assert discovery_service.is_valid_company_name(title) is False, f"Expected '{title}' to be invalid"
        assert gemini_service._is_valid_company_name(title) is False, f"Expected '{title}' to be invalid in gemini_service"

    # 2. Legitimate commercial company names must be valid
    valid_names = [
        "Chapa",
        "Chapa Financial Technologies",
        "ArifPay",
        "SantimPay",
        "Kifiya Financial Technology",
        "Ghion Hotel",
        "Soramba Hotel",
        "Linear",
        "Zalatechs"
    ]
    for name in valid_names:
        assert discovery_service.is_valid_company_name(name) is True, f"Expected '{name}' to be valid"
        assert gemini_service._is_valid_company_name(name) is True, f"Expected '{name}' to be valid in gemini_service"

    # 3. Blog & article search results must be flagged by _is_article_or_directory_result
    assert discovery_service._is_article_or_directory_result(
        title="Top Fintech Startups in Ethiopia",
        url="https://fastercapital.com/top-fintech-startups-in-ethiopia.html"
    ) is True

    assert discovery_service._is_article_or_directory_result(
        title="Chapa | Online Payment Gateway for Ethiopia",
        url="https://chapa.co"
    ) is False

    # 4. Gemini Suitability Gate 0 must immediately disqualify article titles
    eval_res = gemini_service.analyze_lead_suitability(
        company_name="Top Fintech Startups in Ethiopia",
        website="fastercapital.com",
        research_summary="Ethiopia's financial landscape is evolving at unprecedented speed...",
        target_criteria="FinTech in Ethiopia",
        target_industry="FinTech",
        target_location="Ethiopia"
    )
    assert eval_res["is_qualified"] is False
    assert eval_res["status"] == "DISQUALIFIED"
    assert eval_res["fit_score"] == 0
    assert "not an individual operating commercial enterprise" in eval_res["fit_reason"]


def test_article_company_extraction():
    """Verify that companies mentioned inside an article are extracted as individual entities."""
    from backend.app.services.gemini_service import gemini_service

    article_title = "Top Fintech Startups in Ethiopia"
    article_text = (
        "Ethiopia's financial landscape is evolving at unprecedented speed. "
        "Key players transforming digital finance include: "
        "1. Chapa: A modern payment gateway allowing businesses to accept payments. "
        "2. ArifPay: A licensed mPOS and payment solutions provider. "
        "3. SantimPay: Omnichannel digital payments platform."
    )

    extracted = gemini_service.extract_companies_from_article(
        title=article_title,
        content=article_text,
        industry="FinTech",
        location="Ethiopia"
    )

    assert len(extracted) >= 2
    comp_names = [e["company_name"].lower() for e in extracted]
    assert any("chapa" in c for c in comp_names)
    assert any("arifpay" in c for c in comp_names)
    assert "top fintech startups in ethiopia" not in comp_names
    assert "fastercapital" not in comp_names

