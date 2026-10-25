export interface PipelineContact {
  id?: number | null;
  name?: string;
  first_name?: string | null;
  last_name?: string | null;
  job_title?: string | null;
  email?: string | null;
  email_status: string;
  confidence_score?: number | null;
}

export interface ParsedCriteria {
  industry: string;
  location: string;
  target_quantity: number;
  service_offered: string;
  require_no_website: boolean;
}

export interface PipelineDraft {
  id: number;
  subject: string;
  body: string;
  status: 'DRAFT' | 'APPROVED' | 'REJECTED' | 'SENT' | 'FAILED';
  approved_at?: string | null;
  sent_at?: string | null;
  send_error?: string | null;
}

export interface PipelineLead {
  id: number;
  company_name: string;
  website: string;
  industry?: string | null;
  location?: string | null;
  company_size?: string | null;
  description?: string | null;
  email_count?: number | null;
  website_status?: 'HAS_OFFICIAL_WEBSITE' | 'NO_OFFICIAL_WEBSITE_FOUND' | 'WEBSITE_STATUS_UNCERTAIN' | string | null;
  website_evidence?: string | null;
  fit_score: number;
  fit_reason?: string | null;
  fit_strengths?: string[];
  fit_risks?: string[];
  qualification_status?: 'QUALIFIED' | 'UNQUALIFIED' | 'REJECTED_MISMATCH' | string;
  research_summary?: string | null;
  contacts: PipelineContact[];
  draft?: PipelineDraft | null;
  follow_up_date?: string | null;
  follow_up_notes?: string | null;
  follow_up_status?: string | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  parsed_criteria?: ParsedCriteria | null;
  pipeline_leads?: PipelineLead[] | null;
  qualified_count?: number;
  total_candidates?: number;
  show_form?: boolean;
  suggested_form_criteria?: LeadSearchRequest | null;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface TargetProfile {
  id: number;
  name: string;
  industry: string;
  location?: string | null;
  company_size?: string | null;
  criteria: string;
  created_at: string;
}

export interface Contact {
  id: number;
  lead_id: number;
  name: string;
  job_title?: string | null;
  email?: string | null;
  email_status: 'verified' | 'unverified' | 'invalid';
  confidence_score?: number | null;
  source_url?: string | null;
  created_at: string;
}

export interface ResearchRecord {
  id: number;
  lead_id: number;
  summary?: string | null;
  raw_content?: string | null;
  source_urls?: string[] | null;
  researched_at: string;
}

export interface OutreachDraft {
  id: number;
  lead_id: number;
  contact_id?: number | null;
  subject: string;
  body: string;
  status: 'DRAFT' | 'APPROVED' | 'REJECTED';
  created_at: string;
  approved_at?: string | null;
  contact?: Contact | null;
}

export interface Lead {
  id: number;
  profile_id?: number | null;
  company_name: string;
  website: string;
  industry?: string | null;
  location?: string | null;
  company_size?: string | null;
  fit_score?: number | null;
  fit_reason?: string | null;
  fit_strengths?: string[] | null;
  fit_risks?: string[] | null;
  status: 'NEW' | 'QUALIFIED' | 'UNQUALIFIED' | 'CONTACTED' | 'ARCHIVED';
  source_url?: string | null;
  website_status?: string | null;
  contacts?: Contact[];
  drafts?: OutreachDraft[];
  follow_up_date?: string | null;
  follow_up_notes?: string | null;
  follow_up_status?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadDetail extends Lead {
  contacts: Contact[];
  research_records: ResearchRecord[];
  drafts: OutreachDraft[];
  profile?: TargetProfile | null;
}

export interface AutomationRun {
  id: number;
  profile_id?: number | null;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  leads_discovered: number;
  leads_qualified: number;
  drafts_generated: number;
  error_summary?: string | null;
  started_at: string;
  completed_at?: string | null;
}

export interface ActivityLog {
  id: number;
  run_id?: number | null;
  lead_id?: number | null;
  action: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  details?: string | null;
  created_at: string;
}

export interface OverdueLeadItem {
  id: number;
  company_name: string;
  website: string;
  location?: string | null;
  industry?: string | null;
  follow_up_date: string;
  follow_up_notes?: string | null;
  follow_up_status?: string | null;
  days_overdue: number;
}

export interface PerformanceSummary {
  total_leads_discovered: number;
  total_qualified_leads: number;
  total_drafts_prepared: number;
  total_approved_drafts: number;
  total_sent_emails: number;
  qualification_rate: number;
}

export interface DiscoverySchedule {
  id: number;
  profile_id?: number | null;
  name: string;
  interval_hours: number;
  industry: string;
  location?: string | null;
  company_size?: string | null;
  criteria: string;
  max_leads: number;
  is_active: boolean;
  last_run_at?: string | null;
  next_run_at?: string | null;
  created_at: string;
}

export interface DashboardStats {
  total_leads: number;
  qualified_leads: number;
  pending_drafts: number;
  approved_drafts: number;
  overdue_followups_count?: number;
  total_drafts_prepared?: number;
  sent_emails?: number;
  qualification_rate?: number;
  overdue_leads?: OverdueLeadItem[];
  performance_summary?: PerformanceSummary;
  recent_runs: AutomationRun[];
  recent_activities: ActivityLog[];
}

export interface LeadSearchRequest {
  campaign_name?: string;
  target_business: string[];
  service_offered: string;
  location: string;
  decision_makers: string[];
  company_size?: string;
  website_status: 'Any' | 'Missing' | 'Outdated' | 'Missing or Outdated' | string;
  lead_quantity: number;
  min_qualification_score: number;
}

export interface LeadSearchResponse {
  campaign_name?: string | null;
  pipeline_leads: PipelineLead[];
  qualified_count: number;
  total_candidates: number;
  min_qualification_score: number;
  search_summary: string;
  run_id?: number | null;
  logs?: ActivityLog[];
}



