import React, { useState, useEffect, useRef } from 'react';
import {
  SlidersHorizontal,
  Sliders,
  MapPin,
  Building2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Users,
  Briefcase,
  Layers,
  RotateCcw,
  ShieldCheck,
  Search,
  Check,
  Plus,
  X,
  Target,
  Sparkles,
  Crown,
  Copy,
  Calendar,
  Globe,
  Send,
  Trash2
} from 'lucide-react';
import type { LeadSearchRequest } from '../types';
import { api } from '../services/api';

interface SearchLeadsViewProps {
  onSelectLead?: (leadId: number) => void;
  onNavigateToManage?: () => void;
  onNavigateToOutreach?: () => void;
  onRefreshParentStats?: () => void;
}

interface ContactItem {
  name: string;
  job_title?: string | null;
  email?: string | null;
  email_status?: string | null;
  confidence_score?: number | null;
  seniority?: 'Executive' | 'Management' | 'Staff';
  is_c_level?: boolean;
}

interface DiscoveredResultItem {
  id: number;
  company_name: string;
  website?: string | null;
  source_url?: string | null;
  industry?: string | null;
  location?: string | null;
  company_size?: string | null;
  founded_year?: number | string | null;
  email_count?: number | null;
  description?: string | null;
  keywords?: string[];
  people_count?: number;
  decision_maker_count?: number;
  generic_count?: number;
  fit_score?: number | null;
  status: string;
  website_status?: string;
  fit_reason?: string | null;
  strengths?: string[];
  risks?: string[];
  fit_strengths?: string[];
  fit_risks?: string[];
  qualification_status?: string;
  website_evidence?: string | null;
  research_summary?: string | null;
  contacts?: ContactItem[];
  draft?: {
    id: number;
    subject: string;
    body: string;
    status: string;
  } | null;
}


// Available options & suggestions for new 9 search fields
const SUGGESTED_TARGET_BUSINESSES = [
  'Hotels',
  'Resorts & Lodges',
  'Restaurants & Cafes',
  'Healthcare & Clinics',
  'FinTech',
  'B2B SaaS',
  'E-Commerce & Retail',
  'Logistics & Freight',
  'Professional Services',
  'Real Estate & Property',
  'Manufacturing'
];

const SUGGESTED_DECISION_MAKERS = [
  'Owner',
  'General Manager',
  'Founder & CEO',
  'Managing Director',
  'Head of IT',
  'Chief Technology Officer',
  'Marketing Director',
  'Operations Manager'
];

const SUGGESTED_LOCATIONS = [
  'Addis Ababa, Ethiopia',
  'Nairobi, Kenya',
  'Lagos, Nigeria',
  'San Francisco, CA, USA',
  'New York, NY, USA',
  'London, United Kingdom',
  'Toronto, Canada',
  'Berlin, Germany',
  'Dubai, UAE'
];

const COMPANY_SIZE_OPTIONS = [
  'Any',
  '1 - 25',
  '25 - 100',
  '100 - 250',
  '250 - 1,000',
  '1,000+'
];

const WEBSITE_STATUS_OPTIONS = [
  { value: 'Any', label: 'Any', desc: 'All companies regardless of web presence' },
  { value: 'Missing', label: 'Missing', desc: 'Confirmed missing official website (listings only)' },
  { value: 'Outdated', label: 'Outdated', desc: 'Legacy or unmaintained official website' },
  { value: 'Missing or Outdated', label: 'Missing or Outdated', desc: 'Either missing official site or outdated' },
];

export const getWebsiteStatusBadge = (status?: string | null) => {
  if (!status) return null;
  switch (status) {
    case 'NO_OFFICIAL_WEBSITE_FOUND':
      return {
        label: 'Missing Web',
        fullLabel: 'Confirmed Missing Official Site',
        className: 'bg-rose-500/15 border-rose-500/30 text-rose-300'
      };
    case 'OUTDATED_WEBSITE':
      return {
        label: 'Outdated Web',
        fullLabel: 'Legacy / Unmaintained Site',
        className: 'bg-amber-500/15 border-amber-500/30 text-amber-300'
      };
    case 'HAS_OFFICIAL_WEBSITE':
      return {
        label: 'Active Web',
        fullLabel: 'Active Official Website',
        className: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
      };
    case 'WEBSITE_STATUS_UNCERTAIN':
      return {
        label: 'Web Uncertain',
        fullLabel: 'Website Status Uncertain',
        className: 'bg-slate-500/15 border-slate-500/30 text-slate-300'
      };
    default:
      return null;
  }
};



const SEARCH_STORAGE_KEY = 'leadflow_search_state';

interface StoredSearchState {
  campaignName?: string;
  targetBusinesses?: string[];
  serviceOffered?: string;
  location?: string;
  decisionMakers?: string[];
  companySize?: string;
  websiteStatus?: string;
  leadQuantity?: number;
  minQualificationScore?: number;
  searchResults?: DiscoveredResultItem[];
  selectedLeadIds?: number[];
  inspectedLead?: DiscoveredResultItem | null;
}

const loadStoredSearchState = (): StoredSearchState | null => {
  try {
    const raw = localStorage.getItem(SEARCH_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed to load search state from localStorage:', err);
  }
  return null;
};

export const SearchLeadsView: React.FC<SearchLeadsViewProps> = ({
  onSelectLead,
  onNavigateToManage: _onNavigateToManage,
  onNavigateToOutreach,
  onRefreshParentStats,
}) => {
  const initial = useRef<StoredSearchState | null>(loadStoredSearchState()).current;

  // 9 Controlled Lead Search Form Fields (restored from localStorage if available)
  const [campaignName, setCampaignName] = useState<string>(() => initial?.campaignName ?? '');
  const [targetBusinesses, setTargetBusinesses] = useState<string[]>(() => initial?.targetBusinesses ?? []);
  const [customBusinessInput, setCustomBusinessInput] = useState<string>('');
  const [serviceOffered, setServiceOffered] = useState<string>(() => initial?.serviceOffered ?? '');
  const [location, setLocation] = useState<string>(() => initial?.location ?? '');
  const [decisionMakers, setDecisionMakers] = useState<string[]>(() => initial?.decisionMakers ?? []);
  const [customDecisionMakerInput, setCustomDecisionMakerInput] = useState<string>('');
  const [companySize, setCompanySize] = useState<string>(() => initial?.companySize ?? 'Any');
  const [websiteStatus, setWebsiteStatus] = useState<string>(() => initial?.websiteStatus ?? 'Any');
  const [leadQuantity, setLeadQuantity] = useState<number>(() => initial?.leadQuantity ?? 10);
  const [minQualificationScore, setMinQualificationScore] = useState<number>(() => initial?.minQualificationScore ?? 60);

  // Dropdown open/close state
  const [openDropdown, setOpenDropdown] = useState<'businesses' | 'decisionMakers' | 'location' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Search execution & selection states (restored from localStorage if available)
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [searchResults, setSearchResults] = useState<DiscoveredResultItem[]>(() => initial?.searchResults ?? []);
  const [selectedLeadIds, setSelectedLeadIds] = useState<number[]>(() => initial?.selectedLeadIds ?? []);

  // Outreach Modal & Batch Campaign state
  const [isOutreachModalOpen, setIsOutreachModalOpen] = useState<boolean>(false);
  const [isBatchGenerating, setIsBatchGenerating] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; companyName: string } | null>(null);
  const [outreachInstructions, setOutreachInstructions] = useState<string>('');
  const [expandedDraftLeadId, setExpandedDraftLeadId] = useState<number | null>(null);
  const [outreachFeedback, setOutreachFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [approvingDraftId, setApprovingDraftId] = useState<number | null>(null);
  const [sendingDraftId, setSendingDraftId] = useState<number | null>(null);

  // In-page inspection state (matches the split view in the reference screenshot)
  const [inspectedLead, setInspectedLead] = useState<DiscoveredResultItem | null>(() => {
    if (initial?.inspectedLead) return initial.inspectedLead;
    if (initial?.searchResults && initial.searchResults.length > 0) return initial.searchResults[0];
    return null;
  });
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [isKeywordsOpen, setIsKeywordsOpen] = useState<boolean>(false);
  const [isExecutiveOpen, setIsExecutiveOpen] = useState<boolean>(true);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Auto-sync search form and discovered results to localStorage so tab switching and browser refresh never lose data
  useEffect(() => {
    try {
      const stateToStore: StoredSearchState = {
        campaignName,
        targetBusinesses,
        serviceOffered,
        location,
        decisionMakers,
        companySize,
        websiteStatus,
        leadQuantity,
        minQualificationScore,
        searchResults,
        selectedLeadIds,
        inspectedLead,
      };
      localStorage.setItem(SEARCH_STORAGE_KEY, JSON.stringify(stateToStore));
    } catch (err) {
      console.warn('Failed to save search state to localStorage:', err);
    }
  }, [
    campaignName,
    targetBusinesses,
    serviceOffered,
    location,
    decisionMakers,
    companySize,
    websiteStatus,
    leadQuantity,
    minQualificationScore,
    searchResults,
    selectedLeadIds,
    inspectedLead,
  ]);

  // Click outside listener to close select dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.choices-select-container')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClearResults = () => {
    setSearchResults([]);
    setInspectedLead(null);
    setSelectedLeadIds([]);
    try {
      const raw = localStorage.getItem(SEARCH_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        localStorage.setItem(
          SEARCH_STORAGE_KEY,
          JSON.stringify({
            ...parsed,
            searchResults: [],
            selectedLeadIds: [],
            inspectedLead: null,
          })
        );
      }
    } catch {
      // ignore
    }
  };

  const handleInspectLead = async (lead: DiscoveredResultItem) => {
    setInspectedLead(lead);
    if (!lead.contacts || lead.contacts.length === 0) {
      try {
        const full = await api.getLead(lead.id);
        if (full) {
          const mappedContacts: ContactItem[] = (full.contacts || []).map((c) => {
            const titleLower = (c.job_title || '').toLowerCase();
            const isExecutive =
              titleLower.includes('director') ||
              titleLower.includes('chief') ||
              titleLower.includes('vp') ||
              titleLower.includes('head') ||
              titleLower.includes('founder') ||
              titleLower.includes('officer');
            const isCLevel =
              titleLower.includes('chief') ||
              titleLower.includes('ceo') ||
              titleLower.includes('cto') ||
              titleLower.includes('cio') ||
              titleLower.includes('cfo');
            return {
              name: c.name,
              job_title: c.job_title || null,
              email: c.email || undefined,
              email_status: c.email_status || 'verified',
              confidence_score: c.confidence_score || undefined,
              seniority: isExecutive ? 'Executive' : 'Management',
              is_c_level: isCLevel
            };
          });

          const updatedLead: DiscoveredResultItem = {
            ...lead,
            company_name: full.company_name,
            website: full.website,
            industry: full.industry || lead.industry,
            location: full.location || lead.location,
            company_size: full.company_size || lead.company_size,
            fit_score: full.fit_score || lead.fit_score,
            fit_reason: full.fit_reason || lead.fit_reason,
            strengths: full.fit_strengths || lead.strengths,
            risks: full.fit_risks || lead.risks,
            contacts: mappedContacts
          };

          setInspectedLead((prev) => (prev?.id === lead.id ? updatedLead : prev));
          setSearchResults((prev) => prev.map((item) => (item.id === lead.id ? updatedLead : item)));
        }
      } catch {
        // ignore
      }
    }
  };

  const handleToggleBusiness = (biz: string) => {
    setTargetBusinesses((prev) =>
      prev.includes(biz) ? prev.filter((b) => b !== biz) : [...prev, biz]
    );
  };

  const handleAddCustomBusiness = () => {
    const val = customBusinessInput.trim();
    if (val && !targetBusinesses.includes(val)) {
      setTargetBusinesses((prev) => [...prev, val]);
      setCustomBusinessInput('');
    }
  };

  const handleToggleDecisionMaker = (dm: string) => {
    setDecisionMakers((prev) =>
      prev.includes(dm) ? prev.filter((d) => d !== dm) : [...prev, dm]
    );
  };

  const handleAddCustomDecisionMaker = () => {
    const val = customDecisionMakerInput.trim();
    if (val && !decisionMakers.includes(val)) {
      setDecisionMakers((prev) => [...prev, val]);
      setCustomDecisionMakerInput('');
    }
  };

  const handleResetForm = () => {
    setCampaignName('');
    setLocation('');
    setTargetBusinesses([]);
    setCustomBusinessInput('');
    setDecisionMakers([]);
    setCustomDecisionMakerInput('');
    setCompanySize('Any');
    setWebsiteStatus('Any');
    setServiceOffered('');
    setLeadQuantity(10);
    setMinQualificationScore(60);
    setOpenDropdown(null);
    setErrorMessage(null);
    setSaveSuccessMessage(null);
  };

  const handleExecuteSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setOpenDropdown(null);

    if (targetBusinesses.length === 0) {
      setErrorMessage('Please include at least one Target Business.');
      return;
    }
    if (!location.trim()) {
      setErrorMessage('Please specify a Location.');
      return;
    }

    setErrorMessage(null);
    setIsSearching(true);
    setActiveStep(1);

    const stepTimer1 = setTimeout(() => {
      setActiveStep(2);
    }, 1100);

    const stepTimer2 = setTimeout(() => {
      setActiveStep(3);
    }, 2600);

    const stepTimer3 = setTimeout(() => {
      setActiveStep(4);
    }, 4500);

    try {
      const payload: LeadSearchRequest = {
        campaign_name: campaignName.trim() || undefined,
        target_business: targetBusinesses,
        service_offered: serviceOffered.trim() || 'Website development',
        location: location.trim(),
        decision_makers: decisionMakers,
        company_size: companySize,
        website_status: websiteStatus,
        lead_quantity: Math.max(1, Math.min(25, Number(leadQuantity) || 10)),
        min_qualification_score: Math.max(0, Math.min(100, Number(minQualificationScore) || 60)),
      };

      const res = await api.searchLeads(payload);

      setActiveStep(4);

      if (res.pipeline_leads && res.pipeline_leads.length > 0) {
        // Rank results by qualification score in descending order (highest score first)
        const sortedLeads = [...res.pipeline_leads].sort((a: any, b: any) => {
          const scoreA = Number(a.fit_score ?? 0);
          const scoreB = Number(b.fit_score ?? 0);
          if (scoreB !== scoreA) {
            return scoreB - scoreA;
          }
          const qualA = a.qualification_status === 'QUALIFIED' ? 1 : 0;
          const qualB = b.qualification_status === 'QUALIFIED' ? 1 : 0;
          return qualB - qualA;
        });
        setSearchResults(sortedLeads as any);
        setInspectedLead(sortedLeads[0] as any);
      } else {
        setSearchResults([]);
        setInspectedLead(null);
      }

      if (onRefreshParentStats) {
        onRefreshParentStats();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Discovery search failed. Please verify API configuration.');
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      setIsSearching(false);
    }
  };

  const cleanDomain = (website?: string | null): string => {
    if (!website) return '';
    return website
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .split('/')[0];
  };

  const formatEmailCount = (lead: DiscoveredResultItem): string => {
    if (lead.email_count !== undefined && lead.email_count !== null) {
      return lead.email_count.toLocaleString();
    }
    if (lead.contacts && lead.contacts.length > 0) {
      return lead.contacts.length.toLocaleString();
    }
    return '0';
  };

  const isHiring = (lead: DiscoveredResultItem): boolean => {
    if (lead.strengths && lead.strengths.some((s) => s.toLowerCase().includes('hiring') || s.toLowerCase().includes('growth'))) {
      return true;
    }
    return false;
  };

  const handleToggleSelectAll = () => {
    if (selectedLeadIds.length === searchResults.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(searchResults.map((l) => l.id));
    }
  };

  const handleToggleSelectLead = (id: number) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2500);
  };

  const handleOpenOutreachModal = () => {
    if (searchResults.length === 0) return;
    if (selectedLeadIds.length === 0) {
      // Auto-select all companies if none currently selected
      setSelectedLeadIds(searchResults.map((l) => l.id));
    }
    setIsOutreachModalOpen(true);
    setOutreachFeedback(null);
  };

  const handleBatchGenerateDrafts = async () => {
    const leadsToProcess = searchResults.filter((l) => selectedLeadIds.includes(l.id));
    if (leadsToProcess.length === 0) return;

    try {
      setIsBatchGenerating(true);
      setOutreachFeedback(null);
      let successCount = 0;

      for (let i = 0; i < leadsToProcess.length; i++) {
        const lead = leadsToProcess[i];
        setBatchProgress({
          current: i + 1,
          total: leadsToProcess.length,
          companyName: lead.company_name,
        });

        try {
          const draft = await api.generateDraft(lead.id, undefined, outreachInstructions.trim() || undefined);
          if (draft) {
            successCount++;
            setSearchResults((prev) =>
              prev.map((item) =>
                item.id === lead.id
                  ? {
                    ...item,
                    draft: {
                      id: draft.id,
                      subject: draft.subject,
                      body: draft.body,
                      status: draft.status,
                    },
                  }
                  : item
              )
            );
            setInspectedLead((prev) =>
              prev && prev.id === lead.id
                ? {
                  ...prev,
                  draft: {
                    id: draft.id,
                    subject: draft.subject,
                    body: draft.body,
                    status: draft.status,
                  },
                }
                : prev
            );
          }
        } catch (err: any) {
          console.warn(`Failed to generate draft for lead ${lead.id}`, err);
        }
      }

      setOutreachFeedback({
        type: 'success',
        message: `Successfully drafted ${successCount} personalized cold outreach email(s) with Gemini!`,
      });
      if (onRefreshParentStats) {
        onRefreshParentStats();
      }
    } catch (err: any) {
      setOutreachFeedback({
        type: 'error',
        message: err.message || 'Batch draft generation encountered an issue.',
      });
    } finally {
      setIsBatchGenerating(false);
      setBatchProgress(null);
    }
  };

  const handleGenerateSingleDraft = async (leadId: number) => {
    try {
      setApprovingDraftId(leadId);
      const draft = await api.generateDraft(leadId, undefined, outreachInstructions.trim() || undefined);
      if (draft) {
        setSearchResults((prev) =>
          prev.map((item) =>
            item.id === leadId
              ? {
                ...item,
                draft: {
                  id: draft.id,
                  subject: draft.subject,
                  body: draft.body,
                  status: draft.status,
                },
              }
              : item
          )
        );
        setExpandedDraftLeadId(leadId);
        setOutreachFeedback({
          type: 'success',
          message: `Generated outreach email: "${draft.subject}"`,
        });
        if (onRefreshParentStats) onRefreshParentStats();
      }
    } catch (err: any) {
      setOutreachFeedback({
        type: 'error',
        message: err.message || 'Could not generate draft.',
      });
    } finally {
      setApprovingDraftId(null);
    }
  };

  const handleApproveDraft = async (leadId: number, draftId: number) => {
    try {
      setApprovingDraftId(draftId);
      const updated = await api.approveDraft(draftId);
      setSearchResults((prev) =>
        prev.map((item) =>
          item.id === leadId && item.draft
            ? { ...item, draft: { ...item.draft, status: updated.status } }
            : item
        )
      );
      setOutreachFeedback({
        type: 'success',
        message: 'Draft approved for dispatch!',
      });
      if (onRefreshParentStats) onRefreshParentStats();
    } catch (err: any) {
      setOutreachFeedback({
        type: 'error',
        message: err.message || 'Could not approve draft.',
      });
    } finally {
      setApprovingDraftId(null);
    }
  };

  const handleApproveAllPending = async () => {
    const leadsWithPendingDrafts = searchResults.filter(
      (l) => selectedLeadIds.includes(l.id) && l.draft && l.draft.status === 'DRAFT'
    );
    if (leadsWithPendingDrafts.length === 0) return;

    try {
      setApprovingDraftId(-1);
      for (const lead of leadsWithPendingDrafts) {
        if (lead.draft) {
          await api.approveDraft(lead.draft.id);
        }
      }
      setSearchResults((prev) =>
        prev.map((item) =>
          selectedLeadIds.includes(item.id) && item.draft && item.draft.status === 'DRAFT'
            ? { ...item, draft: { ...item.draft, status: 'APPROVED' } }
            : item
        )
      );
      setOutreachFeedback({
        type: 'success',
        message: `Approved all ${leadsWithPendingDrafts.length} pending draft(s)!`,
      });
      if (onRefreshParentStats) onRefreshParentStats();
    } catch (err: any) {
      setOutreachFeedback({
        type: 'error',
        message: err.message || 'Could not approve all drafts.',
      });
    } finally {
      setApprovingDraftId(null);
    }
  };

  const handleSendDraftEmail = async (leadId: number, draftId: number, recipientEmail?: string) => {
    if (!recipientEmail) {
      setOutreachFeedback({
        type: 'error',
        message: 'No verified recipient email address found for this lead.',
      });
      return;
    }
    try {
      setSendingDraftId(draftId);
      const res = await api.sendDraftEmail(draftId, { recipient_email: recipientEmail });
      setSearchResults((prev) =>
        prev.map((item) =>
          item.id === leadId && item.draft
            ? { ...item, draft: { ...item.draft, status: 'SENT' } }
            : item
        )
      );
      setOutreachFeedback({
        type: 'success',
        message: res.message || `Outreach email sent successfully to ${recipientEmail}!`,
      });
      if (onRefreshParentStats) onRefreshParentStats();
    } catch (err: any) {
      setOutreachFeedback({
        type: 'error',
        message: err.message || 'Failed to send outreach email via SMTP.',
      });
    } finally {
      setSendingDraftId(null);
    }
  };

  const selectedLeadsList =
    selectedLeadIds.length > 0
      ? searchResults.filter((l) => selectedLeadIds.includes(l.id))
      : searchResults;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-4 animate-fade-in font-sans" ref={dropdownRef}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-[#1c1c24]">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-[#f95721]" />
            <span>Search Leads</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Click any field to select from choices. Select a company from the list to view its Hunter.io profile & email addresses.
          </p>
        </div>
      </div>


      {/* Saved Success Notification */}
      {saveSuccessMessage && (
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {/* LeadFlow AI Lead Search Form with 9 Controlled Fields */}
      <form onSubmit={handleExecuteSearch} className="bg-[#121217] border border-[#22222c] rounded-2xl p-4 sm:p-5 shadow-xl space-y-3.5">

        {/* Row 1: Campaign Name & Service Offered */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Field 1: Campaign Name */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1">
              <Target className="w-3 h-3 text-[#f95721]" />
              <span>Campaign Name</span>
            </label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Addis Hotel Website Leads"
              className="w-full px-3 py-2 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white font-medium focus:outline-none focus:border-[#f95721]"
            />
          </div>

          {/* Field 3: Service Offered */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1">
              <Briefcase className="w-3 h-3 text-[#f95721]" />
              <span>Service Offered</span>
            </label>
            <input
              type="text"
              value={serviceOffered}
              onChange={(e) => setServiceOffered(e.target.value)}
              placeholder="e.g. Website development"
              className="w-full px-3 py-2 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white font-medium focus:outline-none focus:border-[#f95721]"
            />
          </div>
        </div>

        {/* Row 2: Target Business, Location, Decision-Maker, Company Size */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

          {/* Field 2: Target Business (Searchable Multi-Select / Token input) */}
          <div className="relative choices-select-container">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1">
              <Building2 className="w-3 h-3 text-[#f95721]" />
              <span>Target Business</span>
            </label>

            <div
              onClick={() => setOpenDropdown(openDropdown === 'businesses' ? null : 'businesses')}
              className={`min-h-[38px] px-2.5 py-1.5 rounded-xl bg-[#0c0c10] border text-xs cursor-pointer flex items-center justify-between gap-1.5 transition-all ${openDropdown === 'businesses'
                ? 'border-[#f95721] ring-1 ring-[#f95721]/30 shadow-md'
                : 'border-[#22222e] hover:border-[#333346]'
                }`}
            >
              <div className="flex flex-wrap items-center gap-1 overflow-hidden max-h-[46px]">
                {targetBusinesses.length > 0 ? (
                  <>
                    {targetBusinesses.slice(0, 1).map((biz) => (
                      <span
                        key={biz}
                        className="px-1.5 py-0.5 rounded bg-[#181824] border border-[#2a2a3c] text-[10px] text-slate-200 font-medium flex items-center gap-1 shrink-0"
                      >
                        <span className="truncate max-w-[90px]">{biz}</span>
                        <X
                          className="w-2.5 h-2.5 text-slate-400 hover:text-red-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleBusiness(biz);
                          }}
                        />
                      </span>
                    ))}
                    {targetBusinesses.length > 1 && (
                      <span className="text-[10px] text-[#f95721] font-mono px-1">
                        +{targetBusinesses.length - 1}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-slate-500 text-xs">e.g. Hotels...</span>
                )}
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${openDropdown === 'businesses' ? 'rotate-180 text-[#f95721]' : ''}`} />
            </div>

            {openDropdown === 'businesses' && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#121217] border border-[#262638] rounded-xl shadow-2xl p-2.5 space-y-2 max-h-64 overflow-y-auto animate-fade-in"
              >
                <div className="flex items-center justify-between text-[10px] pb-1 border-b border-[#1c1c28]">
                  <span className="text-slate-400 font-semibold uppercase">Target Business Types</span>
                  <button
                    type="button"
                    onClick={() => setTargetBusinesses([])}
                    className="text-slate-400 hover:text-white"
                  >
                    Clear
                  </button>
                </div>

                <div className="space-y-1">
                  {SUGGESTED_TARGET_BUSINESSES.map((biz) => {
                    const isSelected = targetBusinesses.includes(biz);
                    return (
                      <div
                        key={biz}
                        onClick={() => handleToggleBusiness(biz)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${isSelected ? 'bg-[#f95721]/15 text-white font-medium' : 'text-slate-300 hover:bg-[#181824]'}`}
                      >
                        <span className="truncate">{biz}</span>
                        {isSelected ? (
                          <Check className="w-3.5 h-3.5 text-[#f95721]" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded border border-[#333346]" />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-[#1c1c28] flex items-center gap-1.5">
                  <input
                    type="text"
                    value={customBusinessInput}
                    onChange={(e) => setCustomBusinessInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomBusiness();
                      }
                    }}
                    placeholder="Add business type..."
                    className="flex-1 px-2.5 py-1 rounded-lg bg-[#0c0c10] border border-[#22222e] text-[11px] text-white focus:outline-none focus:border-[#f95721]"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomBusiness}
                    className="p-1 rounded-lg bg-[#181824] hover:bg-[#202030] text-slate-300 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Field 4: Location (Location input with suggestions & custom typing) */}
          <div className="relative choices-select-container">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1">
              <MapPin className="w-3 h-3 text-[#f95721]" />
              <span>Location</span>
            </label>

            <div
              onClick={() => setOpenDropdown(openDropdown === 'location' ? null : 'location')}
              className={`min-h-[38px] px-2.5 py-1.5 rounded-xl bg-[#0c0c10] border text-xs cursor-pointer flex items-center justify-between gap-1.5 transition-all ${openDropdown === 'location'
                ? 'border-[#f95721] ring-1 ring-[#f95721]/30 shadow-md'
                : 'border-[#22222e] hover:border-[#333346]'
                }`}
            >
              <span className="text-white font-medium truncate">
                {location || <span className="text-slate-500">e.g. Addis Ababa, Ethiopia</span>}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${openDropdown === 'location' ? 'rotate-180 text-[#f95721]' : ''}`} />
            </div>

            {openDropdown === 'location' && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#121217] border border-[#262638] rounded-xl shadow-2xl p-2.5 space-y-2 max-h-60 overflow-y-auto animate-fade-in"
              >
                <div className="text-[10px] text-slate-400 font-semibold uppercase pb-1 border-b border-[#1c1c28]">
                  Select or Enter Location
                </div>

                <div className="space-y-1">
                  {SUGGESTED_LOCATIONS.map((loc) => {
                    const isSelected = location.toLowerCase().includes(loc.toLowerCase());
                    return (
                      <div
                        key={loc}
                        onClick={() => {
                          setLocation(loc);
                          setOpenDropdown(null);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${isSelected ? 'bg-[#f95721]/15 text-white font-medium' : 'text-slate-300 hover:bg-[#181824]'}`}
                      >
                        <span>{loc}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#f95721]" />}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-[#1c1c28]">
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Type custom location..."
                    className="w-full px-2.5 py-1 rounded-lg bg-[#0c0c10] border border-[#22222e] text-[11px] text-white focus:outline-none focus:border-[#f95721]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Field 5: Decision-Maker (Multi-Select / Token input) */}
          <div className="relative choices-select-container">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1">
              <Users className="w-3 h-3 text-[#f95721]" />
              <span>Decision-Maker</span>
            </label>

            <div
              onClick={() => setOpenDropdown(openDropdown === 'decisionMakers' ? null : 'decisionMakers')}
              className={`min-h-[38px] px-2.5 py-1.5 rounded-xl bg-[#0c0c10] border text-xs cursor-pointer flex items-center justify-between gap-1.5 transition-all ${openDropdown === 'decisionMakers'
                ? 'border-[#f95721] ring-1 ring-[#f95721]/30 shadow-md'
                : 'border-[#22222e] hover:border-[#333346]'
                }`}
            >
              <div className="flex flex-wrap items-center gap-1 overflow-hidden max-h-[46px]">
                {decisionMakers.length > 0 ? (
                  <>
                    {decisionMakers.slice(0, 1).map((dm) => (
                      <span
                        key={dm}
                        className="px-1.5 py-0.5 rounded bg-[#181824] border border-[#2a2a3c] text-[10px] text-slate-200 font-medium flex items-center gap-1 shrink-0"
                      >
                        <span className="truncate max-w-[85px]">{dm}</span>
                        <X
                          className="w-2.5 h-2.5 text-slate-400 hover:text-red-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleDecisionMaker(dm);
                          }}
                        />
                      </span>
                    ))}
                    {decisionMakers.length > 1 && (
                      <span className="text-[10px] text-[#f95721] font-mono px-1">
                        +{decisionMakers.length - 1}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-slate-500 text-xs">e.g. Owner, General Manager</span>
                )}
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${openDropdown === 'decisionMakers' ? 'rotate-180 text-[#f95721]' : ''}`} />
            </div>

            {openDropdown === 'decisionMakers' && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#121217] border border-[#262638] rounded-xl shadow-2xl p-2.5 space-y-2 max-h-64 overflow-y-auto animate-fade-in"
              >
                <div className="flex items-center justify-between text-[10px] pb-1 border-b border-[#1c1c28]">
                  <span className="text-slate-400 font-semibold uppercase">Target Decision-Makers</span>
                  <button
                    type="button"
                    onClick={() => setDecisionMakers([])}
                    className="text-slate-400 hover:text-white"
                  >
                    Clear
                  </button>
                </div>

                <div className="space-y-1">
                  {SUGGESTED_DECISION_MAKERS.map((dm) => {
                    const isSelected = decisionMakers.includes(dm);
                    return (
                      <div
                        key={dm}
                        onClick={() => handleToggleDecisionMaker(dm)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${isSelected ? 'bg-[#f95721]/15 text-white font-medium' : 'text-slate-300 hover:bg-[#181824]'}`}
                      >
                        <span className="truncate">{dm}</span>
                        {isSelected ? (
                          <Check className="w-3.5 h-3.5 text-[#f95721]" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded border border-[#333346]" />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-[#1c1c28] flex items-center gap-1.5">
                  <input
                    type="text"
                    value={customDecisionMakerInput}
                    onChange={(e) => setCustomDecisionMakerInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomDecisionMaker();
                      }
                    }}
                    placeholder="Add custom role..."
                    className="flex-1 px-2.5 py-1 rounded-lg bg-[#0c0c10] border border-[#22222e] text-[11px] text-white focus:outline-none focus:border-[#f95721]"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomDecisionMaker}
                    className="p-1 rounded-lg bg-[#181824] hover:bg-[#202030] text-slate-300 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Field 6: Company Size (Optional select; default Any) */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1">
              <Layers className="w-3 h-3 text-[#f95721]" />
              <span>Company Size</span>
            </label>
            <select
              value={companySize}
              onChange={(e) => setCompanySize(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white focus:outline-none focus:border-[#f95721]"
            >
              {COMPANY_SIZE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === 'Any' ? 'Any (Optional)' : `${opt} employees`}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Row 3: Website Status, Lead Quantity, Minimum Qualification Score & Submit Actions */}
        <div className="pt-2 border-t border-[#1c1c26] grid grid-cols-1 md:grid-cols-12 gap-3 items-center text-xs">

          {/* Field 7: Website Status */}
          <div className="md:col-span-3">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1">
              <Globe className="w-3 h-3 text-[#f95721]" />
              <span>Website Status</span>
            </label>
            <select
              value={websiteStatus}
              onChange={(e) => setWebsiteStatus(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white focus:outline-none focus:border-[#f95721]"
            >
              {WEBSITE_STATUS_OPTIONS.map((ws) => (
                <option key={ws.value} value={ws.value}>
                  {ws.label}
                </option>
              ))}
            </select>
          </div>

          {/* Field 8: Lead Quantity */}
          <div className="md:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1">
              <Sliders className="w-3 h-3 text-[#f95721]" />
              <span>Quantity</span>
            </label>
            <input
              type="number"
              min={1}
              max={25}
              value={leadQuantity}
              onChange={(e) => setLeadQuantity(Math.max(1, Math.min(25, Number(e.target.value) || 1)))}
              className="w-full px-3 py-1.5 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white focus:outline-none focus:border-[#f95721]"
            />
          </div>

          {/* Field 9: Minimum Qualification Score (Slider + Number) */}
          <div className="md:col-span-4">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Min Qual Score</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={minQualificationScore}
                onChange={(e) => setMinQualificationScore(Number(e.target.value))}
                className="flex-1 h-1.5 bg-[#1e1e2c] rounded-lg appearance-none cursor-pointer accent-[#f95721]"
              />
              <span className="text-[11px] text-slate-400 font-mono w-7 text-right">
                {minQualificationScore}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="md:col-span-3 flex items-center justify-end gap-2 pt-2 md:pt-3">
            <button
              type="button"
              onClick={handleResetForm}
              disabled={isSearching}
              className="p-2 rounded-xl bg-[#0c0c10] hover:bg-[#14141c] border border-[#22222e] text-slate-400 hover:text-slate-200 transition-colors"
              title="Reset Form"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              type="submit"
              disabled={isSearching || targetBusinesses.length === 0 || !location.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-[#f95721] to-[#ea4710] hover:brightness-110 text-white font-bold text-xs shadow-md shadow-[#f95721]/25 transition-all disabled:opacity-50"
            >
              {isSearching ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Search Leads</span>
                </>
              )}
            </button>
          </div>

        </div>

      </form>

      {/* Live Pipeline Steps Progress */}
      {isSearching && (
        <div className="bg-[#121217] border border-[#22222c] rounded-2xl p-3.5 shadow-lg space-y-2 animate-fade-in">
          <div className="text-xs font-bold text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#f95721]" />
              <span>Automated Pipeline In Progress</span>
            </span>
            <span className="text-[11px] text-slate-400">Step {activeStep} of 4</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            {[
              { num: 1, title: 'Serper.dev Discovery', desc: 'Finding potential leads' },
              { num: 2, title: 'Firecrawl Verification', desc: 'Verifying business websites' },
              { num: 3, title: 'Gemini AI Qualification', desc: 'Scoring lead relevance' },
              { num: 4, title: 'Hunter.io Contacts', desc: 'Finding professional emails' },
            ].map((step) => {
              const isPast = activeStep > step.num;
              const isCurrent = activeStep === step.num;
              return (
                <div
                  key={step.num}
                  className={`p-2 rounded-xl border transition-all ${isPast
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : isCurrent
                      ? 'bg-[#f95721]/15 border-[#f95721]/40 text-white shadow-sm'
                      : 'bg-[#0c0c10] border-[#1e1e28] text-slate-500'
                    }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    {isPast ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full bg-[#1e1e28] text-[9px] flex items-center justify-center font-mono">
                        {step.num}
                      </span>
                    )}
                    <span>{step.title}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{step.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* Error Banner */}
      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Empty State when no results found */}
      {!isSearching && searchResults.length === 0 && (
        <div className="bg-[#121217] border border-[#22222c] rounded-2xl p-12 text-center space-y-3 animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-[#181824] border border-[#262638] flex items-center justify-center mx-auto text-slate-400">
            <Building2 className="w-6 h-6 text-[#f95721]" />
          </div>
          <h3 className="text-sm font-bold text-white">No Discovered Companies</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Select your target job titles, industries, location, and company size above, then click <span className="text-white font-semibold">Search Leads</span> to discover live verified prospects.
          </p>
        </div>
      )}

      {/* Hunter.io Split-View: Discovered Companies List (Left) + Company Inspector Panel (Right) */}
      {searchResults.length > 0 && (
        <div className="space-y-3 animate-fade-in">

          <div className="flex flex-col lg:flex-row items-start gap-4">

            {/* Left Column: Company List (Matches Screenshot) */}
            <div className={`transition-all duration-300 w-full ${inspectedLead ? 'lg:w-[45%] xl:w-[42%]' : 'w-full'} space-y-2`}>

              {/* List Header Strip: Selection & Export */}
              <div className="flex items-center justify-between bg-[#121217] border border-[#22222e] rounded-2xl px-4 py-2 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={selectedLeadIds.length === searchResults.length && searchResults.length > 0}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded text-[#f95721] focus:ring-0 bg-[#14141c] border-[#333346] cursor-pointer"
                    title="Select all companies"
                    id="select-all-companies"
                  />
                  <label htmlFor="select-all-companies" className="text-xs font-medium text-slate-400 cursor-pointer select-none">
                    Select All{selectedLeadIds.length > 0 ? ` (${selectedLeadIds.length})` : ''}
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClearResults}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#14141c] hover:bg-[#1e1e2c] border border-[#262638] text-slate-400 hover:text-slate-200 text-xs font-medium transition-all active:scale-95 cursor-pointer"
                    title="Clear all search results from view"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Clear</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenOutreachModal}
                    disabled={searchResults.length === 0}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f95721] hover:bg-[#ff6835] text-white text-xs font-bold shadow-md shadow-[#f95721]/20 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="Launch cold outreach feature for selected companies"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Outreach{selectedLeadIds.length > 0 ? ` (${selectedLeadIds.length})` : ` All (${searchResults.length})`}</span>
                  </button>
                </div>
              </div>

              {/* Company Rows Container */}
              <div className="bg-[#121217] border border-[#22222e] rounded-2xl overflow-hidden divide-y divide-[#1c1c28] shadow-xl">
                {searchResults.map((lead, idx) => {
                  const isSelected = selectedLeadIds.includes(lead.id);
                  const isInspected = inspectedLead?.id === lead.id;
                  const domain = cleanDomain(lead.website);

                  return (
                    <div
                      key={lead.id}
                      onClick={() => handleInspectLead(lead)}
                      className={`group flex items-center justify-between px-3.5 py-2.5 transition-all cursor-pointer ${isInspected
                        ? 'bg-[#181826] border-l-4 border-l-[#f95721] shadow-inner'
                        : isSelected
                          ? 'bg-[#161622]'
                          : 'hover:bg-[#161620]'
                        }`}
                    >
                      {/* Left: Checkbox + Rank + Logo + Titles */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">

                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => handleToggleSelectLead(lead.id)}
                          className="w-4 h-4 rounded text-[#f95721] focus:ring-0 bg-[#14141c] border-[#333346] cursor-pointer shrink-0"
                        />

                        {/* Rank Position */}
                        <span className="text-[10px] font-mono font-semibold text-slate-500 shrink-0 w-4 text-center">
                          #{idx + 1}
                        </span>

                        {/* Logo in Clean White Container (Matches Screenshot) */}
                        <div className="w-10 h-10 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 border border-slate-200 shadow-sm overflow-hidden">
                          {domain ? (
                            <img
                              src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
                              alt={lead.company_name}
                              className="w-7 h-7 object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                if (e.currentTarget.parentElement) {
                                  e.currentTarget.parentElement.innerHTML = `<span class="font-bold text-xs text-slate-900">${lead.company_name.substring(0, 2).toUpperCase()}</span>`;
                                }
                              }}
                            />
                          ) : (
                            <Building2 className="w-5 h-5 text-slate-800" />
                          )}
                        </div>

                        {/* Title and metadata */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2 truncate">
                            <span className="font-bold text-xs sm:text-sm text-white group-hover:text-[#f95721] transition-colors truncate">
                              {lead.company_name}
                            </span>
                            {domain && (
                              <span className="text-[11px] text-slate-400 font-normal truncate">
                                {domain}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-slate-400 mt-0.5">
                            {lead.company_size && (
                              <span className="flex items-center gap-1 shrink-0">
                                <Users className="w-3 h-3 text-slate-500" />
                                <span>{lead.company_size.replace(' employees', '')}</span>
                              </span>
                            )}
                            {lead.industry && (
                              <span className="flex items-center gap-1 shrink-0 truncate max-w-[120px]">
                                <Building2 className="w-3 h-3 text-slate-500" />
                                <span className="truncate">{lead.industry}</span>
                              </span>
                            )}
                            {lead.location && (
                              <span className="flex items-center gap-1 shrink-0">
                                <MapPin className="w-3 h-3 text-slate-500" />
                                <span>{lead.location.split(',')[0]}</span>
                              </span>
                            )}
                          </div>
                        </div>

                      </div>

                      {/* Right: Clean Click Indicator */}
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-[#f95721] group-hover:translate-x-0.5 transition-all" />
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>

            {/* Right Column: In-page Company Inspector Panel (Matches Exact Screenshot Layout) */}
            {inspectedLead && (
              <div className="w-full lg:w-[55%] xl:w-[58%] bg-[#121217] border border-[#22222e] rounded-2xl shadow-2xl animate-fade-in flex flex-col sticky top-4 max-h-[calc(100vh-2rem)] overflow-hidden">

                {/* Panel Top Row: Logo, Name, Email Count, Close Button (Fixed at Top) */}
                <div className="p-4 sm:p-5 pb-3 border-b border-[#1c1c28] shrink-0 bg-[#121217]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      {/* Large Logo */}
                      <div className="w-14 h-14 rounded-2xl bg-white p-2 flex items-center justify-center shrink-0 border border-slate-200 shadow-md overflow-hidden">
                        {cleanDomain(inspectedLead.website) ? (
                          <img
                            src={`https://www.google.com/s2/favicons?domain=${cleanDomain(inspectedLead.website)}&sz=128`}
                            alt={inspectedLead.company_name}
                            className="w-10 h-10 object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              if (e.currentTarget.parentElement) {
                                e.currentTarget.parentElement.innerHTML = `<span class="font-bold text-base text-slate-900">${inspectedLead.company_name.substring(0, 2).toUpperCase()}</span>`;
                              }
                            }}
                          />
                        ) : (
                          <Building2 className="w-8 h-8 text-slate-800" />
                        )}
                      </div>

                      <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2 flex-wrap">
                          <span>{inspectedLead.company_name}</span>
                          {inspectedLead.fit_score !== undefined && inspectedLead.fit_score !== null && (
                            <span className={`text-[11px] px-2 py-0.5 rounded-md border font-semibold ${(inspectedLead.qualification_status === 'QUALIFIED' || inspectedLead.fit_score >= Number(minQualificationScore))
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                              : 'bg-rose-500/10 border-rose-500/25 text-rose-300'
                              }`}>
                              {(inspectedLead.qualification_status === 'QUALIFIED' || inspectedLead.fit_score >= Number(minQualificationScore)) ? 'Qualified' : 'Disqualified'} {inspectedLead.fit_score}%
                            </span>
                          )}
                        </h2>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {(() => {
                            const badge = getWebsiteStatusBadge(inspectedLead.website_status);
                            if (!badge) return null;
                            return (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium ${badge.className}`}>
                                {badge.label}
                              </span>
                            );
                          })()}
                          <div className="inline-block px-2.5 py-0.5 rounded-md bg-[#1c1c28] border border-[#2c2c3e] text-xs font-semibold text-slate-200 shadow-sm">
                            {formatEmailCount(inspectedLead)} emails
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions: View full lead detail modal & Close Inspector */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onSelectLead?.(inspectedLead.id)}
                        className="px-2.5 py-1 rounded-lg bg-[#181824] hover:bg-[#222232] border border-[#2a2a3e] text-slate-300 hover:text-white text-xs font-medium transition-colors"
                        title="Open complete lead detail modal"
                      >
                        Lead Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => setInspectedLead(null)}
                        className="p-1.5 rounded-lg hover:bg-[#1f1f2e] text-slate-400 hover:text-white transition-colors"
                        title="Close Inspector"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Scrollable Panel Body */}
                <div className="p-4 sm:p-5 pt-3.5 space-y-3.5 overflow-y-auto flex-1 overscroll-contain">

                  {/* Company Description */}
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {inspectedLead.description || 'No company description available.'}
                  </p>
                  {/* Company Details Grid (Two Columns, matching reference screenshot) */}
                  <div className="pt-3 border-t border-[#1c1c28] grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-xs">

                    {/* Left sub-column */}
                    <div className="space-y-1.5">
                      <div className="text-slate-200 font-medium">
                        {inspectedLead.industry || 'Not specified'}
                      </div>
                      <div className="text-slate-400">
                        {inspectedLead.company_size || 'Not specified'}
                      </div>
                      {inspectedLead.founded_year && (
                        <div className="text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>Founded in {inspectedLead.founded_year}</span>
                        </div>
                      )}

                      {/* Keywords Dropdown */}
                      {inspectedLead.keywords && inspectedLead.keywords.length > 0 && (
                        <div>
                          <button
                            type="button"
                            onClick={() => setIsKeywordsOpen(!isKeywordsOpen)}
                            className="text-[#f95721] hover:underline flex items-center gap-1 font-semibold text-[11px] pt-1"
                          >
                            <span>Keywords</span>
                            {isKeywordsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                          {isKeywordsOpen && (
                            <div className="flex flex-wrap gap-1.5 pt-2 animate-fade-in">
                              {inspectedLead.keywords.map((kw, i) => (
                                <span key={i} className="px-2 py-0.5 rounded-md bg-[#181824] border border-[#262638] text-[10px] text-slate-300 font-mono">
                                  {kw}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right sub-column */}
                    <div className="space-y-1.5">
                      {inspectedLead.website && (
                        <a
                          href={inspectedLead.source_url || `https://${cleanDomain(inspectedLead.website)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1.5"
                        >
                          <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span>{cleanDomain(inspectedLead.website)}</span>
                        </a>
                      )}
                      <div className="text-slate-400 flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                        <span>{inspectedLead.location || 'Location not specified'}</span>
                      </div>

                    </div>

                  </div>

                  {/* Email Addresses Explorer Section */}
                  <div className="pt-3 border-t border-[#1c1c28] space-y-3.5">

                    {/* Sub-Header Strip: Results count */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-300 font-semibold">
                        <strong className="text-white">{formatEmailCount(inspectedLead)} results</strong> for {cleanDomain(inspectedLead.website)}
                      </span>
                    </div>

                    {/* Verified Contacts List */}
                    {(() => {
                      const displayedContacts = inspectedLead.contacts || [];

                      return (
                        <div className="border border-[#1e1e28] rounded-xl overflow-hidden divide-y divide-[#1e1e28]">
                          <button
                            type="button"
                            onClick={() => setIsExecutiveOpen(!isExecutiveOpen)}
                            className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#14141c] hover:bg-[#181822] text-xs font-bold text-white transition-colors"
                          >
                            <span className="flex items-center gap-2">
                              {isExecutiveOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                              <span>Verified Contacts</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#222230] text-slate-300">
                                {displayedContacts.length}
                              </span>
                            </span>
                          </button>

                          {/* Contacts List */}
                          {isExecutiveOpen && (
                            <div className="divide-y divide-[#1a1a24] bg-[#0f0f14]">
                              {displayedContacts.length > 0 ? (
                                displayedContacts.map((contact, idx) => (
                                  <div
                                    key={idx}
                                    className="px-3.5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#151520] transition-colors group"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded text-[#f95721] focus:ring-0 bg-[#14141c] border-[#333346] cursor-pointer"
                                      />

                                      <div>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-bold text-xs text-white">
                                            {contact.name}
                                          </span>
                                          {contact.is_c_level && (
                                            <span title="C-Level Executive">
                                              <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                            </span>
                                          )}
                                          {contact.job_title && (
                                            <>
                                              <span className="text-slate-500 text-xs">|</span>
                                              <span className="text-xs text-slate-300">
                                                {contact.job_title}
                                              </span>
                                            </>
                                          )}
                                        </div>

                                        {contact.email && (
                                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 font-mono">
                                            <span>{contact.email}</span>
                                            <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 font-sans">
                                              <Check className="w-2.5 h-2.5" />
                                              <span>{contact.confidence_score ? `${contact.confidence_score}% verified` : (contact.email_status || 'verified')}</span>
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Action Buttons: Copy Email & Draft Outreach */}
                                    <div className="flex items-center gap-2 self-end sm:self-center">
                                      {contact.email && (
                                        <button
                                          type="button"
                                          onClick={() => handleCopyEmail(contact.email!)}
                                          className="p-1.5 rounded-lg bg-[#181824] hover:bg-[#222230] border border-[#262638] text-slate-400 hover:text-white transition-colors"
                                          title="Copy email address"
                                        >
                                          {copiedEmail === contact.email ? (
                                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                                          ) : (
                                            <Copy className="w-3.5 h-3.5" />
                                          )}
                                        </button>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedLeadIds([inspectedLead.id]);
                                          setIsOutreachModalOpen(true);
                                          setOutreachFeedback(null);
                                        }}
                                        className="px-2.5 py-1 rounded-lg bg-[#f95721]/15 hover:bg-[#f95721]/25 border border-[#f95721]/40 text-[#f95721] text-[11px] font-bold flex items-center gap-1 transition-colors"
                                        title="Prepare personalized cold outreach"
                                      >
                                        <Send className="w-3 h-3" />
                                        <span>Outreach</span>
                                      </button>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="p-6 text-center text-xs text-slate-500">
                                  No verified contacts discovered yet for this company.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                  </div>
                </div>

              </div>
            )}

          </div>

        </div>
      )}

      {/* Cold Outreach Campaign Modal */}
      {isOutreachModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-[#101015] border border-[#262636] rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1f1f2e] bg-[#14141d]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#f95721]/15 border border-[#f95721]/30 flex items-center justify-center text-[#f95721]">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Cold Outreach Campaign</span>
                    <span className="text-[11px] font-medium text-[#f95721] bg-[#f95721]/10 border border-[#f95721]/25 px-2 py-0.5 rounded-full">
                      {selectedLeadIds.length} {selectedLeadIds.length === 1 ? 'Company' : 'Companies'} Selected
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Generate personalized cold emails with Gemini AI targeting verified decision-makers.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOutreachModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1f1f2c] transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Campaign Controls & Instructions */}
            <div className="p-4 bg-[#12121a] border-b border-[#1f1f2e] space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={outreachInstructions}
                    onChange={(e) => setOutreachInstructions(e.target.value)}
                    placeholder="Optional angle (e.g. mention rapid turnaround, special audit offer, local presence)..."
                    className="w-full px-3 py-2 rounded-xl bg-[#0c0c10] border border-[#242436] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#f95721]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleBatchGenerateDrafts}
                  disabled={isBatchGenerating || selectedLeadIds.length === 0}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#f95721] hover:bg-[#ff6835] text-white text-xs font-bold shadow-md shadow-[#f95721]/25 transition-all disabled:opacity-50 shrink-0 cursor-pointer"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isBatchGenerating ? 'animate-spin' : ''}`} />
                  <span>{isBatchGenerating ? 'Drafting with Gemini...' : 'Generate All Drafts with Gemini'}</span>
                </button>
              </div>

              {/* Progress bar during generation */}
              {isBatchGenerating && batchProgress && (
                <div className="p-3 rounded-xl bg-[#181824] border border-[#2a2a3e] space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#f95721] animate-spin" />
                      Drafting for <span className="font-bold text-white">{batchProgress.companyName}</span>
                    </span>
                    <span className="text-[#f95721] font-mono font-bold">
                      {batchProgress.current} / {batchProgress.total}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#0c0c10] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#f95721] to-[#ff7b4b] transition-all duration-300"
                      style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Feedback messages */}
              {outreachFeedback && (
                <div
                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${outreachFeedback.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/25 text-red-400'
                    }`}
                >
                  <span className="flex items-center gap-1.5">
                    {outreachFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    )}
                    {outreachFeedback.message}
                  </span>
                  <button
                    onClick={() => setOutreachFeedback(null)}
                    className="text-xs hover:text-white ml-2"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Quick Batch Actions toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="text-[11px] font-semibold text-slate-400 hover:text-white transition-colors"
                  >
                    {selectedLeadIds.length === searchResults.length ? 'Deselect All' : 'Select All'} ({searchResults.length})
                  </button>
                  <span className="text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={handleApproveAllPending}
                    disabled={approvingDraftId !== null}
                    className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Approve All Pending Drafts</span>
                  </button>
                </div>

                {onNavigateToOutreach && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOutreachModalOpen(false);
                      onNavigateToOutreach();
                    }}
                    className="text-[11px] font-semibold text-[#f95721] hover:text-[#ff7444] flex items-center gap-1 transition-colors"
                  >
                    <span>Open Full Outreach Review Hub</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Selected Leads List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-[#181822]">
              {selectedLeadsList.map((lead) => {
                const domain = cleanDomain(lead.website);
                const hasDraft = Boolean(lead.draft);
                const draft = lead.draft;
                const isExpanded = expandedDraftLeadId === lead.id;
                const primaryContact = lead.contacts && lead.contacts.length > 0 ? lead.contacts[0] : null;

                return (
                  <div key={lead.id} className="pt-3 first:pt-0 space-y-2.5">
                    {/* Lead Card Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedLeadIds.includes(lead.id)}
                          onChange={() => handleToggleSelectLead(lead.id)}
                          className="w-4 h-4 rounded text-[#f95721] focus:ring-0 bg-[#14141c] border-[#333346] cursor-pointer shrink-0"
                        />
                        <div className="w-7 h-7 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 border border-slate-200 overflow-hidden">
                          {domain ? (
                            <img
                              src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
                              alt={lead.company_name}
                              className="w-5 h-5 object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <Building2 className="w-3.5 h-3.5 text-slate-800" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-white truncate">{lead.company_name}</span>
                            {domain && <span className="text-[10px] text-slate-400 truncate">{domain}</span>}
                          </div>
                          {primaryContact && (
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5 truncate">
                              <span className="text-slate-300 font-medium">{primaryContact.name}</span>
                              {primaryContact.job_title && <span>({primaryContact.job_title})</span>}
                              {primaryContact.email && (
                                <span className="text-emerald-400 font-mono text-[10px] ml-1 flex items-center gap-1">
                                  {primaryContact.email}
                                  <button
                                    type="button"
                                    onClick={() => handleCopyEmail(primaryContact.email!)}
                                    className="hover:text-white"
                                    title="Copy email"
                                  >
                                    <Copy className="w-2.5 h-2.5" />
                                  </button>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right side status & action buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {hasDraft ? (
                          <>
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${draft?.status === 'APPROVED'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                                : draft?.status === 'SENT'
                                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/25'
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                                }`}
                            >
                              {draft?.status}
                            </span>

                            <button
                              type="button"
                              onClick={() => setExpandedDraftLeadId(isExpanded ? null : lead.id)}
                              className="px-2 py-1 rounded-lg bg-[#181824] hover:bg-[#202030] border border-[#2a2a3e] text-slate-300 hover:text-white text-[11px] font-medium transition-colors"
                            >
                              {isExpanded ? 'Hide Draft' : 'Preview Draft'}
                            </button>

                            {draft?.status === 'DRAFT' && (
                              <button
                                type="button"
                                onClick={() => handleApproveDraft(lead.id, draft.id)}
                                disabled={approvingDraftId === draft.id}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow transition-colors disabled:opacity-50"
                              >
                                {approvingDraftId === draft.id ? 'Approving...' : 'Approve'}
                              </button>
                            )}

                            {primaryContact?.email && (
                              <button
                                type="button"
                                onClick={() => handleSendDraftEmail(lead.id, draft!.id, primaryContact.email!)}
                                disabled={sendingDraftId === draft!.id}
                                className="px-2.5 py-1 rounded-lg bg-[#f95721] hover:bg-[#ff6835] text-white text-[11px] font-bold shadow transition-colors disabled:opacity-50 flex items-center gap-1"
                              >
                                <Send className="w-2.5 h-2.5" />
                                <span>{sendingDraftId === draft!.id ? 'Sending...' : 'Send SMTP'}</span>
                              </button>
                            )}
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleGenerateSingleDraft(lead.id)}
                            disabled={approvingDraftId === lead.id}
                            className="px-2.5 py-1 rounded-lg bg-[#f95721]/15 hover:bg-[#f95721]/25 border border-[#f95721]/40 text-[#f95721] text-[11px] font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>{approvingDraftId === lead.id ? 'Drafting...' : 'Draft Email'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expandable Draft Email Preview */}
                    {hasDraft && isExpanded && draft && (
                      <div className="p-3.5 rounded-xl bg-[#0c0c12] border border-[#20202e] space-y-2 animate-fade-in text-xs">
                        <div className="flex items-center justify-between pb-1.5 border-b border-[#1c1c28]">
                          <span className="font-bold text-white text-xs">
                            Subject: {draft.subject}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Personalized by Gemini
                          </span>
                        </div>
                        <div className="text-slate-300 font-sans whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto p-1 text-[11px]">
                          {draft.body}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-[#1f1f2e] bg-[#14141d]">
              <span className="text-xs text-slate-400">
                {selectedLeadsList.filter((l) => Boolean(l.draft)).length} of {selectedLeadsList.length} drafts ready
              </span>
              <button
                type="button"
                onClick={() => setIsOutreachModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-[#20202e] hover:bg-[#2c2c3e] text-white text-xs font-semibold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
