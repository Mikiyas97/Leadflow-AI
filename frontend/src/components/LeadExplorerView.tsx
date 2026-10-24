import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  ExternalLink,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Building2,
  MapPin,
  Trash2
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
  const [error, setError] = useState<string | null>(null);

  const loadLeads = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getLeads({
        search: search.trim() || undefined,
        status: statusFilter,
      });
      setLeads(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadLeads();
  };

  const handleStatusChange = async (leadId: number, newStatus: any) => {
    try {
      await api.updateLead(leadId, { status: newStatus });
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
      );
    } catch (err: any) {
      alert(`Could not update lead status: ${err.message}`);
    }
  };

  const handleDeleteLead = async (e: React.MouseEvent, leadId: number) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to remove this lead?')) return;
    try {
      await api.deleteLead(leadId);
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
    } catch (err: any) {
      alert(`Failed to delete lead: ${err.message}`);
    }
  };

  const getScoreBadge = (score?: number | null) => {
    if (score === undefined || score === null) {
      return (
        <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
          Unscored
        </span>
      );
    }
    if (score >= 80) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
          <Sparkles className="w-3 h-3" />
          {score}/100
        </span>
      );
    }
    if (score >= 65) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/25">
          {score}/100
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/25">
        {score}/100
      </span>
    );
  };

  return (
    <div className="space-y-5 animate-fade-in">
      
      {/* Controls & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
        
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, domain, or industry..."
            className="w-full pl-9 pr-20 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-slate-850 hover:bg-slate-800 text-[11px] font-medium text-slate-300 transition-colors"
          >
            Search
          </button>
        </form>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-[11px] text-slate-500 mr-1 hidden sm:inline flex items-center gap-1">
            <Filter className="w-3 h-3" /> Status:
          </span>
          {['ALL', 'QUALIFIED', 'NEW', 'CONTACTED', 'UNQUALIFIED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                statusFilter === st
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}

          <button
            onClick={loadLeads}
            title="Refresh Leads"
            className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors ml-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

      </div>

      {/* Leads Table Container */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading && leads.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-brand-400" />
            <span>Loading prospective leads...</span>
          </div>
        ) : error ? (
          <div className="py-12 text-center text-xs text-red-400">
            {error}
          </div>
        ) : leads.length === 0 ? (
          <div className="py-20 text-center max-w-md mx-auto space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-slate-800/80 mx-auto flex items-center justify-center text-slate-400">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-white">No leads match your filter</h3>
            <p className="text-xs text-slate-400">
              Try adjusting your search criteria or trigger a new discovery run to crawl fresh B2B companies.
            </p>
            <button
              onClick={onOpenDiscovery}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium shadow-md shadow-brand-500/20"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Launch Lead Discovery</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Company & Domain</th>
                  <th className="py-3.5 px-4 font-semibold">Industry & Location</th>
                  <th className="py-3.5 px-4 font-semibold text-center">AI Fit Score</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold">Discovered</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => onSelectLead(lead.id)}
                    className="hover:bg-slate-850/50 cursor-pointer transition-colors group"
                  >
                    {/* Company */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-100 group-hover:text-brand-400 transition-colors">
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
                    <td className="py-3 px-4">
                      <div className="text-slate-300 font-medium truncate max-w-[200px]">
                        {lead.industry || 'B2B Software'}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span>{lead.location || 'Remote / US'}</span>
                      </div>
                    </td>

                    {/* AI Score */}
                    <td className="py-3 px-4 text-center">
                      {getScoreBadge(lead.fit_score)}
                    </td>

                    {/* Status Dropdown */}
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={lead.status}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border focus:outline-none cursor-pointer ${
                          lead.status === 'QUALIFIED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : lead.status === 'CONTACTED'
                            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                            : lead.status === 'UNQUALIFIED'
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        <option value="NEW">NEW</option>
                        <option value="QUALIFIED">QUALIFIED</option>
                        <option value="CONTACTED">CONTACTED</option>
                        <option value="UNQUALIFIED">UNQUALIFIED</option>
                        <option value="ARCHIVED">ARCHIVED</option>
                      </select>
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {new Date(lead.created_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => onSelectLead(lead.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-brand-600 text-slate-300 hover:text-white transition-colors"
                          title="Inspect AI Analysis"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteLead(e, lead.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white transition-colors"
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
