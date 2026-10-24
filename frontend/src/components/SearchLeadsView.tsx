import React, { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
  MapPin,
  Building2,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Compass,
  ArrowRight
} from 'lucide-react';
import type { TargetProfile } from '../types';
import { api } from '../services/api';

interface SearchLeadsViewProps {
  onSelectLead: (leadId: number) => void;
  onNavigateToManage: () => void;
  onRefreshParentStats?: () => void;
}

interface DiscoveredResultItem {
  id: number;
  company_name: string;
  website?: string | null;
  source_url?: string | null;
  industry?: string | null;
  location?: string | null;
  fit_score?: number | null;
  status: string;
  website_status?: string;
  fit_reason?: string | null;
  strengths?: string[];
  risks?: string[];
  contacts?: Array<{
    name: string;
    email?: string;
    job_title?: string;
    email_status?: string;
  }>;
}

export const SearchLeadsView: React.FC<SearchLeadsViewProps> = ({
  onSelectLead,
  onNavigateToManage,
  onRefreshParentStats,
}) => {
  // Search Mode: 'query' (Natural Language) vs 'structured'
  const [searchMode, setSearchMode] = useState<'query' | 'structured'>('query');
  
  // Natural Language input
  const [naturalQuery, setNaturalQuery] = useState<string>('Find 5 hotels in Addis Ababa without an official website and draft website-development emails');
  
  // Structured input
  const [profiles, setProfiles] = useState<TargetProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number | 'custom'>('custom');
  const [industry, setIndustry] = useState<string>('Hospitality');
  const [location, setLocation] = useState<string>('Addis Ababa, Ethiopia');
  const [serviceOffered, setServiceOffered] = useState<string>('Website & Digital Presence Development');
  const [requireNoWebsite, setRequireNoWebsite] = useState<boolean>(true);
  const [quantity, setQuantity] = useState<number>(5);

  // Search execution states
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [searchResults, setSearchResults] = useState<DiscoveredResultItem[]>([]);
  const [searchSummary, setSearchSummary] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quick preset queries
  const presets = [
    {
      title: 'Addis Ababa Hotels (No Website)',
      query: 'Find 5 hotels in Addis Ababa without an official website and draft website-development emails',
      tag: 'Hospitality',
    },
    {
      title: 'Ethiopian B2B SaaS Startups',
      query: 'Find 5 SaaS companies in Ethiopia that need AI automation systems',
      tag: 'B2B Tech',
    },
    {
      title: 'US B2B Marketing Agencies',
      query: 'Find 5 digital marketing agencies in California needing sales prospecting automation',
      tag: 'Agencies',
    },
  ];

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const data = await api.getProfiles();
      setProfiles(data);
    } catch {
      // ignore
    }
  };

  const handleApplyPreset = (q: string) => {
    setNaturalQuery(q);
    setSearchMode('query');
  };

  const handleProfileChange = (val: string) => {
    if (val === 'custom') {
      setSelectedProfileId('custom');
    } else {
      const pId = Number(val);
      setSelectedProfileId(pId);
      const prof = profiles.find((p) => p.id === pId);
      if (prof) {
        setIndustry(prof.industry || 'B2B SaaS');
        setLocation(prof.location || 'United States');
        setServiceOffered(prof.criteria || 'Sales Operations Automation');
      }
    }
  };

  const handleExecuteSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setIsSearching(true);
    setActiveStep(1);

    // Step animation simulator for visual feedback
    const stepTimer1 = setTimeout(() => setActiveStep(2), 1400);
    const stepTimer2 = setTimeout(() => setActiveStep(3), 3200);

    try {
      let promptText = '';
      if (searchMode === 'query') {
        promptText = naturalQuery.trim();
      } else {
        const noWebClause = requireNoWebsite ? ' without an official website' : '';
        promptText = `Find ${quantity} ${industry} companies in ${location}${noWebClause} and pitch ${serviceOffered}`;
      }

      if (!promptText) {
        throw new Error('Please enter a search query or configure the criteria.');
      }

      const res = await api.sendChat([{ role: 'user', content: promptText }]);
      
      setActiveStep(4);
      setSearchSummary(res.content);

      if (res.pipeline_leads && res.pipeline_leads.length > 0) {
        setSearchResults(res.pipeline_leads);
      } else {
        // Fallback: fetch newly added leads
        const freshLeads = await api.getLeads({ search: industry || location });
        setSearchResults(freshLeads.slice(0, 5));
      }

      if (onRefreshParentStats) {
        onRefreshParentStats();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Discovery search failed. Please verify API configuration.');
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setIsSearching(false);
    }
  };

  const getScoreBadge = (score?: number | null) => {
    if (score === undefined || score === null) {
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#181822] text-slate-400 border border-[#262634]">
          Pending
        </span>
      );
    }
    if (score >= 80) {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          {score}/100 High Fit
        </span>
      );
    }
    if (score >= 65) {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
          {score}/100 Moderate
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/30">
        {score}/100 Disqualified
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 animate-fade-in font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1c1c24]">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Compass className="w-5 h-5 text-[#f95721]" />
            <span>Search Leads</span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#181824] text-[#f95721] border border-[#2a2a3c]">
              FR-02 Discovery
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Discover potential customer companies using public data, Firecrawl website verification, Gemini AI scoring, and Hunter.io email discovery.
          </p>
        </div>

        {/* Go to Manage Leads button */}
        <button
          onClick={onNavigateToManage}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#14141c] hover:bg-[#1c1c28] border border-[#262636] text-slate-300 hover:text-white text-xs font-semibold transition-all group"
        >
          <span>View Saved Leads</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-[#f95721]" />
        </button>
      </div>

      {/* Preset Recommendation Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mr-1">
          <Sparkles className="w-3.5 h-3.5 text-[#f95721]" /> Quick Searches:
        </span>
        {presets.map((p, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleApplyPreset(p.query)}
            className="px-2.5 py-1 rounded-lg bg-[#111116] hover:bg-[#1a1a22] border border-[#22222e] hover:border-[#f95721]/50 text-slate-300 hover:text-white text-[11px] transition-colors flex items-center gap-1.5"
          >
            <span className="font-medium">{p.title}</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-[#1c1c28] text-[#f95721] font-mono">
              {p.tag}
            </span>
          </button>
        ))}
      </div>

      {/* Main Search Panel */}
      <div className="bg-[#121217] border border-[#22222c] rounded-2xl p-5 shadow-xl space-y-4">
        
        {/* Toggle Mode: Natural Language vs Structured Fields */}
        <div className="flex items-center justify-between border-b border-[#1c1c26] pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSearchMode('query')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                searchMode === 'query'
                  ? 'bg-[#f95721] text-white shadow-sm'
                  : 'bg-[#0c0c10] text-slate-400 hover:text-white border border-[#22222e]'
              }`}
            >
              Natural Language Prompt
            </button>
            <button
              type="button"
              onClick={() => setSearchMode('structured')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                searchMode === 'structured'
                  ? 'bg-[#f95721] text-white shadow-sm'
                  : 'bg-[#0c0c10] text-slate-400 hover:text-white border border-[#22222e]'
              }`}
            >
              Structured Criteria Builder
            </button>
          </div>

          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Preserves exact location & website constraints
          </span>
        </div>

        {/* Mode 1: Natural Language Prompt */}
        {searchMode === 'query' && (
          <form onSubmit={handleExecuteSearch} className="space-y-3">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
              <textarea
                rows={2}
                value={naturalQuery}
                onChange={(e) => setNaturalQuery(e.target.value)}
                placeholder="e.g. Find 5 hotels in Addis Ababa without an official website and draft website-development emails..."
                className="w-full bg-[#0c0c10] border border-[#22222e] rounded-xl pl-11 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#f95721] transition-colors resize-none leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="text-[11px] text-slate-400">
                💡 Tip: Mentioning <span className="text-slate-300 font-mono">"without official website"</span> triggers automated web verification evidence.
              </div>

              <button
                type="submit"
                disabled={isSearching || !naturalQuery.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#f95721] to-[#ea4710] hover:brightness-110 text-white font-bold text-xs shadow-md shadow-[#f95721]/25 transition-all disabled:opacity-50"
              >
                {isSearching ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Discovering Leads...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Run AI Lead Search</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Mode 2: Structured Criteria Builder */}
        {searchMode === 'structured' && (
          <form onSubmit={handleExecuteSearch} className="space-y-4">
            
            {/* Target Profile Pre-filler */}
            {profiles.length > 0 && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Load Saved Target Profile (Optional)
                </label>
                <select
                  value={selectedProfileId}
                  onChange={(e) => handleProfileChange(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white focus:outline-none focus:border-[#f95721]"
                >
                  <option value="custom">Custom Search Criteria</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.industry} • {p.location || 'Any'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Target Industry
                </label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. Hospitality, SaaS, Healthcare"
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white focus:outline-none focus:border-[#f95721]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Target Location (City / Country)
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Addis Ababa, Ethiopia"
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white focus:outline-none focus:border-[#f95721]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Target Quantity
                </label>
                <select
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white focus:outline-none focus:border-[#f95721]"
                >
                  <option value={3}>3 Leads</option>
                  <option value={5}>5 Leads</option>
                  <option value={10}>10 Leads</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Service / Value Proposition to Pitch
              </label>
              <input
                type="text"
                value={serviceOffered}
                onChange={(e) => setServiceOffered(e.target.value)}
                placeholder="e.g. Website development, AI automation workflows, CRM setup"
                className="w-full mt-1 px-3 py-2 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white focus:outline-none focus:border-[#f95721]"
              />
            </div>

            {/* Checkbox constraint */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[#0c0c10] border border-[#22222e]">
              <input
                type="checkbox"
                id="noWebCheck"
                checked={requireNoWebsite}
                onChange={(e) => setRequireNoWebsite(e.target.checked)}
                className="w-4 h-4 rounded text-[#f95721] focus:ring-0 bg-[#14141c] border-[#333344] cursor-pointer"
              />
              <label htmlFor="noWebCheck" className="text-xs text-slate-300 font-medium cursor-pointer">
                Strict Constraint: Target companies that <strong>lack an official website</strong> (verified via Firecrawl search)
              </label>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isSearching}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#f95721] to-[#ea4710] hover:brightness-110 text-white font-bold text-xs shadow-md shadow-[#f95721]/25 transition-all disabled:opacity-50"
              >
                {isSearching ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Searching Companies...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Execute Structured Search</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

      </div>

      {/* Live Pipeline Steps Progress (Visible when searching) */}
      {isSearching && (
        <div className="bg-[#121217] border border-[#22222c] rounded-2xl p-4 shadow-lg space-y-3 animate-fade-in">
          <div className="text-xs font-bold text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#f95721]" />
              <span>Pipeline In Progress</span>
            </span>
            <span className="text-[11px] text-slate-400">Step {activeStep} of 4</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            {[
              { num: 1, title: 'Discovery', desc: 'Sourcing candidate companies' },
              { num: 2, title: 'Firecrawl', desc: 'Verifying official websites' },
              { num: 3, title: 'Gemini AI', desc: 'Evaluating suitability & fit' },
              { num: 4, title: 'Hunter.io', desc: 'Finding decision-maker emails' },
            ].map((step) => {
              const isPast = activeStep > step.num;
              const isCurrent = activeStep === step.num;
              return (
                <div
                  key={step.num}
                  className={`p-2.5 rounded-xl border transition-all ${
                    isPast
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : isCurrent
                      ? 'bg-[#f95721]/15 border-[#f95721]/40 text-white shadow-sm'
                      : 'bg-[#0c0c10] border-[#1e1e28] text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    {isPast ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <span className="w-4 h-4 rounded-full bg-[#1e1e28] text-[10px] flex items-center justify-center font-mono">
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
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Search Results Area */}
      {searchResults.length > 0 && (
        <div className="space-y-4 animate-fade-in">
          
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#f95721]" />
              <span>Search Results & Evaluated Leads</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#181824] text-emerald-400 border border-emerald-500/30 font-bold">
                {searchResults.length} Discovered & Saved
              </span>
            </h2>

            <button
              onClick={onNavigateToManage}
              className="text-xs text-[#f95721] hover:underline flex items-center gap-1 font-semibold"
            >
              <span>Manage all in Saved Leads</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {searchSummary && (
            <div className="p-3.5 rounded-2xl bg-[#121217] border border-[#22222e] text-xs text-slate-300 whitespace-pre-line leading-relaxed">
              {searchSummary}
            </div>
          )}

          {/* Result Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {searchResults.map((lead) => {
              return (
                <div
                  key={lead.id}
                  onClick={() => onSelectLead(lead.id)}
                  className="bg-[#121217] hover:bg-[#15151c] border border-[#22222e] hover:border-[#333346] rounded-2xl p-4 shadow-lg transition-all cursor-pointer group space-y-3"
                >
                  {/* Top: Name & Fit Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-[#f95721] transition-colors">
                        {lead.company_name}
                      </h3>
                      {lead.website && (
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
                      )}
                    </div>

                    <div className="shrink-0 text-right">
                      {getScoreBadge(lead.fit_score)}
                    </div>
                  </div>

                  {/* Location & Industry */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#f95721]" />
                      <span>{lead.location || 'Location Not Specified'}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-slate-500" />
                      <span>{lead.industry || 'B2B'}</span>
                    </span>
                    {lead.website_status && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#1c1c28] text-amber-300 border border-amber-500/20 font-mono">
                        {lead.website_status}
                      </span>
                    )}
                  </div>

                  {/* AI Reasoning Preview */}
                  {lead.fit_reason && (
                    <div className="p-2.5 rounded-xl bg-[#0b0b0f] border border-[#1e1e28] text-[11px] text-slate-300 leading-relaxed">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                        Gemini AI Assessment
                      </div>
                      <p className="line-clamp-2">{lead.fit_reason}</p>
                    </div>
                  )}

                  {/* Bottom: Contact count & Actions */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#1c1c24] text-[11px]">
                    <div className="flex items-center gap-1 text-slate-400">
                      <Mail className="w-3.5 h-3.5 text-blue-400" />
                      <span>
                        {lead.contacts && lead.contacts.length > 0
                          ? `${lead.contacts.length} decision-maker email(s)`
                          : 'Hunter.io contact verified'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[#f95721] font-semibold text-xs group-hover:translate-x-0.5 transition-transform">
                      <span>Inspect Dossier</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* Empty State when no search has been run yet */}
      {!isSearching && searchResults.length === 0 && (
        <div className="py-16 text-center max-w-lg mx-auto space-y-3 bg-[#101015] border border-[#1e1e28] rounded-2xl p-6">
          <div className="h-12 w-12 rounded-2xl bg-[#171720] mx-auto flex items-center justify-center text-[#f95721] shadow-inner">
            <Compass className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white">Ready to Discover New Leads</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Choose a quick search above, or type your exact customer criteria. The autonomous pipeline will search public sources, verify websites with Firecrawl, score fit with Gemini, and locate emails with Hunter.io.
          </p>
        </div>
      )}

    </div>
  );
};
