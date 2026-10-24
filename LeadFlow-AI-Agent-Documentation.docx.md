# **<u>LeadFlow AI Agent</u>** 

**Mikiyas Hulualem** 

Full-Stack AI Web Developer 

Software Requirements Specification (SRS) / Solution Design 

## **1. Executive Summary** 

### **1.1 Proposed Solution** 

LeadFlow AI is an AI-powered sales operations agent designed for small B2B software companies and startups. It automates the process of discovering potential customers, researching their businesses, identifying relevant decision-makers, finding professional contact emails, and qualifying leads based on predefined criteria. Using the Gemini API and third-party data services, it generates personalized outreach emails for human review and approval, while maintaining lead records and follow-up statuses in a centralized dashboard. 

### **1.2 Expected Value** 

LeadFlow AI reduces the time and manual effort required for prospect research and lead qualification. By combining company data, contact discovery, and AI-driven personalization, it helps sales teams identify promising prospects more consistently and prepare relevant outreach faster. Its centralized dashboard improves lead organization and follow-up tracking, allowing small teams to focus more on meaningful sales conversations and less on repetitive administrative work. 

## **2. Problem Statement** 

### **2.1 Industry and Target Role** 

- **Industry:** B2B Software and Technology Sales 

- **Target Role:** Sales Operations Specialist 

- **Target Users:** Small software companies, startups, and sales teams with limited resources for prospecting and customer acquisition. 

### **2.2 Current Workflow** 

Sales professionals manually search for potential customers through company websites, business directories, and public sources. They research each company's products and needs, identify relevant decision-makers, find professional contact information, evaluate prospect suitability, and write 

personalized outreach emails. They must also organize lead records and track follow-ups using spreadsheets or separate tools. 

### **2.3 Problems and Limitations** 

- **Time-consuming research:** Finding and evaluating suitable prospects requires repetitive manual work across multiple sources. 

- **Fragmented information:** Company details, contact information, qualification notes, and follow-up records are often scattered across different tools. 

- **Poor personalization and prioritization:** Limited research time can lead to generic outreach and missed opportunities to focus on high-potential prospects. 

### **2.4 Problem Significance** 

These inefficiencies increase customer acquisition costs and reduce the time sales professionals can spend building relationships and closing deals. LeadFlow AI addresses these challenges by consolidating prospect research, contact discovery, lead qualification, and personalized outreach preparation into one automated workflow. This helps small sales teams work more efficiently, prioritize promising opportunities, and maintain organized follow-ups without requiring a large sales operations team. 

## **3. Goals and Scope** 

### **3.1 Project Goals** 

- Automate lead discovery, company research, contact discovery, and lead qualification. 

- Reduce the time spent manually researching prospects and preparing outreach emails. 

- Improve lead prioritization through AI-assisted scoring based on predefined customer-fit criteria. 

- Generate personalized outreach emails for human review and approval. 

- Provide a responsive dashboard to manage leads, monitor automation, and track follow-up status. 

### **3.2 In Scope** 

- Define target customer profiles, including industry, company size, and relevant criteria. 

- Discover potential companies using public company data sources. 

- Research company websites and collect relevant business information. 

- Find and verify professional email addresses using Hunter.io, subject to API availability and free-tier limits. 

- Use Gemini to qualify leads, explain scores, and draft personalized outreach emails. 

- Store lead profiles, research results, email drafts, and statuses in a database. 

- Allow users to review, edit, approve, and track outreach drafts. 

- Provide a manually triggered lead-discovery workflow and basic scheduled automation where feasible. 

- Implement input validation, API error handling, secure credential management, and duplicate prevention. 

### **3.3 Out of Scope** 

- Fully autonomous cold-email sending and bulk campaigns. 

- Advanced CRM integrations such as Salesforce and HubSpot. 

- Paid lead databases or subscription-dependent APIs. 

- Automated LinkedIn scraping or messaging. 

- Autonomous sales negotiations or closing deals. 

- Advanced analytics, multi-user permissions, and enterprise features. 

- Guaranteed accuracy of AI-generated lead scores or contact information. 

## **4. Proposed Solution** 

### **4.1 Solution Overview** 

LeadFlow AI is a full-stack AI sales operations application that automates the process of finding, researching, and qualifying potential B2B customers. It integrates company data sources, contact discovery services, and Google's Gemini API to transform prospecting into a structured workflow. The application centralizes lead information, generates evidence-based qualification assessments, and prepares personalized outreach emails, reducing repetitive manual work while keeping sales professionals in control. 

### **4.2 Key Features** 

#### **Feature 1: Automated Lead Discovery** 

Users define their target customer profile, including industry, company type, and relevant criteria. The agent discovers matching companies through available company data sources and stores potential leads while preventing duplicates. 

#### **Feature 2: AI-Powered Company Research and Qualification** 

The agent gathers relevant public company information and uses Gemini to evaluate each prospect against the user's criteria. It assigns a qualification score with supporting reasons, helping users prioritize promising opportunities. 

#### **Feature 3: Contact Discovery and Personalized Outreach** 

The application uses Hunter.io to find and, where possible, verify professional email addresses. Gemini then drafts personalized outreach emails using relevant company research and the prospect's business context. 

#### **Feature 4: Automated Actions and Follow-Up Tracking** 

The agent can run lead-discovery checks on a schedule where deployment permits, save newly discovered prospects, update lead statuses, and identify follow-ups that are due. It records completed actions and reports failures through the dashboard. External email sending remains disabled by default. 

### **4.3 User Interaction** 

Users access a responsive dashboard, define their target customer profile, and start a lead-discovery run. They can monitor progress, inspect company research, review qualification scores and contact details, and edit or approve generated email drafts. The dashboard also displays lead statuses, previous automation runs, and upcoming follow-ups. 

### **4.4 Human Oversight** 

Routine operations, such as retrieving public company information, scoring leads, saving results, detecting duplicates, and preparing email drafts, can run automatically. Users retain control over consequential actions: outreach emails must be reviewed and explicitly approved before sending. The agent must distinguish verified information from AI-generated assessments, handle missing contact details without inventing them, and log external actions and errors for transparency. 

## **5. Functional Requirements** 

**FR-01:** The system shall allow users to define target customer criteria, including industry, company type, and relevant business characteristics. 

**FR-02:** The system shall discover potential companies using available public company data sources and save matching leads. 

**FR-03:** The system shall retrieve relevant company information and use the Gemini API to assess lead suitability, assign a score, and explain the reasoning. 

**FR-04:** The system shall use Hunter.io to find professional email addresses and verify them when supported and permitted by available API credits. 

**FR-05:** The system shall generate personalized outreach email drafts based on company research and qualification results. 

**FR-06:** The system shall provide a dashboard for viewing, searching, filtering, and managing lead records and their statuses. 

**FR-07:** The system shall allow users to review, edit, and approve outreach drafts before any email is sent. **FR-08:** The system shall detect duplicate leads and maintain records of automation runs, results, and errors. 

**FR-09:** The system should identify overdue follow-ups and display them in the dashboard. 

**FR-10:** The system should support scheduled lead-discovery runs where the deployment environment permits. 

**FR-11:** The system could provide performance summaries, such as leads discovered, qualified leads, and drafts prepared. 

## **6. Non-Functional Requirements** 

- **Usability:** The application shall provide an intuitive, responsive interface for desktop and mobile users, with clear loading states, progress indicators, and actionable error messages. 

- **Reliability:** The backend shall handle API timeouts, rate limits, unavailable services, malformed AI responses, and partial failures without losing previously saved records. External actions shall avoid unintended duplication. 

- **Security:** API keys and secrets shall be stored in environment variables or an appropriate secrets manager, never exposed in frontend code or committed to source control. External API access shall use appropriate authentication and minimum required permissions. User inputs and AI outputs shall be validated before processing or executing actions. 

- **Performance:** Dashboard interactions should generally complete within two seconds under normal conditions, excluding external API processing. Longer-running discovery and research tasks shall provide progress feedback. 

- **Maintainability:** The application shall use modular frontend, backend, AI integration, and data-access components, with clear configuration, documented API contracts, and automated tests for critical workflows. 

- **Cost:** The initial implementation shall prioritize Gemini's eligible free tier and third-party APIs with verified free access. Usage limits shall be respected, and paid services or billing-enabled infrastructure shall not be required without explicit approval. 

- **Data quality:** The system shall distinguish sourced company information from AI-generated assessments, retain source URLs where available, and never present an unverified email address as verified. 

- **Privacy:** The system shall collect only information necessary for prospecting, respect relevant website terms and applicable privacy and anti-spam requirements, and provide transparent control over outreach actions. 

## **7. System Architecture** 

### **7.1 Architecture Overview** 

LeadFlow AI will use a modular full-stack architecture. The frontend communicates with a backend API, which coordinates company discovery, contact lookup, AI analysis, database operations, and automation. 

**Proposed stack:** React, TypeScript, FastAPI, PostgreSQL, Google Gemini API, Hunter.io, and a company discovery source. 



<!-- Start of picture text -->
React + TatlwindTypeScrit€SSFrontend<br>faeeoe‘ ‘Automation Worker<br>Manual/ Scheduled Triggers<br>ValidationWorkflow(Orchestration = DedupiationEngine Run Status Logs<br>External Services<br>ee Hunterio API ‘Google Gemini APL Firecrawl APL Read / Write<br>ane Contact Discovery Lead Scoring Email Drafts Website Research<br>PostgreSQL Database<br><!-- End of picture text -->

The backend controls all external API requests and validates AI outputs before saving results or performing approved actions. 

### **7.2 Frontend** 

**Framework:** React + TypeScript with Tailwind CSS. 

**Main screens:** 

- **Dashboard:** Lead counts, qualification summaries, recent runs, and pending follow-ups. 

- **Lead Discovery:** Forms for defining target industries, company types, and qualification criteria. 

- **Lead Explorer:** Searchable and filterable prospect list with scores, contact details, and source links. 

- **Lead Details:** Company research, qualification explanations, contact verification status, and activity history. 

- **Outreach Review:** Email draft editor with approve, reject, and save controls. 

- **Settings:** API integration status and automation preferences. 

The interface will include loading states, progress feedback, empty states, and clear error messages. 

### **7.3 Backend** 

**Framework:** Python FastAPI. 

The backend will manage business logic, API integrations, authentication where required, validation, persistence, and workflow execution. 

##### **Proposed endpoints:** 

|**Endpoint**|**Purpose**|
|---|---|
|**POST /api/discovery-runs**|Start a lead discovery workflow|
|**GET /api/discovery-runs/{id}**|Retrieve workflow progress and results|
|**GET /api/leads**|Search, filter, and list leads|
|**GET /api/leads/{id}**|Retrieve a lead's details and research|
|**POST /api/leads/{id}/analyze**|Generate or refresh qualification|
|**POST /api/leads/{id}/draft**|Generate a personalized email draft|
|**PATCH /api/leads/{id}**|Update lead details or status|
|**POST /api/drafts/{id}/approve**|Approve a draft for a permitted outreach action|
|**GET /api/activity**|Retrieve automation history and errors|



The backend will orchestrate each workflow step, persist intermediate results, prevent duplicate leads, and handle external API failures independently. 

### **7.4 AI Layer** 

- **AI provider:** Google Gemini API. 

- **Responsibilities:** Extract relevant company details from supplied evidence, classify prospect suitability, generate qualification explanations, and draft personalized outreach emails. 

- **Output validation:** Require structured JSON matching defined schemas. Validate required fields, score ranges, source references, and output length. Reject malformed responses and distinguish missing evidence from confirmed facts. 

- **Action execution:** Gemini proposes assessments and drafts; the backend independently validates them. External actions require explicit user approval and server-side authorization. The model cannot directly execute arbitrary tools or database commands. 

### **7.5 Data Storage** 

**Database:** PostgreSQL, hosted on a suitable free-tier service if current terms and access permit. 

**The database will store:** 

- **leads:** company name, domain, industry, fit score, qualification status, and source URLs. 

- **contacts:** contact name, role, email, and verification status. 

- **research_records:** research summaries, evidence links, and analysis timestamps. 

- **outreach_drafts:** subject, email body, approval status, and edit history. 

- **automation_runs:** run status, progress, timestamps, and error details. 

- **activity_logs:** important workflow events and external actions. 

- **automation_settings:** discovery criteria and scheduling preferences. 

The backend will retrieve records through a dedicated data-access layer. Credentials and secrets will 

remain outside the database where practical and will never be exposed to the browser. 

### **7.6 Automation and Triggers** 

The initial implementation will support manual discovery runs and, if deployment permits, scheduled checks. 

1. A user starts a discovery run or a scheduled trigger initiates one. 

2. The backend retrieves matching companies from the configured data source. 

3. It checks existing records to avoid duplicates. 

4. It retrieves company information and looks up professional contacts. 

5. Gemini evaluates the evidence and generates qualification results and outreach drafts. 

6. Results are saved to PostgreSQL and displayed in the dashboard. 

7. The user reviews the drafts and explicitly approves any external outreach action. 

**Reliability controls:** Retry transient failures with bounded exponential backoff, respect API rate limits, record failed steps, and make workflow operations idempotent where possible. 

**Scheduling:** A lightweight scheduled worker or deployment scheduler may be used if available without introducing mandatory paid infrastructure. The core application must remain fully demonstrable through manual triggers if scheduling cannot be configured within the deadline. 

## **8. Third-Party APIs and Integrations** 

### **8.1 Gemini API** 

- **Purpose:** Analyze company information, score leads against the user's target customer profile, explain scores, and generate personalized outreach email drafts. 

- **Integration:** The FastAPI backend sends relevant company data and structured prompts to Gemini. Responses are validated before being stored in PostgreSQL. 

- **Limitations:** Free access is available for selected models, but request and token quotas vary by model and project. Exact limits must be checked in Google AI Studio. Free-tier data may be used to improve Google's products. 

### **8.2 Third-Party API 2 — Hunter.io** 

- **Purpose:** Discover potential B2B companies and find professional email addresses for relevant contacts. 

- **Integration:** The backend calls Hunter's API using authenticated HTTP requests, then stores returned company/contact data and available source information. 

- **Free-Tier Limits:** Hunter's free plan advertises 50 credits per month and 30 AI Discover searches per month. API-specific access and credit consumption should be confirmed before implementation. 

### **8.3 Third-Party API 3 — Firecrawl** 

- **Purpose:** Extract readable content from public company websites for research and lead qualification. 

- **Integration:** The backend sends a company's website URL to Firecrawl's scrape endpoint and passes the extracted content to Gemini for analysis. 

- **Free-Tier Limits:** Firecrawl currently provides 1,000 credits per month, with a limit of 10 requests per minute for scrape/search/map endpoints. Credits are shared across its API features; requests may return HTTP 402 after the free allowance is exhausted. 

### **8.4 Integration Error Handling** 

- **Service unavailable or timeout:** Retry transient failures with a limited exponential backoff; show a clear error if retries fail. 

- **Rate limits (HTTP 429):** Respect retry guidance, delay requests, and limit concurrent jobs. 

- **Quota exhausted (including Firecrawl HTTP 402):** Stop calls to that service and notify the user; never switch to a paid plan automatically. 

- **Invalid or incomplete responses:** Validate response schemas and required fields before saving. Mark incomplete results and continue other independent steps when possible. 

- **API key or authentication errors:** Keep keys in environment variables, never expose them to the frontend, and report configuration errors without revealing secrets. 

- **Partial workflow failure:** Save successful results, record failed steps in the activity log, and allow the user to retry only the failed step. 

## **9. End-to-End Automation Workflow** 

**1. Trigger:** The user manually starts a lead discovery run from the dashboard. Scheduled runs may be added if time permits. 

**2. Input:** The user defines a target customer profile, including industry, company size, location, and ideal customer characteristics. 

**3. Processing:** The backend validates the input, checks existing leads for duplicates, and creates an automation run. 

**4. AI Analysis:** Gemini analyzes retrieved company information, scores each lead against the target profile, explains the score, and drafts a personalized outreach email. 

**5. External Actions:** Hunter.io discovers companies and relevant professional contacts. Firecrawl extracts public website content. Gemini performs qualification and email generation. 

**6. Approval:** The user reviews and edits the generated email before approving it. Automatic email sending is excluded from the MVP. 

**7. Storage:** PostgreSQL stores company details, source URLs, contact information, research results, AI scores and explanations, email drafts, lead statuses, and workflow logs. 

**8. Feedback:** The dashboard displays discovered leads, qualification scores, research summaries, contact details, draft emails, and any failed steps. The user can review leads, edit drafts, approve drafts, update statuses, and retry failed operations. 

## **10. Data Model and API Design** 

### **10.1 Data Model** 

The application uses PostgreSQL to store leads, research results, contacts, email drafts, and automation history. 

|**Entity**|**Main fields**|**Relationships**|
|---|---|---|
|**leads**|id, company_name, website,<br>industry, location, company_size,<br>fit_score, fit_reason, status,<br>created_at|Has many contacts, research<br>records, and drafts|
|**contacts**|id, lead_id, name, job_title, email,<br>email_status, source_url|Belongs to one lead|
|**research_records**|id, lead_id, summary, source_urls,<br>researched_at|Belongs to one lead|
|**outreach_drafts**|id, lead_id, contact_id, subject,<br>body, status, created_at,<br>approved_at|Belongs to a lead and optionally a<br>contact|
|**automation_runs**|id, status, input_profile,<br>started_at, completed_at,<br>error_summary|Contains one discovery run's<br>execution history|
|**activity_logs**|id, run_id, lead_id, action, details,<br>created_at|Records workflow events and<br>failures|
|**target_profiles**|id, name, industry, location,<br>company_size, criteria, created_at|Defines the criteria used to<br>discover and qualify leads|



**Relationships:** One lead can have multiple contacts, research records, and outreach drafts. An automation run can process multiple leads and generate multiple activity logs. A target profile can be reused for multiple runs. 

### **10.2 Backend API Endpoints** 

##### **Base path:** /api 

|**Method and endpoint**|**Purpose**|**Input**|**Expected response**|
|---|---|---|---|
|**POST /target-profiles**|Create a target customer<br>profile|Industry, location,<br>company size, criteria|Created profile|
|**GET /target-profiles**|List saved profiles|Optional filters|Array of profiles|
|**POST /discovery-runs**|Start lead discovery|profile_id|Run ID and initial status|
|**GET /discovery-runs/{id}**|Check run progress|Run ID|Status, progress, errors,<br>result counts|
|**GET /leads**|List and filter leads|Search, status, score<br>range|Paginated lead list|
|**GET /leads/{id}**|Retrieve lead details|Lead ID|Company, contacts,<br>research, drafts|
|**POST**<br>**/leads/{id}/analyze**|Research and qualify a<br>lead|Optional target profile ID|Updated score,<br>explanation, research|
|**POST /leads/{id}/draft**|Generate outreach email|Contact ID and optional<br>instructions|Generated email draft|
|**PATCH /leads/{id}**|Update lead details or<br>status|Fields to update|Updated lead|
|**PATCH /drafts/{id}**|Edit a draft|Subject and/or body|Updated draft|
|**POST**<br>**/drafts/{id}/approve**|Approve a draft for use|Draft ID|Approved draft status;<br>does not send email|
|**GET /activity**|View workflow history|Optional run ID or lead<br>ID|Activity log entries|



##### **API design rules** 

- Use JSON for requests and responses. 

- Validate inputs and return appropriate HTTP status codes, including 400 for invalid input, 404 for missing records, 429 for rate limits, and 500 for unexpected server errors. 

- Use pagination for lead lists. 

- Validate external API and Gemini responses before storing results. 

- Protect API keys on the backend and keep them out of frontend code. 

- Run discovery asynchronously so the dashboard can poll the run-status endpoint without waiting for the entire workflow to finish. 

**MVP priority:** Implement profile creation, discovery runs, lead listing/details, lead analysis, draft generation, draft editing, and approval first. Add activity filtering and other refinements if time permits. 

## **11. Implementation Plan** 

**1. Research and Workflow Analysis:** Analyze the sales lead generation process, identify user needs, and verify API capabilities and free-tier limits. 

**2. Solution Design and Approval:** Finalize the SRS, architecture, data model, API endpoints, and workflow. Send the design document to kidus@brain3.ai and obtain approval before coding. 

**3. Frontend and Backend Implementation:** Build the React + TypeScript dashboard, FastAPI backend, PostgreSQL database, and core API endpoints. 

**4. Gemini and Third-Party API Integration:** Integrate Gemini for lead qualification and email drafting, Hunter.io for company/contact discovery, and Firecrawl for website research. 

**5. Automation Implementation:** Connect the workflow from lead discovery through research, scoring, contact retrieval, draft generation, storage, and human approval. 

**6. Testing and Bug Fixing:** Test API endpoints, input validation, duplicate detection, failure handling, AI response validation, and the complete workflow. 

**7. Documentation and Video Demonstration:** Prepare the README, setup instructions, environment-variable template, API documentation, and a short demonstration video showing the working application. 

**Development priority:** Deliver a working end-to-end MVP first, then improve the interface and add optional features if time remains. 

## **12. Testing and Evaluation** 

### **12.1 Testing Strategy** 

- **Unit Testing:** Test input validation, lead scoring logic, duplicate detection, data models, and AI response validation. 

- **Integration Testing:** Test FastAPI endpoints, PostgreSQL operations, Gemini responses, and Hunter.io and Firecrawl API integrations. Mock external services when needed. 

- **End-to-End Testing:** Run the complete workflow from target profile submission to lead discovery, company research, qualification, email drafting, and human approval. 

- **Error Testing:** Simulate API timeouts, rate limits, invalid responses, missing API keys, and database failures to verify safe recovery and clear error reporting. 

- **User Interface Testing:** Verify dashboard usability, progress indicators, lead filtering, draft editing, and approval controls. 

### **12.2 Acceptance Criteria** 

The initial version will be considered successful when: 

- A user can create a target profile and start a discovery run. 

- The system discovers and saves leads without creating unnecessary duplicates. 

- Gemini scores leads and explains its reasoning using retrieved company information. 

- At least two relevant third-party APIs—Hunter.io and Firecrawl—are integrated. 

- The system generates personalized outreach drafts for user review. 

- Users can monitor run status, inspect results, edit drafts, and approve them without automatically sending emails. 

- API failures and invalid responses are reported clearly, and successful results are preserved. 

- The application can complete a demonstration workflow using valid API credentials. 

### **12.3 Success Metrics** 

The following are evaluation targets, not measured results. 

|**Metric**|**Measurement**|**Initial target**|
|---|---|---|
|**Workflow completion**|Successful runs ÷ total test runs|At least 80% in controlled tests|
|**Lead processing**|Leads successfully saved and<br>analyzed|At least 5 leads in a demo run,<br>subject to API quotas|
|**AI output validity**|Responses passing schema<br>validation|At least 95% in test cases|
|**Duplicate prevention**|Duplicate records created during<br>repeated runs|Zero in defined duplicate test cases|
|**Error visibility**|Simulated failures correctly<br>reported or logged|100% of tested failure cases|
|**Time saved**|Manual processing time compared<br>with assisted workflow|Measure during evaluation; no<br>savings claimed beforehand|
|**User control**|Drafts sent without explicit<br>approval|Zero|



Metrics will be measured using test runs, application logs, and a timed comparison with the manual lead research process. Actual results will be documented after testing. 

## **13. Deployment and Configuration** 

- **Hosting Platform:** Vercel for the React frontend; Render for the FastAPI backend; Supabase for PostgreSQL. Local deployment will remain available for development and demonstration. 

- **Environment Variables:** 

```
GEMINI_API_KEY=
HUNTER_API_KEY=
FIRECRAWL_API_KEY=
DATABASE_URL=
FRONTEND_ORIGIN=
```

Secrets will be configured in the hosting platforms' environment settings and excluded from Git. A .env.example file will document the required variables without real credentials. 

- **Deployment Process:** 

   1. Store the source code in GitHub. 

   2. Provision the database and configure environment variables. 

   3. Deploy the FastAPI backend and apply database migrations. 

   4. Deploy the frontend and configure its backend API URL. 

   5. Test API connectivity, database access, and one complete workflow. 

   6. Document local setup as a fallback if deployment takes too long. 

- **Free-Tier Restrictions:** Hosting providers may impose usage quotas, sleep inactive services, or limit database storage and compute. Gemini, Hunter.io, and Firecrawl also have usage quotas. Confirm current account-specific limits before deployment; the application must not enable paid usage automatically. 

- **Monitoring and Logging:** Use application logs to record run IDs, workflow stages, execution status, duration, and sanitized error details. Display progress and failures in the dashboard. Add a basic health-check endpoint and avoid logging API keys, credentials, or unnecessary personal information. 

## **14. Limitations and Future Improvements** 

### **14.1 Known Limitations** 

- **Limited API quotas:** Free-tier limits restrict the number of companies and contacts that can be discovered and researched. 

- **Data accuracy:** Public company information may be outdated, incomplete, or difficult to verify. 

- **AI reliability:** Gemini may produce incorrect lead scores or generic email drafts; human review remains necessary. 

- **Contact availability:** Professional email addresses may not be available for every company or contact. 

- **Limited automation:** The initial version focuses on lead discovery, qualification, and drafting rather than complete sales campaign management. 

- **No automatic email sending:** Users must review and approve drafts; sending and delivery tracking are outside the MVP. 

- **Deployment constraints:** Free hosting may introduce cold starts, resource limits, and restrictions on background scheduling. 

- **Single-user focus:** Advanced team collaboration, permissions, and multi-tenant account management are not included. 

### **14.2 Future Improvements** 

- Integrate additional reliable company-data and contact-discovery providers. 

- Add configurable scheduled discovery and automated follow-up reminders. 

- Integrate email providers to send approved messages and track replies, bounces, and engagement. 

- Add CRM integrations such as HubSpot and Salesforce. 

- Improve lead scoring using user feedback and historical conversion data. 

- Add team workspaces, role-based access control, and collaboration. 

- Build analytics dashboards for conversion rates, outreach performance, and lead quality. 

- Add stronger source verification, contact-data freshness checks, and explainable scoring. 

- Support multilingual outreach and customizable sales strategies. 

- Introduce scalable background queues, workflow retries, and more advanced monitoring as usage grows. 

## **15. References** 

### **15.1 AI and Third-Party API Documentation** 

1. Google Gemini API Documentation — Model integration, generation, and API usage. <u>https://ai.google.dev/gemini-api/docs</u> 

2. Google Gemini API Pricing and Free-Tier Limits — Model-specific pricing and quotas. <u>https://ai.google.dev/gemini-api/docs/pricing</u> 

3. Hunter.io API Documentation — Company discovery, domain search, email finding, and verification. <u>https://hunter.io/api-documentation/</u> 

4. Firecrawl Documentation — Website scraping and extraction API. <u>https://docs.firecrawl.dev/</u> 

5. Supabase Documentation — PostgreSQL hosting and database configuration. <u>https://supabase.com/docs</u> 

6. Vercel Documentation — Frontend deployment and configuration. <u>https://vercel.com/docs</u> 

7. Render Documentation — Backend deployment and hosting configuration. <u>https://render.com/docs</u> 

8. HubSpot Sales Hub — Reference for CRM workflows, lead management, and sales pipeline tracking. <u>https://www.hubspot.com/products/sales</u> 

9. Salesforce Sales Cloud — Reference for prospect management, sales activities, and customer relationship workflows. https://www.salesforce.com/sales/ 

