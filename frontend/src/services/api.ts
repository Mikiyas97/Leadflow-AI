import type {
  DashboardStats,
  Lead,
  LeadDetail,
  OutreachDraft,
  TargetProfile,
  AutomationRun,
  ActivityLog,
  DiscoverySchedule,
  LeadSearchRequest,
  LeadSearchResponse,
} from '../types';

const API_BASE = '/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        errorDetail = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  // Targeted Lead Search (9 Controlled Fields)
  searchLeads: (data: LeadSearchRequest) =>
    request<LeadSearchResponse>('/leads/search', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Chatbot
  sendChat: (messages: { role: string; content: string }[], criteria?: LeadSearchRequest) =>
    request<{
      role: string;
      content: string;
      parsed_criteria?: any;
      pipeline_leads?: any[];
      qualified_count?: number;
      total_candidates?: number;
      show_form?: boolean;
      suggested_form_criteria?: LeadSearchRequest | null;
    }>('/chat', {
      method: 'POST',
      body: JSON.stringify({ messages, criteria }),
    }),

  // Health
  checkHealth: () => request<{ status: string; database: string; gemini_configured: boolean; hunter_configured: boolean; firecrawl_configured: boolean }>('/health'),

  // Dashboard
  getDashboardStats: () => request<DashboardStats>('/dashboard/stats'),

  // Target Profiles
  getProfiles: () => request<TargetProfile[]>('/target-profiles'),
  createProfile: (data: Omit<TargetProfile, 'id' | 'created_at'>) =>
    request<TargetProfile>('/target-profiles', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteProfile: (id: number) =>
    request<void>(`/target-profiles/${id}`, { method: 'DELETE' }),

  // Leads
  getLeads: (params?: { search?: string; status?: string; min_score?: number; is_overdue?: boolean; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.status && params.status !== 'ALL') searchParams.append('status', params.status);
    if (params?.min_score !== undefined) searchParams.append('min_score', params.min_score.toString());
    if (params?.is_overdue) searchParams.append('is_overdue', 'true');
    searchParams.append('limit', (params?.limit || 250).toString());
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request<Lead[]>(`/leads${query}`);
  },

  getOverdueLeads: () => request<Lead[]>('/leads/overdue'),

  getLead: (id: number) => request<LeadDetail>(`/leads/${id}`),

  updateLead: (id: number, data: Partial<Lead>) =>
    request<Lead>(`/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteLead: (id: number) =>
    request<void>(`/leads/${id}`, { method: 'DELETE' }),

  reanalyzeLead: (id: number, profileId?: number) =>
    request<LeadDetail>(`/leads/${id}/analyze`, {
      method: 'POST',
      body: JSON.stringify({ profile_id: profileId }),
    }),

  generateDraft: (id: number, contactId?: number, customInstructions?: string) =>
    request<OutreachDraft>(`/leads/${id}/draft`, {
      method: 'POST',
      body: JSON.stringify({
        contact_id: contactId,
        custom_instructions: customInstructions,
      }),
    }),

  rescheduleFollowUp: (
    id: number,
    data: { days?: number; date?: string; notes?: string; action_type?: string; status?: string }
  ) =>
    request<{
      lead_id: number;
      follow_up_date: string;
      raw_follow_up_date?: string | null;
      follow_up_notes?: string | null;
      follow_up_status?: string | null;
      status?: string;
    }>(`/leads/${id}/reschedule-followup`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Outreach Drafts
  getDrafts: (status?: string) => {
    const query = status ? `?status=${status}` : '';
    return request<OutreachDraft[]>(`/drafts${query}`);
  },

  updateDraft: (id: number, data: { subject?: string; body?: string; status?: string }) =>
    request<OutreachDraft>(`/drafts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  approveDraft: (id: number) =>
    request<OutreachDraft>(`/drafts/${id}/approve`, {
      method: 'POST',
    }),

  sendDraftEmail: (
    id: number,
    data: { recipient_email?: string; idempotency_key?: string }
  ) =>
    request<{
      success: boolean;
      status: string;
      message: string;
      recipient: string;
      sent_at: string;
      follow_up_date?: string | null;
      draft_id: number;
    }>(`/drafts/${id}/send`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  sendTestEmail: (recipient_email: string) =>
    request<{ success: boolean; message: string }>('/drafts/test-email', {
      method: 'POST',
      body: JSON.stringify({ recipient_email }),
    }),

  // Discovery Runs
  startDiscovery: (data: {
    profile_id?: number;
    industry?: string;
    location?: string;
    company_size?: string;
    criteria?: string;
    max_leads?: number;
  }) =>
    request<AutomationRun>('/discovery-runs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getDiscoveryRun: (id: number) => request<AutomationRun>(`/discovery-runs/${id}`),
  getDiscoveryRuns: () => request<AutomationRun[]>('/discovery-runs'),

  // Discovery Schedules (FR-10)
  getSchedules: () => request<DiscoverySchedule[]>('/schedules'),
  createSchedule: (data: Omit<DiscoverySchedule, 'id' | 'created_at' | 'last_run_at' | 'next_run_at'>) =>
    request<DiscoverySchedule>('/schedules', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateSchedule: (id: number, data: Partial<DiscoverySchedule>) =>
    request<DiscoverySchedule>(`/schedules/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteSchedule: (id: number) =>
    request<void>(`/schedules/${id}`, { method: 'DELETE' }),
  triggerScheduleNow: (id: number) =>
    request<{ success: boolean; message: string; run_id: number }>(`/schedules/${id}/trigger`, {
      method: 'POST',
    }),

  // Activity Logs
  getActivityLogs: (limit: number = 50, run_id?: number) =>
    request<ActivityLog[]>(run_id ? `/activity?limit=${limit}&run_id=${run_id}` : `/activity?limit=${limit}`),
};

