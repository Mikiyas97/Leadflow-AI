import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Building2,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Trash2,
  RefreshCw,
  MapPin,
  AlertTriangle,
  Calendar,
  ArrowUpDown,
  Compass,
  CheckCircle2,
  Clock,
  Layers,
  Crown,
  Copy,
  Check,
  Globe,
  Send,
  Sparkles,
  X,
  Users,
  Target,
} from 'lucide-react';
import type { Lead, LeadDetail, Contact } from '../types';
import { api } from '../services/api';

interface ManageLeadsViewProps {
  onSelectLead: (leadId: number) => void;
  onNavigateToSearch: () => void;
  onRefreshParentStats?: () => void;
}

type SortField = 'score' | 'name' | 'date';
type SortOrder = 'asc' | 'desc';

export const getWebsiteStatusBadge = (status?: string | null) => {
  if (!status) return null;
  switch (status) {
    case 'NO_OFFICIAL_WEBSITE_FOUND':
    case 'Missing':
      return {
        label: 'Missing Web',
        fullLabel: 'Confirmed Missing Official Site',
        className: 'bg-rose-500/15 border-rose-500/30 text-rose-300'
      };
    case 'OUTDATED_WEBSITE':
    case 'Outdated':
      return {
        label: 'Outdated Web',
        fullLabel: 'Legacy / Unmaintained Site',
        className: 'bg-amber-500/15 border-amber-500/30 text-amber-300'
      };
    case 'HAS_OFFICIAL_WEBSITE':
    case 'Active Web':
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

const cleanDomain = (website?: string | null): string => {
  if (!website) return '';
  return website
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split('/')[0];
};

const formatEmailCount = (lead: Lead | LeadDetail): string => {
  if (lead.contacts && lead.contacts.length > 0) {
    return lead.contacts.length.toLocaleString();
  }
  return '0';
};

export const ManageLeadsView: React.FC<ManageLeadsViewProps> = ({
  onSelectLead,
  onNavigateToSearch,
  onRefreshParentStats,
}) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isOverdueOnly, setIsOverdueOnly] = useState<boolean>(false);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [error, setError] = useState<string | null>(null);

  // Split-view inspector state (matches Search Leads inspection experience)
  const [inspectedLead, setInspectedLead] = useState<LeadDetail | null>(null);
  const [loadingInspector, setLoadingInspector] = useState<boolean>(false);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [isContactsOpen, setIsContactsOpen] = useState<boolean>(true);

  // Inspector actions feedback & progress
  const [draftingLeadId, setDraftingLeadId] = useState<number | null>(null);
  const [approvingDraftId, setApprovingDraftId] = useState<number | null>(null);
  const [sendingDraftId, setSendingDraftId] = useState<number | null>(null);
  const [inspectorFeedback, setInspectorFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadLeads();
  }, [statusFilter, isOverdueOnly]);

  const loadLeads = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getLeads({
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        is_overdue: isOverdueOnly || undefined,
        limit: 250,
      });
      setLeads(data);
      if (onRefreshParentStats) {
        onRefreshParentStats();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load saved leads');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadLeads();
  };

  const handleInspectLead = async (leadSummary: Lead) => {
    // Set immediate summary data so inspector renders with zero latency
    setInspectedLead({
      ...leadSummary,
      contacts: leadSummary.contacts || [],
      drafts: leadSummary.drafts || [],
      research_records: [],
    });
    setInspectorFeedback(null);

    try {
      setLoadingInspector(true);
      const full = await api.getLead(leadSummary.id);
      if (full) {
        setInspectedLead(full);
        // Sync enriched contacts & drafts back into leads list
        setLeads((prev) =>
          prev.map((l) => (l.id === full.id ? { ...l, ...full } : l))
        );
      }
    } catch (err) {
      console.warn('Failed to load lead details for inspector', err);
    } finally {
      setLoadingInspector(false);
    }
  };

  const handleStatusChange = async (leadId: number, newStatus: string) => {
    try {
      await api.updateLead(leadId, { status: newStatus as any });
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: newStatus as any } : l))
      );
      setInspectedLead((prev) =>
        prev && prev.id === leadId ? { ...prev, status: newStatus as any } : prev
      );
      if (onRefreshParentStats) onRefreshParentStats();
    } catch (err: any) {
      alert(`Could not update lead status: ${err.message}`);
    }
  };

  const handleDeleteLead = async (e: React.MouseEvent, leadId: number) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this saved lead record?')) return;

    try {
      await api.deleteLead(leadId);
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
      setInspectedLead((prev) => (prev?.id === leadId ? null : prev));
      if (onRefreshParentStats) onRefreshParentStats();
    } catch (err: any) {
      alert(`Could not delete lead: ${err.message}`);
    }
  };

  const handleGenerateDraft = async (leadId: number, contactId?: number) => {
    try {
      setDraftingLeadId(leadId);
      setInspectorFeedback(null);
      const draft = await api.generateDraft(leadId, contactId);
      if (draft) {
        setInspectedLead((prev) =>
          prev && prev.id === leadId
            ? {
              ...prev,
              drafts: [draft, ...(prev.drafts || [])],
            }
            : prev
        );
        setLeads((prev) =>
          prev.map((l) =>
            l.id === leadId
              ? { ...l, drafts: [draft, ...(l.drafts || [])] }
              : l
          )
        );
        setInspectorFeedback({
          type: 'success',
          message: `Personalized cold outreach generated: "${draft.subject}"`,
        });
        if (onRefreshParentStats) onRefreshParentStats();
      }
    } catch (err: any) {
      setInspectorFeedback({
        type: 'error',
        message: err.message || 'Could not generate draft with Gemini.',
      });
    } finally {
      setDraftingLeadId(null);
    }
  };

  const handleApproveDraft = async (draftId: number) => {
    try {
      setApprovingDraftId(draftId);
      setInspectorFeedback(null);
      const updated = await api.approveDraft(draftId);
      setInspectedLead((prev) =>
        prev
          ? {
            ...prev,
            drafts: (prev.drafts || []).map((d) =>
              d.id === draftId ? { ...d, status: updated.status } : d
            ),
          }
          : prev
      );
      setInspectorFeedback({
        type: 'success',
        message: 'Draft approved for dispatch!',
      });
      if (onRefreshParentStats) onRefreshParentStats();
    } catch (err: any) {
      setInspectorFeedback({
        type: 'error',
        message: err.message || 'Could not approve draft.',
      });
    } finally {
      setApprovingDraftId(null);
    }
  };

  const handleSendDraftEmail = async (draftId: number, recipientEmail: string) => {
    try {
      setSendingDraftId(draftId);
      setInspectorFeedback(null);
      const res = await api.sendDraftEmail(draftId, { recipient_email: recipientEmail });
      setInspectedLead((prev) =>
        prev
          ? {
            ...prev,
            drafts: (prev.drafts || []).map((d) =>
              d.id === draftId ? { ...d, status: 'SENT' } : d
            ),
          }
          : prev
      );
      setInspectorFeedback({
        type: 'success',
        message: res.message || `Outreach email sent successfully to ${recipientEmail}!`,
      });
      if (onRefreshParentStats) onRefreshParentStats();
    } catch (err: any) {
      setInspectorFeedback({
        type: 'error',
        message: err.message || 'Failed to dispatch email via SMTP.',
      });
    } finally {
      setSendingDraftId(null);
    }
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2500);
  };

  const handleSortToggle = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Sort leads client-side
  const sortedLeads = [...leads].sort((a, b) => {
    let factor = sortOrder === 'asc' ? 1 : -1;
    if (sortField === 'score') {
      const scoreA = a.fit_score ?? -1;
      const scoreB = b.fit_score ?? -1;
      return (scoreA - scoreB) * factor;
    }
    if (sortField === 'name') {
      return a.company_name.localeCompare(b.company_name) * factor;
    }
    if (sortField === 'date') {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return (dateA - dateB) * factor;
    }
    return 0;
  });

  // KPI Calculations
  const totalCount = leads.length;
  const qualifiedCount = leads.filter((l) => l.status === 'QUALIFIED').length;
  const contactedCount = leads.filter((l) => l.status === 'CONTACTED').length;
  const overdueCount = leads.filter((l) => (l as any).is_overdue).length;

  const latestDraft = inspectedLead?.drafts && inspectedLead.drafts.length > 0 ? inspectedLead.drafts[0] : null;
  const primaryContact = inspectedLead?.contacts && inspectedLead.contacts.length > 0 ? inspectedLead.contacts[0] : null;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-4 animate-fade-in font-sans">

      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-[#1c1c24]">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#f95721]" />
            <span>Manage Leads</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Click any company to open its detailed inspector, verified decision-makers, and AI outreach drafts.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={loadLeads}
            disabled={loading}
            className="p-2 rounded-xl bg-[#121217] hover:bg-[#1a1a22] border border-[#22222e] text-slate-400 hover:text-white transition-colors"
            title="Refresh Leads from Database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onNavigateToSearch}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#f95721] to-[#ea4710] hover:brightness-110 text-white text-xs font-bold shadow-md shadow-[#f95721]/20 transition-all hover:scale-[1.01]"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Search New Leads</span>
          </button>
        </div>
      </div>

      {/* Mini KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-[#121217] border border-[#20202a]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Total Saved Leads</span>
            <Layers className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-xl font-extrabold text-white mt-1">{totalCount}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#121217] border border-[#20202a]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Qualified Pipeline</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold text-emerald-400 mt-1">{qualifiedCount}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#121217] border border-[#20202a]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Contacted</span>
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-xl font-extrabold text-indigo-400 mt-1">{contactedCount}</div>
        </div>

        <div className={`p-3.5 rounded-2xl border transition-all ${overdueCount > 0
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          : 'bg-[#121217] border-[#20202a] text-slate-400'
          }`}>
          <div className="text-[10px] font-bold uppercase tracking-wider flex items-center justify-between">
            <span>Overdue Follow-ups</span>
            <AlertTriangle className={`w-3.5 h-3.5 ${overdueCount > 0 ? 'text-amber-400' : 'text-slate-500'}`} />
          </div>
          <div className={`text-xl font-extrabold mt-1 ${overdueCount > 0 ? 'text-amber-400' : 'text-white'}`}>
            {overdueCount}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar Row */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-[#121217] border border-[#22222c] p-3 rounded-2xl shadow-sm">

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search saved leads by company, website, industry, or location..."
            className="w-full bg-[#0c0c10] border border-[#22222e] rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#f95721] transition-colors"
          />
        </form>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-[11px] text-slate-500 mr-1 hidden sm:inline flex items-center gap-1">
            <Filter className="w-3 h-3" /> Status:
          </span>
          {['ALL', 'QUALIFIED', 'NEW', 'CONTACTED', 'UNQUALIFIED', 'ARCHIVED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${statusFilter === st
                ? 'bg-[#f95721] text-white shadow-sm'
                : 'bg-[#0c0c10] text-slate-400 hover:text-slate-200 border border-[#22222e]'
                }`}
            >
              {st}
            </button>
          ))}

          {/* Overdue filter pill */}
          <button
            onClick={() => setIsOverdueOnly(!isOverdueOnly)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${isOverdueOnly
              ? 'bg-amber-500 text-black shadow-sm font-bold'
              : 'bg-[#0c0c10] text-amber-400 hover:text-amber-300 border border-amber-500/30'
              }`}
            title="Filter overdue follow-ups (FR-09)"
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Overdue</span>
          </button>
        </div>

      </div>

      {/* Leads Content Area: Split-View with In-Page Inspector (Matches Search Leads Experience) */}
      <div className="space-y-3">
        {loading && leads.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-400 flex flex-col items-center gap-2 bg-[#121217] border border-[#22222c] rounded-2xl">
            <RefreshCw className="w-5 h-5 animate-spin text-[#f95721]" />
            <span>Loading saved leads...</span>
          </div>
        ) : error ? (
          <div className="py-12 text-center text-xs text-red-400 bg-[#121217] border border-[#22222c] rounded-2xl">
            {error}
          </div>
        ) : sortedLeads.length === 0 ? (
          <div className="py-20 text-center max-w-md mx-auto space-y-3 bg-[#121217] border border-[#22222c] rounded-2xl p-6">
            <div className="h-12 w-12 rounded-2xl bg-[#181822] mx-auto flex items-center justify-center text-slate-400">
              <Building2 className="w-6 h-6 text-[#f95721]" />
            </div>
            <h3 className="text-sm font-semibold text-white">No saved leads match your filter</h3>
            <p className="text-xs text-slate-400">
              Try adjusting your filter, or launch a discovery search to hunt for new verified prospects.
            </p>
            <button
              onClick={onNavigateToSearch}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#f95721] hover:bg-[#ea4710] text-white text-xs font-semibold shadow-md shadow-[#f95721]/20"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Go to Search Leads</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row items-start gap-4">

            {/* Left Column: Company List (Clean rows matching Search Leads) */}
            <div className={`transition-all duration-300 w-full ${inspectedLead ? 'lg:w-[45%] xl:w-[42%]' : 'w-full'} space-y-2`}>

              {/* List Header Strip: Sorting & Count */}
              <div className="flex items-center justify-between bg-[#121217] border border-[#22222e] rounded-2xl px-4 py-2 shadow-sm text-xs">
                <span className="text-slate-400 font-medium">
                  Showing <strong className="text-white">{sortedLeads.length}</strong> saved companies
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-[11px]">Sort:</span>
                  <button
                    onClick={() => handleSortToggle('score')}
                    className={`px-2 py-0.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 transition-colors ${sortField === 'score'
                      ? 'bg-[#f95721]/15 border-[#f95721]/40 text-[#f95721]'
                      : 'bg-[#0c0c10] border-[#22222e] text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    <span>Fit Score</span>
                    <ArrowUpDown className="w-2.5 h-2.5" />
                  </button>

                  <button
                    onClick={() => handleSortToggle('date')}
                    className={`px-2 py-0.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 transition-colors ${sortField === 'date'
                      ? 'bg-[#f95721]/15 border-[#f95721]/40 text-[#f95721]'
                      : 'bg-[#0c0c10] border-[#22222e] text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    <span>Date</span>
                    <ArrowUpDown className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>

              {/* Company Rows Container */}
              <div className="bg-[#121217] border border-[#22222e] rounded-2xl overflow-hidden divide-y divide-[#1c1c28] shadow-xl">
                {sortedLeads.map((lead, idx) => {
                  const isInspected = inspectedLead?.id === lead.id;
                  const domain = cleanDomain(lead.website);

                  return (
                    <div
                      key={lead.id}
                      onClick={() => handleInspectLead(lead)}
                      className={`group flex items-center justify-between px-3.5 py-2.5 transition-all cursor-pointer ${isInspected
                        ? 'bg-[#181826] border-l-4 border-l-[#f95721] shadow-inner'
                        : 'hover:bg-[#161620]'
                        }`}
                    >
                      {/* Left: Rank + Logo + Titles & Metadata */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">

                        {/* Rank Position */}
                        <span className="text-[10px] font-mono font-semibold text-slate-500 shrink-0 w-4 text-center">
                          #{idx + 1}
                        </span>

                        {/* Logo in Clean White Container (Matches Search Leads) */}
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

                        {/* Company Details */}
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

                      {/* Right: Status Dropdown + Delete Button + Click Chevron */}
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <select
                          value={lead.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border focus:outline-none cursor-pointer ${lead.status === 'QUALIFIED'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : lead.status === 'CONTACTED'
                              ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                              : lead.status === 'UNQUALIFIED'
                                ? 'bg-red-500/15 text-red-400 border-red-500/30'
                                : lead.status === 'ARCHIVED'
                                  ? 'bg-slate-800 text-slate-400 border-slate-700'
                                  : 'bg-[#181822] text-slate-300 border-[#2a2a38]'
                            }`}
                        >
                          <option value="NEW">NEW</option>
                          <option value="QUALIFIED">QUALIFIED</option>
                          <option value="CONTACTED">CONTACTED</option>
                          <option value="UNQUALIFIED">UNQUALIFIED</option>
                          <option value="ARCHIVED">ARCHIVED</option>
                        </select>

                        <button
                          onClick={(e) => handleDeleteLead(e, lead.id)}
                          className="p-1 rounded-lg hover:bg-red-600/20 text-slate-500 hover:text-red-400 transition-colors"
                          title="Delete Lead"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-[#f95721] group-hover:translate-x-0.5 transition-all" />
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>

            {/* Right Column: Company Inspector Panel (Matches Exact Search Leads Experience & Design) */}
            {inspectedLead && (
              <div className="w-full lg:w-[55%] xl:w-[58%] bg-[#121217] border border-[#22222e] rounded-2xl shadow-2xl animate-fade-in flex flex-col sticky top-4 max-h-[calc(100vh-2rem)] overflow-hidden">

                {/* Panel Top Row: Logo, Name, Score, Status, Emails, Actions (Fixed at Top) */}
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
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-md border font-semibold ${inspectedLead.status === 'QUALIFIED' || inspectedLead.fit_score >= 60
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                : 'bg-rose-500/10 border-rose-500/25 text-rose-300'
                                }`}
                            >
                              {inspectedLead.status === 'QUALIFIED' || inspectedLead.fit_score >= 60 ? 'Qualified' : 'Disqualified'} {inspectedLead.fit_score}%
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
                        onClick={() => onSelectLead(inspectedLead.id)}
                        className="px-2.5 py-1 rounded-lg bg-[#181824] hover:bg-[#222232] border border-[#2a2a3e] text-slate-300 hover:text-white text-xs font-medium transition-colors"
                        title="Open complete lead dossier modal"
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

                  {/* Feedback Notification */}
                  {inspectorFeedback && (
                    <div
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between animate-fade-in ${inspectorFeedback.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                        : 'bg-red-500/10 border-red-500/25 text-red-400'
                        }`}
                    >
                      <span className="flex items-center gap-1.5">
                        {inspectorFeedback.type === 'success' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        )}
                        {inspectorFeedback.message}
                      </span>
                      <button onClick={() => setInspectorFeedback(null)} className="text-xs hover:text-white ml-2">
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Company Description (from Firecrawl research summary or fit reason) */}
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {inspectedLead.research_records?.[0]?.summary ||
                      inspectedLead.fit_reason ||
                      'No description recorded.'}
                  </p>

                  {/* Company Details Grid (Two Columns matching Search Leads) */}
                  <div className="pt-2 border-t border-[#1c1c28] grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-6 text-xs">
                    {/* Left sub-column */}
                    <div className="space-y-1.5">
                      <div className="text-slate-200 font-medium flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#f95721] shrink-0" />
                        <span>{inspectedLead.industry || 'Not specified'}</span>
                      </div>
                      <div className="text-slate-400 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{inspectedLead.company_size || 'Not specified'}</span>
                      </div>
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
                      <div className="text-slate-400 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#f95721] shrink-0" />
                        <span>{inspectedLead.location || 'Not specified'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Follow-up Tracking Strip */}
                  {inspectedLead.follow_up_date && (
                    <div className="p-2.5 rounded-xl bg-[#14141d] border border-[#20202e] text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-slate-300 font-medium">
                          Follow-up: {new Date(inspectedLead.follow_up_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {inspectedLead.follow_up_status || 'SCHEDULED'}
                      </span>
                    </div>
                  )}

                  {/* Email Addresses Explorer Section (Hunter.io Verified Contacts) */}
                  <div className="pt-2 border-t border-[#1c1c28] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-300 font-semibold">
                        <strong className="text-white">{formatEmailCount(inspectedLead)} contacts</strong> for {cleanDomain(inspectedLead.website) || inspectedLead.company_name}
                      </span>
                    </div>

                    {/* Verified Contacts Accordion List */}
                    <div className="border border-[#1e1e28] rounded-xl overflow-hidden divide-y divide-[#1e1e28]">
                      <button
                        type="button"
                        onClick={() => setIsContactsOpen(!isContactsOpen)}
                        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#14141c] hover:bg-[#181822] text-xs font-bold text-white transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          {isContactsOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                          <span>Verified Contacts</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#222230] text-slate-300">
                            {inspectedLead.contacts?.length || 0}
                          </span>
                        </span>

                      </button>

                      {isContactsOpen && (
                        <div className="divide-y divide-[#1a1a24] bg-[#0f0f14]">
                          {inspectedLead.contacts && inspectedLead.contacts.length > 0 ? (
                            inspectedLead.contacts.map((contact, idx) => {
                              const titleLower = (contact.job_title || '').toLowerCase();
                              const isExecutive =
                                titleLower.includes('director') ||
                                titleLower.includes('chief') ||
                                titleLower.includes('vp') ||
                                titleLower.includes('head') ||
                                titleLower.includes('founder') ||
                                titleLower.includes('officer') ||
                                titleLower.includes('ceo') ||
                                titleLower.includes('owner');

                              return (
                                <div
                                  key={idx}
                                  className="px-3.5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#151520] transition-colors group"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div>
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-bold text-xs text-white">
                                          {contact.name}
                                        </span>
                                        {isExecutive && (
                                          <span title="C-Level / Executive Decision Maker">
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

                                  {/* Contact Actions: Copy Email & Generate Draft */}
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
                                      onClick={() => handleGenerateDraft(inspectedLead.id, contact.id)}
                                      disabled={draftingLeadId === inspectedLead.id}
                                      className="px-2.5 py-1 rounded-lg bg-[#f95721]/15 hover:bg-[#f95721]/25 border border-[#f95721]/40 text-[#f95721] text-[11px] font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
                                      title="Draft cold outreach email with Gemini"
                                    >
                                      <Sparkles className={`w-3 h-3 ${draftingLeadId === inspectedLead.id ? 'animate-spin' : ''}`} />
                                      <span>{draftingLeadId === inspectedLead.id ? 'Drafting...' : 'Outreach'}</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="p-5 text-center text-xs text-slate-500 space-y-2">
                              <span>No verified contacts discovered yet for this company.</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI Cold Outreach Draft Preview & Dispatch Strip */}
                  <div className="pt-2 border-t border-[#1c1c28] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Send className="w-3.5 h-3.5 text-[#f95721]" />
                        <span>Cold Outreach Email</span>
                      </span>

                      {!latestDraft && (
                        <button
                          type="button"
                          onClick={() => handleGenerateDraft(inspectedLead.id)}
                          disabled={draftingLeadId === inspectedLead.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#f95721] hover:bg-[#ea4710] text-white text-[11px] font-bold shadow-sm transition-all disabled:opacity-50"
                        >
                          <Sparkles className={`w-3 h-3 ${draftingLeadId === inspectedLead.id ? 'animate-spin' : ''}`} />
                          <span>{draftingLeadId === inspectedLead.id ? 'Drafting...' : 'Draft with Gemini'}</span>
                        </button>
                      )}
                    </div>

                    {latestDraft ? (
                      <div className="p-3.5 rounded-xl bg-[#0e0e14] border border-[#20202e] space-y-2.5 text-xs">
                        <div className="flex items-center justify-between border-b border-[#1c1c26] pb-2">
                          <span className="font-bold text-white truncate max-w-[280px]">
                            Subject: {latestDraft.subject}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${latestDraft.status === 'SENT'
                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                            : latestDraft.status === 'APPROVED'
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                            }`}>
                            {latestDraft.status}
                          </span>
                        </div>

                        <div className="text-slate-300 font-sans whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto p-1 text-[11px]">
                          {latestDraft.body}
                        </div>

                        {/* Draft Action Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1c1c26]">
                          {latestDraft.status === 'DRAFT' && (
                            <button
                              type="button"
                              onClick={() => handleApproveDraft(latestDraft.id)}
                              disabled={approvingDraftId === latestDraft.id}
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow transition-colors disabled:opacity-50"
                            >
                              {approvingDraftId === latestDraft.id ? 'Approving...' : 'Approve Draft'}
                            </button>
                          )}

                          {primaryContact?.email && latestDraft.status !== 'SENT' && (
                            <button
                              type="button"
                              onClick={() => handleSendDraftEmail(latestDraft.id, primaryContact.email!)}
                              disabled={sendingDraftId === latestDraft.id}
                              className="px-3 py-1 rounded-lg bg-[#f95721] hover:bg-[#ff6835] text-white text-[11px] font-bold shadow transition-colors disabled:opacity-50 flex items-center gap-1"
                            >
                              <Send className="w-3 h-3" />
                              <span>{sendingDraftId === latestDraft.id ? 'Sending...' : 'Send via Gmail SMTP'}</span>
                            </button>
                          )}

                          {latestDraft.status === 'SENT' && (
                            <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Dispatched via SMTP</span>
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-[#0c0c10] border border-[#1e1e28] text-center text-xs text-slate-500">
                        No outreach email generated yet. Click "Draft with Gemini" to create a personalized cold email.
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

          </div>
        )}
      </div>

    </div>
  );
};
