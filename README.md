# LeadFlow AI — Autonomous B2B Sales Operations & Prospecting Intelligence Platform

> **An enterprise-grade, autonomous sales operations agent and AI-driven B2B prospecting platform.**  
> **Author:** [Mikiyas Hulualem](https://github.com) — Full-Stack AI Web Developer  
> **Core Stack:** FastAPI, React 19, TypeScript, Tailwind CSS, Google Gemini 2.5 Flash, Hunter.io, Firecrawl, Serper.dev, SQLite/PostgreSQL

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.3+-61DAFB.svg?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4+-38B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash-4285F4.svg?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Hunter.io](https://img.shields.io/badge/Hunter.io-Email_API-FF6A00.svg?style=for-the-badge)](https://hunter.io)
[![Firecrawl](https://img.shields.io/badge/Firecrawl-Web_Extraction-FF5722.svg?style=for-the-badge)](https://firecrawl.dev)
[![Serper](https://img.shields.io/badge/Serper-Google_Search_API-0288D1.svg?style=for-the-badge)](https://serper.dev)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

---

## 1. Executive Summary & Overview

**LeadFlow AI** is an intelligent, full-stack B2B sales automation platform that replaces manual prospecting with an autonomous, 8-stage operational pipeline. Built for modern sales development representatives (SDRs), growth agencies, and B2B SaaS teams, LeadFlow AI combines **natural language conversational prospecting** with **live web discovery, deep website extraction, AI qualification gating, decision-maker email verification, and human-in-the-loop cold email delivery via Gmail SMTP**.

### Why LeadFlow AI?
Traditional sales operations suffer from disconnected workflows: scraping lists from directories, manually researching company homepages, copy-pasting notes into LLMs, hunting for verified emails, and hand-typing email drafts. 

LeadFlow AI consolidates this entire lifecycle into a unified, reliable cockpit:
1. **Chat or Form-Driven Prospecting:** Define target criteria using an interactive 9-parameter search form or converse naturally with an AI Sales Agent.
2. **Multi-Channel Candidate Discovery:** Harvests high-intent company candidates via live Google Search (`Serper.dev`) and specialized directory scraping with domain normalization and duplicate prevention.
3. **Deep Web Extraction:** Scrapes raw website content and metadata using `Firecrawl` with automatic fallback to resilient HTTP parsers.
4. **Explainable AI Qualification:** Evaluates every prospect against custom Ideal Customer Profile (ICP) criteria using **Google Gemini 2.5 Flash**, returning a transparent 0–100 suitability score, specific strengths, and risk caveats.
5. **Verified Decision-Maker Discovery:** Queries **Hunter.io** to locate corporate domain emails, job titles, and confidence scores (filtering out unverified or hallucinated contacts).
6. **Hyper-Personalized Outreach Generation:** Synthesizes scraped website evidence and qualification findings into personalized, non-generic 1-on-1 cold outreach emails.
7. **Human-in-the-Loop Oversight & Gmail SMTP Dispatch:** Provides full review and editing capabilities for sales reps before sending emails via authenticated Gmail SMTP with idempotency protection.
8. **CRM Pipeline & Follow-Up Tracking:** Comprehensive lead management, automated follow-up touchpoint scheduling, overdue alerts, and real-time activity auditing.

---

## 2. System Architecture

LeadFlow AI is engineered as a decoupled full-stack application featuring a high-throughput **FastAPI** backend and an interactive **React 19** frontend.

```mermaid
graph TB
    subgraph Client["Frontend Cockpit (React 19 + TypeScript + Tailwind CSS)"]
        UI_Dash["Dashboard View\n(KPIs, Overdue Alerts, Named Runs)"]
        UI_Search["Search Leads View\n(9 Targeting Parameters & Discovery)"]
        UI_Chat["Conversational AI Agent\n(Natural Language & Approval Banner)"]
        UI_CRM["Manage Leads CRM\n(Pipeline, Filters & Touchpoints)"]
        UI_Outreach["Outreach Review View\n(Draft Editor & SMTP Sender)"]
        UI_Audit["Activity Audit Trail\n(Real-time Pipeline Stream)"]
    end

    subgraph Backend["Backend Core (FastAPI + SQLAlchemy)"]
        API_Gateway["FastAPI Application & REST Routing"]
        Orchestrator["Pipeline Orchestrator\n(8-Stage Coordinator)"]
        Scheduler["In-Process Scheduler\n(Periodic Background Runs)"]
        Logger["Pipeline Activity Logger\n(Audit Trail & Metrics)"]
    end

    subgraph Services["External Integrations & AI Engine"]
        SerperAPI["Serper.dev\n(Google Search Live Discovery)"]
        FirecrawlAPI["Firecrawl API\n(Deep Web Extraction & Markdown)"]
        GeminiAPI["Google Gemini 2.5 Flash\n(NLP Parsing, ICP Scoring & Copywriting)"]
        HunterAPI["Hunter.io API\n(Domain Search & Email Verifier)"]
        GmailSMTP["Gmail SMTP Server\n(TLS Authenticated Email Dispatch)"]
    end

    subgraph DataTier["Data Persistence Layer"]
        DB[(SQLite / PostgreSQL\n7 Relational Entities)]
    end

    %% Client Interactions
    UI_Dash & UI_Search & UI_Chat & UI_CRM & UI_Outreach & UI_Audit -->|REST API / JSON| API_Gateway

    %% Backend Flow
    API_Gateway --> Orchestrator
    API_Gateway --> DB
    Scheduler --> Orchestrator
    Orchestrator --> Logger
    Logger --> DB

    %% Service Integrations
    Orchestrator -->|1. Candidate Query| SerperAPI
    Orchestrator -->|2. Scrape Site| FirecrawlAPI
    Orchestrator -->|3. Score Fit & Parse Prompts| GeminiAPI
    Orchestrator -->|4. Discover & Verify Emails| HunterAPI
    Orchestrator -->|5. Draft Outreach| GeminiAPI
    Orchestrator -->|6. Idempotent Send| GmailSMTP

    %% Persistence
    Orchestrator -->|Persist Leads, Contacts, Drafts| DB
```

---

## 3. The 8-Stage Autonomous Pipeline

The core engine coordinates an 8-stage sequence that transforms raw targeting criteria into fully verified, actionable sales opportunities:

```mermaid
sequenceDiagram
    autonumber
    actor User as Sales Specialist
    participant Front as Frontend / AI Agent
    participant Orch as Pipeline Orchestrator
    participant Serp as Serper (Google Search)
    participant Scrape as Firecrawl Web Scraper
    participant Gem as Gemini 2.5 Flash
    participant Hunt as Hunter.io
    participant SMTP as Gmail SMTP Server
    participant DB as Relational Database

    User->>Front: Enter query or configure 9-point criteria
    Front->>Orch: POST /api/discovery-runs or POST /api/chat
    Orch->>DB: Check deduplication (Domain & Name Gate)
    Orch->>Serp: Discover matching B2B candidates & websites
    Serp-->>Orch: Candidate URLs & business profiles
    Orch->>Scrape: Extract homepage markdown, metadata & copy
    Scrape-->>Orch: Clean markdown content
    Orch->>Gem: Evaluate ICP fit, score (0-100), strengths & risks
    Gem-->>Orch: Structured qualification evaluation
    alt Fit Score >= Threshold (e.g. 50+)
        Orch->>Hunt: Search domain for verified decision-makers
        Hunt-->>Orch: Contacts (Name, Title, Email, Confidence)
        Orch->>Gem: Draft personalized 1-on-1 cold email
        Gem-->>Orch: Generated Subject & Body copy
        Orch->>DB: Save Lead, Contacts, Research & OutreachDraft
    else Disqualified
        Orch->>DB: Save Lead with status=UNQUALIFIED
    end
    Orch-->>Front: Real-time candidate cards & pipeline status
    User->>Front: Review draft, modify copy & click "Approve & Send"
    Front->>SMTP: POST /api/drafts/{id}/send (Idempotency Key)
    SMTP-->>Front: Email Delivered & Follow-Up Scheduled
```

| Step | Stage Name | Description & Technical Details |
|---|---|---|
| **1** | **Criteria Parsing & Target Ingestion** | Ingests ICP parameters (industry, location, company size, target pain points). In conversational mode, Gemini extracts structured parameters from natural language prompts with fallback forms. |
| **2** | **Deduplication Check** | Queries existing records to ensure existing domains and company names are not re-processed, preserving API credits and preventing duplicate outreach. |
| **3** | **Live Candidate Discovery** | Executes live queries against **Serper.dev** (Google Search) and curated B2B directories to identify active companies with verified websites. |
| **4** | **Deep Web Scraping** | Uses **Firecrawl** to scrape landing pages and extract clean markdown, about pages, and meta descriptions. Falls back to native HTTP fetch if firecrawl is unavailable. |
| **5** | **Gemini AI Qualification Gating** | Analyzes scraped company data against ICP criteria using **Google Gemini 2.5 Flash**. Returns an explainable 0–100 score, positive fit strengths, and potential risk flags. |
| **6** | **Decision-Maker Email Verification** | Queries **Hunter.io** domain search to find key executives (e.g., CEO, Founder, VP Sales). Applies a confidence threshold (≥80%) and zero contact fabrication. |
| **7** | **Context-Aware Cold Email Drafting** | Uses Gemini to craft custom, conversational email drafts citing specific company achievements, pain points, and personalized value propositions. |
| **8** | **Human Review & Gmail SMTP Dispatch** | Sales reps review the draft in the UI, edit the subject/body, and dispatch it via authenticated Gmail SMTP with automated follow-up scheduling. |

---

## 4. Key Features & Module Walkthrough

### 🤖 1. Conversational AI Sales Agent (`ChatbotUI.tsx`)
- **Natural Language Parsing:** Chat naturally with the agent (e.g., *"Find web development agencies in Addis Ababa and prepare outreach emails"*).
- **Interactive Fallback Criteria Form:** If a prompt lacks key targeting parameters, the UI renders an inline 9-point setup form right inside the chat stream.
- **Live Pipeline Tracker:** Visual step-by-step progress pills show each phase of execution in real time.
- **Rich Lead Inspector Card:** Displays company favicon, domain verification badge, Gemini fit score (0–100), key strengths/risks, and Hunter.io verified email badges.
- **In-Chat Email Approval Banner:** Review the drafted email directly in the conversation window and click **"Approve & Send Email"** with instant Gmail SMTP execution.
- **Full Markdown & GFM Rendering:** Equipped with `react-markdown` and `remark-gfm` for formatted tables, code blocks, callouts, and lists.

### 🔍 2. Precision Prospect Search (`SearchLeadsView.tsx`)
- **9 Controlled Search Parameters:** Industry, Location, Company Size, Pain Points/Target Criteria, Max Leads, Min Fit Score, Direct Domain Search, and Live Google Discovery toggles.
- **Website Status Indicators:** Differentiates between `HAS_OFFICIAL_WEBSITE`, `NO_OFFICIAL_WEBSITE_FOUND`, and `WEBSITE_STATUS_UNCERTAIN`.
- **Live Inspection & Scoring:** Inspect scraped content, trigger on-demand re-qualification, and promote candidates to leads with a single click.

### 📋 3. CRM Lead Pipeline (`ManageLeadsView.tsx`)
- **Multi-Status Pipeline Tabs:** Organize leads across `ALL`, `NEW`, `QUALIFIED`, `CONTACTED`, `UNQUALIFIED`, and `ARCHIVED`.
- **Score-Based Sorting & Searching:** Instantly filter by fit score, company name, industry, or geographic territory.
- **Follow-Up Rescheduling Modal:** Set explicit follow-up dates and notes for each contact.
- **Re-Analysis Trigger:** Rerun Gemini scoring on any lead with updated criteria on the fly.

### ✍️ 4. Outreach Review Cockpit (`OutreachReviewView.tsx`)
- **Human-in-the-Loop Safeguard:** Fully controls whether drafts are in `DRAFT`, `APPROVED`, or `SENT` status. No autonomous emails are dispatched without explicit human action.
- **Full In-App Email Editor:** Modify subject lines and email body copy before sending.
- **Idempotent SMTP Dispatch:** Server-side idempotency keys prevent duplicate email sending even if buttons are clicked multiple times.
- **SMTP Connectivity Tester:** Dedicated "Test SMTP Connection" button in the navigation header to verify Gmail credentials instantly.

### 📊 5. Analytics Dashboard & Overdue Queues (`DashboardView.tsx`)
- **High-Impact KPI Cards:** Total Leads Discovered, Qualified Leads Count, Overall Fit Rate %, Drafts Pending Review, Approved Drafts, and Sent Outreach.
- **Descriptive Automation Run History:** Shows recent runs with real search query titles (e.g. *"Hotels in Addis Ababa, Ethiopia"*), total discovered, qualified, and drafts produced.
- **Overdue Touchpoint Alerts:** Persistent reminder banner highlighting leads with past-due follow-ups with instant one-click rescheduling.

### 📜 6. Real-Time Audit Feed (`ActivityFeedView.tsx`)
- Chronological event stream tracking every background pipeline action, deduplication check, scraping event, and SMTP delivery.

---

## 5. Technology Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| **React** | `19.3.1` | Next-generation declarative UI framework |
| **TypeScript** | `6.0.3` | Strict type safety across components and API models |
| **Vite** | `8.3.4` | Ultra-fast HMR frontend build tool and dev server |
| **Tailwind CSS** | `3.4.17` | Utility-first styling with modern dark/light styling |
| **Lucide React** | `1.61.0` | Comprehensive icon suite |
| **React Markdown** | `10.1.0` | GitHub Flavored Markdown renderer for chat responses |
| **Remark GFM** | `4.0.1` | GFM plugin for tables, strikethrough, and autolinks |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| **FastAPI** | `0.115+` | High-performance asynchronous Python web framework |
| **Uvicorn** | `0.30+` | ASGI web server for production and development |
| **SQLAlchemy** | `2.0+` | Enterprise ORM with automated migrations and relations |
| **Pydantic v2** | `2.8+` | Robust request/response schema validation and settings |
| **Google GenAI SDK** | `0.1.1+` | Official SDK for Google Gemini 2.5 Flash models |
| **HTTPX** | `0.27+` | Asynchronous HTTP client for Firecrawl, Serper, and Hunter |
| **SQLite / PostgreSQL** | Native | Relational database storage |

### External APIs & Integrations
- **Google Gemini 2.5 Flash:** Natural language understanding, qualification reasoning, and email copywriting.
- **Hunter.io API:** Domain search, executive contact discovery, and email deliverability verification.
- **Firecrawl API:** Deep web extraction, bypassing complex JavaScript to produce clean markdown.
- **Serper.dev API:** Google Search API for live business candidate discovery.
- **Gmail SMTP:** Authenticated TLS email delivery for cold outreach campaigns.

---

## 6. Database Schema & Data Models

LeadFlow AI utilizes an enterprise relational schema consisting of 7 interconnected entities:

```mermaid
erDiagram
    TARGET_PROFILE ||--o{ LEAD : "evaluates"
    TARGET_PROFILE ||--o{ AUTOMATION_RUN : "triggers"
    TARGET_PROFILE ||--o{ DISCOVERY_SCHEDULE : "schedules"
    
    LEAD ||--o{ CONTACT : "has"
    LEAD ||--o{ RESEARCH_RECORD : "contains"
    LEAD ||--o{ OUTREACH_DRAFT : "generates"
    LEAD ||--o{ ACTIVITY_LOG : "audits"
    
    AUTOMATION_RUN ||--o{ ACTIVITY_LOG : "records"
    CONTACT ||--o{ OUTREACH_DRAFT : "receives"

    TARGET_PROFILE {
        int id PK
        string name
        string industry
        string location
        string company_size
        text criteria
        datetime created_at
    }

    LEAD {
        int id PK
        int profile_id FK
        string company_name
        string website UK
        string industry
        string location
        int fit_score
        text fit_reason
        json fit_strengths
        json fit_risks
        string status
        string website_status
        datetime follow_up_date
        string follow_up_status
        datetime created_at
    }

    CONTACT {
        int id PK
        int lead_id FK
        string name
        string job_title
        string email
        string email_status
        int confidence_score
        datetime created_at
    }

    RESEARCH_RECORD {
        int id PK
        int lead_id FK
        text summary
        text raw_content
        json source_urls
        datetime researched_at
    }

    OUTREACH_DRAFT {
        int id PK
        int lead_id FK
        int contact_id FK
        string subject
        text body
        string status
        string idempotency_key UK
        datetime created_at
        datetime sent_at
    }

    AUTOMATION_RUN {
        int id PK
        int profile_id FK
        string search_name
        string status
        json input_profile
        int leads_discovered
        int leads_qualified
        int drafts_generated
        datetime started_at
        datetime completed_at
    }

    ACTIVITY_LOG {
        int id PK
        int run_id FK
        int lead_id FK
        string action
        string level
        text details
        datetime created_at
    }

    DISCOVERY_SCHEDULE {
        int id PK
        int profile_id FK
        string name
        int interval_hours
        boolean is_active
        datetime last_run_at
        datetime next_run_at
    }
```

---

## 7. Project Structure

```
Brain3.ai/
├── backend/
│   ├── app/
│   │   ├── routes/
│   │   │   ├── activity.py              # Activity audit logs & stream
│   │   │   ├── chat.py                  # Conversational AI Sales Agent route
│   │   │   ├── dashboard.py             # KPIs, funnel stats, and recent runs
│   │   │   ├── discovery.py             # Discovery run trigger and polling
│   │   │   ├── drafts.py                # Outreach draft editing, approval & SMTP
│   │   │   ├── leads.py                 # CRM lead management & re-analysis
│   │   │   ├── profiles.py              # Target ICP profile management
│   │   │   └── schedules.py             # Periodic discovery scheduling
│   │   ├── services/
│   │   │   ├── discovery_service.py     # Discovery & domain normalization
│   │   │   ├── email_service.py         # Gmail SMTP, TLS, and idempotency
│   │   │   ├── firecrawl_service.py     # Web scraping & markdown extraction
│   │   │   ├── gemini_service.py        # Gemini 2.5 Flash scoring & copywriting
│   │   │   ├── hunter_service.py        # Hunter.io domain search & verify
│   │   │   ├── orchestrator.py          # 8-step pipeline coordinator
│   │   │   ├── pipeline_logger.py       # Activity logging & metrics
│   │   │   ├── scheduler_service.py     # Background interval scheduler
│   │   │   └── serper_service.py        # Google Search live discovery
│   │   ├── config.py                    # Application configuration (Pydantic v2)
│   │   ├── database.py                  # Database engine & runtime migrations
│   │   ├── main.py                      # FastAPI application entrypoint & CORS
│   │   ├── models.py                    # SQLAlchemy relational models
│   │   └── schemas.py                   # Pydantic request/response schemas
│   ├── tests/
│   │   ├── test_api.py                  # Health check & core routing tests
│   │   ├── test_audit_and_smtp.py       # Audit trail & SMTP idempotency tests
│   │   ├── test_lead_search.py          # Lead search & website status tests
│   │   ├── test_schedules_and_overdue.py# Scheduling & follow-up queue tests
│   │   └── test_serper_and_hunter_workflow.py # Serper + Hunter integration tests
│   ├── requirements.txt                 # Backend Python dependencies
│   └── venv/                            # Python virtual environment
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ActivityFeedView.tsx     # Pipeline execution audit trail
│   │   │   ├── ChatbotUI.tsx            # Conversational Sales Operations Agent
│   │   │   ├── DashboardView.tsx        # KPI metrics & descriptive runs
│   │   │   ├── DiscoveryModal.tsx       # ICP criteria setup modal
│   │   │   ├── LeadDetailModal.tsx      # Deep lead breakdown & contacts
│   │   │   ├── ManageLeadsView.tsx      # CRM Lead pipeline & rescheduling
│   │   │   ├── MarkdownRenderer.tsx     # GFM markdown renderer with code styling
│   │   │   ├── OutreachReviewView.tsx   # Draft editor & SMTP delivery cockpit
│   │   │   ├── SearchLeadsView.tsx      # 9-point criteria search engine
│   │   │   └── Sidebar.tsx              # Application navigation & status
│   │   ├── services/
│   │   │   └── api.ts                   # Typed API client
│   │   ├── App.tsx                      # Root component & routing state
│   │   ├── index.css                    # Tailwind CSS custom design tokens
│   │   └── types.ts                     # TypeScript data interfaces
│   ├── package.json                     # Frontend scripts and dependencies
│   ├── tailwind.config.js               # Tailwind configuration
│   └── vite.config.ts                   # Vite bundler configuration
├── .env.example                         # Environment configuration template
├── .gitignore                           # Git ignore rules
└── README.md                            # Comprehensive documentation
```

---

## 8. Getting Started & Installation

### Prerequisites
- **Python 3.10+** (tested on Python 3.12 and 3.14)
- **Node.js 18+** & **npm**
- Active Google account (if using Gmail SMTP)

### 1. Environment Setup
Copy `.env.example` to create your local `.env` file:
```bash
cp .env.example .env
```

Edit your `.env` file with your credentials:
```env
# AI & Enrichment APIs
GEMINI_API_KEY=your_gemini_api_key_here
HUNTER_API_KEY=your_hunter_api_key_here
FIRECRAWL_API_KEY=your_firecrawl_api_key_here
SERPER_API_KEY=your_serper_api_key_here

# Database Configuration (SQLite default; PostgreSQL supported)
DATABASE_URL=sqlite:///./leadflow.db

# Client & Server
FRONTEND_ORIGIN=http://localhost:5173
PORT=8000

# Gmail SMTP Configuration (Cold Outreach Dispatch)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password
EMAIL_FROM=your-email@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
```

> [!NOTE]
> **Graceful Fallback Mode:** If you do not provide API keys for Serper, Firecrawl, or Hunter, LeadFlow AI activates its intelligent fallback engine, allowing full evaluation using structured synthetic data and simulated live lookups without crashes.

---

### 2. Gmail SMTP Setup Guide (Google App Password)

To send approved cold outreach emails directly from LeadFlow AI using Gmail SMTP:

> [!IMPORTANT]
> **Never use your personal Google account password.** Google requires a dedicated 16-character **App Password** for secure SMTP authentication.

1. **Enable 2-Step Verification:**
   - Go to your [Google Account](https://myaccount.google.com/).
   - Click on **Security** in the left sidebar.
   - Under "How you sign in to Google", ensure **2-Step Verification** is turned **ON**.

2. **Generate an App Password:**
   - In your Google Account Security tab, navigate to [Google App Passwords](https://myaccount.google.com/apppasswords).
   - Enter an app name (e.g. `LeadFlow AI`).
   - Click **Create**. Google will display a 16-character passcode (e.g. `abcd efgh ijkl mnop`).

3. **Save in `.env`:**
   - Set `GMAIL_USER=your-email@gmail.com`
   - Set `GMAIL_APP_PASSWORD=abcdefghijklmnop` (remove any spaces)
   - Set `EMAIL_FROM=your-email@gmail.com`

4. **Verify Connectivity:**
   - Click the **Test SMTP** button in the top navigation bar of the LeadFlow AI UI to send an instant test ping to your inbox.

---

### 3. Backend Startup

In your project root directory:

```bash
# 1. Create a Python virtual environment
python -m venv backend/venv

# 2. Activate the virtual environment
# Windows PowerShell:
.\backend\venv\Scripts\Activate.ps1
# macOS / Linux:
source backend/venv/bin/activate

# 3. Install backend dependencies
pip install -r backend/requirements.txt

# 4. Launch FastAPI with hot reloading
python -m uvicorn backend.app.main:app --port 8000 --reload
```
The FastAPI backend server will be live at: `http://localhost:8000`  
Interactive Swagger API documentation: `http://localhost:8000/docs`

---

### 4. Frontend Startup

In a separate terminal:

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start the Vite development server
npm run dev
```
Open your browser at: `http://localhost:5173`

---

## 9. REST API Reference

| HTTP Method | Route | Description |
|---|---|---|
| `GET` | `/api/health` | System health check and API integration status |
| `POST` | `/api/chat` | Conversational AI agent pipeline execution & prompt parsing |
| `GET` | `/api/dashboard/stats` | Pipeline KPI metrics, overdue touchpoint count, recent runs |
| `POST` | `/api/target-profiles` | Create a new target customer profile (ICP) |
| `GET` | `/api/target-profiles` | List all saved target profiles |
| `POST` | `/api/discovery-runs` | Trigger an asynchronous automated discovery run |
| `GET` | `/api/discovery-runs/{id}` | Poll discovery run status, leads discovered, and drafts |
| `GET` | `/api/leads` | Search and filter leads (status, fit score, overdue, search terms) |
| `GET` | `/api/leads/overdue` | List leads with overdue follow-up touchpoints |
| `GET` | `/api/leads/{id}` | Detailed lead record with company research, contacts & drafts |
| `PATCH` | `/api/leads/{id}` | Update lead fields, status, or notes |
| `POST` | `/api/leads/{id}/analyze` | Trigger on-demand re-qualification with Gemini 2.5 Flash |
| `POST` | `/api/leads/{id}/draft` | Generate a new personalized cold email draft |
| `POST` | `/api/leads/{id}/reschedule-followup`| Reschedule follow-up touchpoint date and add notes |
| `GET` | `/api/drafts` | List outreach drafts (filtered by `DRAFT`, `APPROVED`, `SENT`) |
| `PATCH` | `/api/drafts/{id}` | Edit email subject or body copy |
| `POST` | `/api/drafts/{id}/approve` | Approve draft for human outreach |
| `POST` | `/api/drafts/{id}/send` | Send approved email via Gmail SMTP with idempotency |
| `POST` | `/api/drafts/test-email` | Send a test ping email to verify Gmail SMTP configuration |
| `GET` | `/api/schedules` | List recurring lead discovery schedules |
| `POST` | `/api/schedules` | Create a new periodic lead discovery schedule |
| `PATCH` | `/api/schedules/{id}` | Activate, pause, or edit a discovery schedule |
| `DELETE` | `/api/schedules/{id}` | Remove a recurring discovery schedule |
| `POST` | `/api/schedules/{id}/trigger` | Trigger immediate execution of a scheduled run |
| `GET` | `/api/activity` | Retrieve real-time execution audit logs |

---

## 10. Automated Testing Suite

LeadFlow AI features a comprehensive backend test suite built with **PyTest** covering all functional criteria, acceptance gates, and edge cases:

```bash
# Run all backend tests with verbose output
python -m pytest backend/tests/ -v
```

### Test Coverage Highlights:
- **`test_api.py`:** Core API endpoints, health check responses, and database connectivity.
- **`test_audit_and_smtp.py`:** Pipeline activity logging, audit trail verification, Gmail SMTP test endpoints, and idempotency key enforcement.
- **`test_lead_search.py`:** 9-parameter lead filtering, domain search queries, and website status evaluations (`HAS_OFFICIAL_WEBSITE`, etc.).
- **`test_schedules_and_overdue.py`:** Periodic schedule CRUD, automated background runners, and overdue follow-up calculations.
- **`test_serper_and_hunter_workflow.py`:** Live Serper Google search extraction, Hunter.io decision-maker verification, and qualification thresholds.

To verify frontend TypeScript compilation and production bundle stability:
```bash
cd frontend
npm run build
```

---

## 11. Engineering Highlights & Design Decisions

### 1. Strictly Non-Hallucinatory Contact Policy
LeadFlow AI implements a strict policy against synthetic contact creation:
- When Hunter.io returns verified contacts with confidence scores ≥ 80%, the contact is saved with status `verified`.
- When Hunter.io has no verified email or confidence is below threshold, the contact is marked as `unavailable` or `unverified`.
- The system **never fabricates executive names or emails**. Outreach drafts are addressed to company departments or left for manual review when verified decision-makers cannot be proven.

### 2. Idempotent Email Delivery
Email delivery via `POST /api/drafts/{id}/send` generates a unique UUID-based `idempotency_key` tied to each `OutreachDraft` record. Even if network latency causes repeated requests, the backend guarantees that only one email is ever dispatched to the recipient's inbox.

### 3. Safe Runtime Migrations
The database layer (`backend/app/database.py`) includes self-healing column migrations for SQLite and PostgreSQL. When columns like `search_name` or `website_status` are introduced, the application inspects the schema on boot and executes dynamic `ALTER TABLE` statements without wiping existing data.

### 4. Human-in-the-Loop Safeguards
Autonomous email sending is disabled by default. Cold outreach requires explicit human sign-off via the **Outreach Review Cockpit** or the **AI Sales Agent Approval Banner**.

---

## 12. Deployment

- **Frontend:** Seamlessly deploys to [Vercel](https://vercel.com) or [Netlify](https://netlify.com) using the root directory `frontend` and build command `npm run build`.
- **Backend:** Ready for deployment on [Render](https://render.com), [Railway](https://railway.app), or [Fly.io](https://fly.io) with start command:
  ```bash
  uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
  ```
- **Database:** Connect any production PostgreSQL database (such as [Supabase](https://supabase.com) or Neon) by updating `DATABASE_URL` in your hosting environment variables:
  ```bash
  DATABASE_URL=postgresql://postgres:password@db.supabase.co:5432/postgres
  ```

---

## 13. Author & License

**Developed by Mikiyas Hulualem**  
Full-Stack AI Web Developer  
- **Focus:** Autonomous AI Agents, Enterprise Full-Stack Web Development, LLM Orchestration
- **License:** [MIT License](LICENSE) — Feel free to use, modify, and build upon this project.
