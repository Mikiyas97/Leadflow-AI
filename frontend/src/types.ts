export interface PipelineContact {
  id?: number | null;
  name: string;
  job_title?: string | null;
  email?: string | null;
  email_status: string;
  confidence_score?: number | null;
}

export interface PipelineDraft {
  id: number;
  subject: string;
  body: string;
  status: 'DRAFT' | 'APPROVED' | 'REJECTED';
  approved_at?: string | null;
}

export interface PipelineLead {
  id: number;
  company_name: string;
  website: string;
  industry?: string | null;
  location?: string | null;
  fit_score: number;
  fit_reason?: string | null;
  fit_strengths?: string[];
  research_summary?: string | null;
  contacts: PipelineContact[];
  draft?: PipelineDraft | null;
  follow_up_date?: string | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  pipeline_leads?: PipelineLead[] | null;
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

export interface DashboardStats {
  total_leads: number;
  qualified_leads: number;
  pending_drafts: number;
  approved_drafts: number;
  recent_runs: AutomationRun[];
  recent_activities: ActivityLog[];
}
