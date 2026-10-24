import type {
  DashboardStats,
  Lead,
  LeadDetail,
  OutreachDraft,
  TargetProfile,
  AutomationRun,
  ActivityLog,
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
  // Chatbot
  sendChat: (messages: { role: string; content: string }[]) =>
    request<{ role: string; content: string }>('/chat', {
      method: 'POST',
      body: JSON.stringify({ messages }),
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
  getLeads: (params?: { search?: string; status?: string; min_score?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.status && params.status !== 'ALL') searchParams.append('status', params.status);
    if (params?.min_score !== undefined) searchParams.append('min_score', params.min_score.toString());
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request<Lead[]>(`/leads${query}`);
  },

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

  // Activity Logs
  getActivityLogs: (limit: number = 50) => request<ActivityLog[]>(`/activity?limit=${limit}`),
};
