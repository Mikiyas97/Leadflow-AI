# LeadFlow AI Agent

> **Autonomous Sales Operations & B2B Prospecting Agent**  
> **Author:** Mikiyas Hulualem — Full-Stack AI Web Developer  
> **Specification:** SRS / Solution Design Aligned

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg?style=flat&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6.svg?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4+-38B2AC.svg?style=flat&logo=tailwind-css)](https://tailwindcss.com)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash-4285F4.svg?style=flat&logo=google)](https://ai.google.dev/)
[![Hunter.io](https://img.shields.io/badge/Hunter.io-Email_API-FF6A00.svg?style=flat)](https://hunter.io)
[![Firecrawl](https://img.shields.io/badge/Firecrawl-Web_Extraction-FF5722.svg?style=flat)](https://firecrawl.dev)

---

## 1. Executive Summary

LeadFlow AI is an AI-powered sales operations agent designed for small B2B software companies, agencies, and startups. It automates the tedious, multi-step prospecting workflow:
1. **Discovering Potential Customers:** Identifies companies matching targeted ICP (Ideal Customer Profile) criteria.
2. **Website & Business Research:** Scrapes public company pages using Firecrawl to gather concrete evidence and business context.
3. **AI Qualification & Scoring:** Evaluates each prospect against target criteria using Google Gemini, generating an explainable fit score (0–100), key strengths, and potential risks.
4. **Decision-Maker Discovery:** Finds professional emails and confidence scores using Hunter.io.
5. **Personalized Cold Outreach Preparation:** Drafts high-converting, personalized 1-on-1 emails.
6. **Human-in-the-Loop Oversight:** Provides a centralized dashboard for sales professionals to review, edit, and explicitly approve outreach drafts before any message is sent.

---

## 2. System Architecture

```mermaid
graph TD
    User([Sales Operations Specialist]) -->|Defines ICP & Reviews Drafts| Frontend[React + TypeScript + Tailwind CSS]
    Frontend -->|REST API / Async Polling| Backend[FastAPI Backend Server]
    
    Backend -->|Deduplication & Storage| DB[(SQLite / PostgreSQL Database)]
    Backend -->|Background Runner| Orchestrator[Pipeline Orchestrator]
    
    Orchestrator -->|1. Discover Companies| Discovery[Lead Discovery Service]
    Orchestrator -->|2. Scrape Website| Firecrawl[Firecrawl API / HTTP Scraper]
    Orchestrator -->|3. Evaluate & Score ICP| Gemini[Google Gemini 2.5 Flash]
    Orchestrator -->|4. Discover & Verify Emails| Hunter[Hunter.io API]
    Orchestrator -->|5. Personalize Outreach| GeminiDrafts[Gemini Email Drafter]
    
    Orchestrator -->|Record Audit Trail| ActivityLogs[Activity & Error Logs]
```

---

## 3. Key Features

- **Automated Lead Discovery (FR-01, FR-02):** Define customer criteria (industry, geography, company size, pain points) and crawl matching B2B companies with built-in deduplication (FR-08).
- **Gemini AI Qualification (FR-03):** Returns structured JSON assessments containing a fit score (0–100), executive justification, positive fit factors, and risk caveats.
- **Hunter.io Contact Enrichment (FR-04):** Locates verified decision-maker emails, job titles, and confidence levels.
- **Firecrawl Content Scraper (FR-03):** Extracts readable markdown and meta information from company landing pages.
- **Human-Controlled Outreach (FR-05, FR-07):** In-app draft editor with subject/body modification and explicit approval controls. External autonomous sending is strictly disabled by default.
- **Comprehensive Audit Trail (FR-08):** Complete activity stream tracking run progression, scoring outcomes, and deduplication events.
- **Resilient Fallback Mode:** Operates seamlessly even without paid API keys by providing synthetic demo discovery data and intelligent fallbacks.

---

## 4. Project Structure

```
Brain3.ai/
├── backend/
│   ├── app/
│   │   ├── routes/
│   │   │   ├── activity.py       # Activity logs & audit trail
│   │   │   ├── dashboard.py      # KPI statistics & metrics
│   │   │   ├── discovery.py      # Lead discovery runs
│   │   │   ├── drafts.py         # Outreach review & human approval
│   │   │   ├── leads.py          # Lead explorer, filtering, re-analysis
│   │   │   └── profiles.py       # ICP target customer profiles
│   │   ├── services/
│   │   │   ├── discovery_service.py # Discovery & domain normalization
│   │   │   ├── firecrawl_service.py # Website scraping & fallbacks
│   │   │   ├── gemini_service.py    # Gemini scoring & draft generation
│   │   │   ├── hunter_service.py    # Hunter domain lookup & email verify
│   │   │   └── orchestrator.py      # End-to-end pipeline coordinator
│   │   ├── config.py             # Pydantic v2 application settings
│   │   ├── database.py           # SQLAlchemy engine & session manager
│   │   ├── main.py               # FastAPI entrypoint & CORS
│   │   ├── models.py             # Relational database models (7 entities)
│   │   └── schemas.py            # Pydantic request/response schemas
│   ├── tests/
│   │   └── test_api.py           # PyTest automated test suite
│   ├── requirements.txt          # Python dependencies
│   └── venv/                     # Virtual environment
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ActivityFeedView.tsx   # Audit & execution logs
│   │   │   ├── DashboardView.tsx      # Overview KPIs & quick actions
│   │   │   ├── DiscoveryModal.tsx     # ICP setup & live run tracker
│   │   │   ├── LeadDetailModal.tsx    # Research, AI breakdown & contacts
│   │   │   ├── LeadExplorerView.tsx   # Filterable lead table
│   │   │   ├── Navbar.tsx             # Navigation & service status
│   │   │   └── OutreachReviewView.tsx # Human approval draft editor
│   │   ├── services/
│   │   │   └── api.ts                 # Typed fetch client
│   │   ├── App.tsx                    # Main container application
│   │   ├── index.css                  # Tailwind styles & theme
│   │   └── types.ts                   # TypeScript interfaces
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── .env.example
├── .gitignore
└── README.md
```

---

## 5. Getting Started

### Prerequisites
- **Python 3.10+** (tested on Python 3.14)
- **Node.js 18+** & **npm**

### 1. Environment Setup

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configure your API keys in `.env` (optional for demo mode):
```env
GEMINI_API_KEY=your_gemini_api_key_here
HUNTER_API_KEY=your_hunter_api_key_here
FIRECRAWL_API_KEY=your_firecrawl_api_key_here
DATABASE_URL=sqlite:///./leadflow.db
FRONTEND_ORIGIN=http://localhost:5173
PORT=8000
```

### 2. Backend Installation & Startup

```bash
# From project root
python -m venv backend/venv

# Activate virtual environment (Windows PowerShell)
.\backend\venv\Scripts\Activate.ps1

# Install requirements
pip install -r backend/requirements.txt

# Start backend server
python -m uvicorn backend.app.main:app --port 8000 --reload
```
API Documentation will be accessible at: `http://localhost:8000/docs`

### 3. Frontend Installation & Startup

In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
Open your browser at: `http://localhost:5173`

---

## 6. Running Tests

Run the backend unit and integration test suite:
```bash
.\backend\venv\Scripts\python.exe -m pytest backend/tests/test_api.py -v
```

Test the frontend TypeScript compilation and build:
```bash
cd frontend
npm run build
```

---

## 7. REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health and integration status |
| `GET` | `/api/dashboard/stats` | High-level metrics and activity feed |
| `POST` | `/api/target-profiles` | Create new ICP target profile |
| `GET` | `/api/target-profiles` | List saved target profiles |
| `POST` | `/api/discovery-runs` | Start asynchronous discovery run |
| `GET` | `/api/discovery-runs/{id}` | Poll discovery run status & counts |
| `GET` | `/api/leads` | Search and filter leads (status, score) |
| `GET` | `/api/leads/{id}` | Full lead details with research & contacts |
| `PATCH` | `/api/leads/{id}` | Update lead fields or status |
| `POST` | `/api/leads/{id}/analyze` | Trigger re-analysis with Gemini |
| `POST` | `/api/leads/{id}/draft` | Generate personalized email draft |
| `GET` | `/api/drafts` | List outreach drafts (DRAFT / APPROVED) |
| `PATCH` | `/api/drafts/{id}` | Edit email subject or body |
| `POST` | `/api/drafts/{id}/approve` | Approve draft for human outreach |
| `GET` | `/api/activity` | Retrieve execution logs and audit trail |

---

## 8. Deployment

- **Frontend:** Deploy to [Vercel](https://vercel.com) connecting the `frontend` directory.
- **Backend:** Deploy to [Render](https://render.com) using `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`.
- **Database:** Supabase PostgreSQL (simply set `DATABASE_URL=postgresql://postgres:...` in Render environment variables).

---

## 9. License

MIT License. Developed for Brain3.ai.
