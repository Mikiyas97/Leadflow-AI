import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Building2,
  ExternalLink,
  ChevronRight,
  Trash2,
  RefreshCw,
  Sparkles,
  MapPin,
  AlertTriangle,
  Calendar
} from 'lucide-react';
import type { Lead } from '../types';
import { api } from '../services/api';

interface LeadExplorerViewProps {
  onSelectLead: (leadId: number) => void;
  onOpenDiscovery: () => void;
}

export const LeadExplorerView: React.FC<LeadExplorerViewProps> = ({
  onSelectLead,
  onOpenDiscovery,
}) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isOverdueOnly, setIsOverdueOnly] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
      });
      setLeads(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load prospective leads');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadLeads();
  };

  const handleStatusChange = async (leadId: number, newStatus: string) => {
    try {
      await api.updateLead(leadId, { status: newStatus as any });
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: newStatus as any } : l))
      );
    } catch (err: any) {
      alert(`Could not update lead status: ${err.message}`);
    }
  };

  const handleDeleteLead = async (e: React.MouseEvent, leadId: number) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this prospect lead record?')) return;

    try {
      await api.deleteLead(leadId);
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
    } catch (err: any) {
      alert(`Could not delete lead: ${err.message}`);
    }
  };

  const getScoreBadge = (score: number | null | undefined) => {
    if (score === null || score === undefined) {
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#181820] text-slate-400 border border-[#242430]">
          Pending
        </span>
      );
    }
    if (score >= 80) {
      return (
        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
          {score}/100 High Fit
        </span>
      );
    }
    if (score >= 65) {
      return (
        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/25">
          {score}/100 Moderate
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/25">
        {score}/100 Unqualified
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Lead Explorer</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#181822] text-[#f95721] border border-[#262634]">
              {leads.length} Records
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Search, filter by AI qualification status, manage outreach states, and inspect research evidence.
          </p>
        </div>

        <button
          onClick={onOpenDiscovery}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#f95721] hover:bg-[#ea4710] text-white text-xs font-semibold shadow-md shadow-[#f95721]/20 transition-all hover:scale-[1.01]"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Launch Discovery</span>
        </button>
      </div>

      {/* Filter and Search Bar Row */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-[#121217] border border-[#22222c] p-3 rounded-2xl">
        
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company, website, industry, or location..."
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
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === st
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
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
              isOverdueOnly
                ? 'bg-amber-500 text-black shadow-sm font-bold'
                : 'bg-[#0c0c10] text-amber-400 hover:text-amber-300 border border-amber-500/30'
            }`}
            title="Filter overdue follow-ups"
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Overdue</span>
          </button>

          <button
            onClick={loadLeads}
            title="Refresh Leads"
            className="p-2 rounded-lg bg-[#0c0c10] border border-[#22222e] text-slate-400 hover:text-slate-200 transition-colors ml-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

      </div>

      {/* Leads Table Container */}
      <div className="bg-[#121217] border border-[#22222c] rounded-2xl overflow-hidden shadow-xl">
        {loading && leads.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-[#f95721]" />
            <span>Loading prospective leads...</span>
          </div>
        ) : error ? (
          <div className="py-12 text-center text-xs text-red-400">
            {error}
          </div>
        ) : leads.length === 0 ? (
          <div className="py-20 text-center max-w-md mx-auto space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-[#181822] mx-auto flex items-center justify-center text-slate-400">
              <Building2 className="w-6 h-6 text-[#f95721]" />
            </div>
            <h3 className="text-sm font-semibold text-white">No leads match your filter</h3>
            <p className="text-xs text-slate-400">
              Try adjusting your search query, or launch an automated discovery run to crawl fresh B2B companies.
            </p>
            <button
              onClick={onOpenDiscovery}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#f95721] hover:bg-[#ea4710] text-white text-xs font-semibold shadow-md shadow-[#f95721]/20"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Launch Lead Discovery</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0c0c10] text-slate-400 border-b border-[#202028] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Company & Domain</th>
                  <th className="py-3.5 px-4 font-semibold">Industry & Location</th>
                  <th className="py-3.5 px-4 font-semibold text-center">AI Fit Score</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold">Follow-up</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e28]">
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => onSelectLead(lead.id)}
                    className="hover:bg-[#181820] cursor-pointer transition-colors group"
                  >
                    {/* Company */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-100 group-hover:text-[#f95721] transition-colors">
                        {lead.company_name}
                      </div>
                      <a
                        href={lead.source_url || `https://${lead.website}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 mt-0.5"
                      >
                        <span>{lead.website}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>

                    {/* Industry & Location */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-300 font-medium truncate max-w-[200px]">
                        {lead.industry || 'B2B Software'}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-[#f95721] shrink-0" />
                        <span>{lead.location || 'United States'}</span>
                      </div>
                    </td>

                    {/* AI Score */}
                    <td className="py-3.5 px-4 text-center">
                      {getScoreBadge(lead.fit_score)}
                    </td>

                    {/* Status Dropdown */}
                    <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={lead.status}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border focus:outline-none cursor-pointer ${
                          lead.status === 'QUALIFIED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                            : lead.status === 'CONTACTED'
                            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25'
                            : lead.status === 'UNQUALIFIED'
                            ? 'bg-red-500/10 text-red-400 border-red-500/25'
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
                    </td>

                    {/* Follow-up status */}
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {(lead as any).follow_up_date ? (
                        <div className="flex items-center gap-1 text-slate-300">
                          <Calendar className="w-3 h-3 text-amber-400" />
                          <span>{new Date((lead as any).follow_up_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => onSelectLead(lead.id)}
                          className="p-1.5 rounded-lg bg-[#181822] hover:bg-[#f95721] text-slate-300 hover:text-white transition-colors"
                          title="Inspect AI Analysis"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteLead(e, lead.id)}
                          className="p-1.5 rounded-lg bg-[#181822] hover:bg-red-600 text-slate-400 hover:text-white transition-colors"
                          title="Delete Lead"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
