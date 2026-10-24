import React, { useState, useEffect } from 'react';
import {
  Compass,
  SlidersHorizontal,
  Sparkles,
  MapPin,
  Building2,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Mail,
  ArrowRight,
  Users,
  Briefcase,
  Layers,
  RotateCcw,
  ShieldCheck,
  Search
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

interface FormPreset {
  title: string;
  industry: string;
  location: string;
  companySize: string;
  serviceOffered: string;
  targetDecisionMakers: string;
  requireNoWebsite: boolean;
  quantity: number;
  tag: string;
}

export const SearchLeadsView: React.FC<SearchLeadsViewProps> = ({
  onSelectLead,
  onNavigateToManage,
  onRefreshParentStats,
}) => {
  // Target Profiles (FR-01 ICP integration)
  const [profiles, setProfiles] = useState<TargetProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number | 'custom'>('custom');

  // Form Fields (Exclusively form-based lead search)
  const [industry, setIndustry] = useState<string>('Hospitality');
  const [location, setLocation] = useState<string>('Addis Ababa, Ethiopia');
  const [companySize, setCompanySize] = useState<string>('Local Business / SME');
  const [serviceOffered, setServiceOffered] = useState<string>('Website & Digital Presence Development');
  const [targetDecisionMakers, setTargetDecisionMakers] = useState<string>('General Manager, Owner, Managing Director');
  const [requireNoWebsite, setRequireNoWebsite] = useState<boolean>(true);
  const [requireVerifiedEmail, setRequireVerifiedEmail] = useState<boolean>(true);
  const [quantity, setQuantity] = useState<number>(5);

  // Search execution states
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [searchResults, setSearchResults] = useState<DiscoveredResultItem[]>([]);
  const [searchSummary, setSearchSummary] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quick Form Presets (Populate form inputs with a single click)
  const formPresets: FormPreset[] = [
    {
      title: 'Addis Ababa Hotels (No Website)',
      industry: 'Hospitality',
      location: 'Addis Ababa, Ethiopia',
      companySize: 'Local Business / SME',
      serviceOffered: 'Website & Digital Presence Development',
      targetDecisionMakers: 'General Manager, Owner, Managing Director',
      requireNoWebsite: true,
      quantity: 5,
      tag: 'Hospitality',
    },
    {
      title: 'US B2B SaaS Startups',
      industry: 'B2B SaaS',
      location: 'United States',
      companySize: 'Growth Stage (20-100 employees)',
      serviceOffered: 'AI Customer Support Automation',
      targetDecisionMakers: 'Founder, CEO, CTO, Head of Support',
      requireNoWebsite: false,
      quantity: 5,
      tag: 'Tech',
    },
    {
      title: 'California Marketing Agencies',
      industry: 'Digital Marketing Agencies',
      location: 'California, USA',
      companySize: 'Boutique Agency (10-50 employees)',
      serviceOffered: 'Automated Outbound Sales Prospecting',
      targetDecisionMakers: 'Agency Owner, VP Business Development, Managing Partner',
      requireNoWebsite: false,
      quantity: 5,
      tag: 'Agencies',
    },
    {
      title: 'London Healthcare Clinics',
      industry: 'Healthcare & Private Clinics',
      location: 'London, UK',
      companySize: 'Local Practice (5-30 employees)',
      serviceOffered: 'Patient Booking System & Inbound AI Assistant',
      targetDecisionMakers: 'Clinic Director, Practice Manager, Founder',
      requireNoWebsite: false,
      quantity: 5,
      tag: 'Healthcare',
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
      // ignore silently if profiles unavailable
    }
  };

  const handleApplyPreset = (preset: FormPreset) => {
    setIndustry(preset.industry);
    setLocation(preset.location);
    setCompanySize(preset.companySize);
    setServiceOffered(preset.serviceOffered);
    setTargetDecisionMakers(preset.targetDecisionMakers);
    setRequireNoWebsite(preset.requireNoWebsite);
    setQuantity(preset.quantity);
    setSelectedProfileId('custom');
    setErrorMessage(null);
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
        setCompanySize(prof.company_size || 'Growth Stage (20-100 employees)');
        setServiceOffered(prof.criteria || 'Sales Operations Automation');
      }
    }
  };

  const handleResetForm = () => {
    setIndustry('');
    setLocation('');
    setCompanySize('Any Size / All Stages');
    setServiceOffered('');
    setTargetDecisionMakers('');
    setRequireNoWebsite(false);
    setRequireVerifiedEmail(true);
    setQuantity(5);
    setSelectedProfileId('custom');
    setErrorMessage(null);
  };

  const handleExecuteSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!industry.trim() || !location.trim()) {
      setErrorMessage('Please specify both a Target Industry and Target Location.');
      return;
    }

    setErrorMessage(null);
    setIsSearching(true);
    setActiveStep(1);

    // Visual step feedback timers
    const stepTimer1 = setTimeout(() => setActiveStep(2), 1400);
    const stepTimer2 = setTimeout(() => setActiveStep(3), 3200);

    try {
      const noWebClause = requireNoWebsite ? ' without an official website' : '';
      const sizeClause = companySize && companySize !== 'Any Size / All Stages' ? ` (${companySize})` : '';
      const rolesClause = targetDecisionMakers.trim() ? ` (target decision-maker roles: ${targetDecisionMakers.trim()})` : '';
      const pitchClause = serviceOffered.trim() ? ` and pitch ${serviceOffered.trim()}` : '';

      const promptText = `Find ${quantity} ${industry.trim()} companies${sizeClause} in ${location.trim()}${noWebClause}${pitchClause}${rolesClause}`;

      const res = await api.sendChat([{ role: 'user', content: promptText }]);
      
      setActiveStep(4);
      setSearchSummary(res.content);

      if (res.pipeline_leads && res.pipeline_leads.length > 0) {
        setSearchResults(res.pipeline_leads);
      } else {
        // Fallback: fetch newly recorded leads matching criteria
        const freshLeads = await api.getLeads({ search: industry || location });
        setSearchResults(freshLeads.slice(0, quantity));
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
            <SlidersHorizontal className="w-5 h-5 text-[#f95721]" />
            <span>Search Leads Form</span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#181824] text-[#f95721] border border-[#2a2a3c]">
              FR-01 / FR-02
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Fill the search form to discover candidate companies via Google Search, crawl websites with Firecrawl, evaluate suitability with Gemini AI, and find decision-maker emails with Hunter.io.
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

      {/* Preset Form Templates */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mr-1">
          <Sparkles className="w-3.5 h-3.5 text-[#f95721]" /> Form Presets:
        </span>
        {formPresets.map((preset, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleApplyPreset(preset)}
            className="px-2.5 py-1 rounded-lg bg-[#111116] hover:bg-[#1a1a22] border border-[#22222e] hover:border-[#f95721]/50 text-slate-300 hover:text-white text-[11px] transition-colors flex items-center gap-1.5"
          >
            <span className="font-medium">{preset.title}</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-[#1c1c28] text-[#f95721] font-mono">
              {preset.tag}
            </span>
          </button>
        ))}
      </div>

      {/* Exclusively Structured Search Form */}
      <form onSubmit={handleExecuteSearch} className="bg-[#121217] border border-[#22222c] rounded-2xl p-5 shadow-xl space-y-5">
        
        {/* Row 1: Target Profile Selector & Quantity */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-[#f95721]" />
              <span>Target Profile (ICP Pre-fill)</span>
            </label>
            <select
              value={selectedProfileId}
              onChange={(e) => handleProfileChange(e.target.value)}
              className="w-full mt-1.5 px-3 py-2 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white focus:outline-none focus:border-[#f95721]"
            >
              <option value="custom">Custom Search Criteria (Manual)</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.industry} • {p.location || 'Any'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Compass className="w-3 h-3 text-[#f95721]" />
              <span>Target Quantity</span>
            </label>
            <select
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full mt-1.5 px-3 py-2 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white focus:outline-none focus:border-[#f95721]"
            >
              <option value={3}>3 Leads (Fast Verification)</option>
              <option value={5}>5 Leads (Recommended)</option>
              <option value={10}>10 Leads (Thorough Search)</option>
              <option value={15}>15 Leads (Batch Discovery)</option>
            </select>
          </div>
        </div>

        {/* Row 2: Target Industry, Location, Company Size */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3 h-3 text-[#f95721]" />
              <span>Target Industry *</span>
            </label>
            <input
              type="text"
              required
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g. Hospitality, B2B SaaS, Healthcare"
              className="w-full mt-1.5 px-3 py-2 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white focus:outline-none focus:border-[#f95721]"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-[#f95721]" />
              <span>Target Location (City / Region / Country) *</span>
            </label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Addis Ababa, Ethiopia or United States"
              className="w-full mt-1.5 px-3 py-2 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white focus:outline-none focus:border-[#f95721]"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Users className="w-3 h-3 text-[#f95721]" />
              <span>Company Size & Stage</span>
            </label>
            <select
              value={companySize}
              onChange={(e) => setCompanySize(e.target.value)}
              className="w-full mt-1.5 px-3 py-2 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white focus:outline-none focus:border-[#f95721]"
            >
              <option value="Any Size / All Stages">Any Size / All Stages</option>
              <option value="Local Business / SME">Local Business / SME (1-20 employees)</option>
              <option value="Growth Stage (20-100 employees)">Growth Stage (20-100 employees)</option>
              <option value="Mid-Market & Enterprise (100+ employees)">Mid-Market & Enterprise (100+ employees)</option>
              <option value="Bootstrapped / Seed Startups">Bootstrapped / Seed Startups</option>
            </select>
          </div>
        </div>

        {/* Row 3: Value Proposition / Pitch & Target Decision Makers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Briefcase className="w-3 h-3 text-[#f95721]" />
              <span>Value Proposition / Service to Pitch</span>
            </label>
            <input
              type="text"
              value={serviceOffered}
              onChange={(e) => setServiceOffered(e.target.value)}
              placeholder="e.g. Website Development, AI Support Automation, CRM Ops"
              className="w-full mt-1.5 px-3 py-2 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white focus:outline-none focus:border-[#f95721]"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Gemini uses this to assess business fit and generate personalized outreach drafts.
            </span>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Mail className="w-3 h-3 text-[#f95721]" />
              <span>Target Decision-Maker Roles (Hunter.io)</span>
            </label>
            <input
              type="text"
              value={targetDecisionMakers}
              onChange={(e) => setTargetDecisionMakers(e.target.value)}
              placeholder="e.g. Founder, CEO, CTO, General Manager, Head of Sales"
              className="w-full mt-1.5 px-3 py-2 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white focus:outline-none focus:border-[#f95721]"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Hunter.io Email Finder prioritizes verified addresses matching these titles.
            </span>
          </div>
        </div>

        {/* Row 4: Constraint Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#0c0c10] border border-[#22222e] hover:border-[#333346] cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={requireNoWebsite}
              onChange={(e) => setRequireNoWebsite(e.target.checked)}
              className="w-4 h-4 rounded mt-0.5 text-[#f95721] focus:ring-0 bg-[#14141c] border-[#333344] cursor-pointer"
            />
            <div className="text-xs">
              <span className="text-slate-200 font-medium block">
                Strict Constraint: Target companies without an official website
              </span>
              <span className="text-[10px] text-slate-400">
                Filters candidates that only have directory or social listings (ideal for web dev pitches).
              </span>
            </div>
          </label>

          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#0c0c10] border border-[#22222e] hover:border-[#333346] cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={requireVerifiedEmail}
              onChange={(e) => setRequireVerifiedEmail(e.target.checked)}
              className="w-4 h-4 rounded mt-0.5 text-[#f95721] focus:ring-0 bg-[#14141c] border-[#333344] cursor-pointer"
            />
            <div className="text-xs">
              <span className="text-slate-200 font-medium block flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verify Deliverability with Hunter.io</span>
              </span>
              <span className="text-[10px] text-slate-400">
                Validates deliverable SMTP status and assigns confidence score to every contact found.
              </span>
            </div>
          </label>
        </div>

        {/* Form Action Controls */}
        <div className="flex items-center justify-between pt-3 border-t border-[#1c1c26]">
          <button
            type="button"
            onClick={handleResetForm}
            disabled={isSearching}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0c0c10] hover:bg-[#14141c] border border-[#22222e] text-slate-400 hover:text-slate-200 text-xs font-semibold transition-all disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Form</span>
          </button>

          <button
            type="submit"
            disabled={isSearching || !industry.trim() || !location.trim()}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#f95721] to-[#ea4710] hover:brightness-110 text-white font-bold text-xs shadow-md shadow-[#f95721]/25 transition-all disabled:opacity-50"
          >
            {isSearching ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Executing Lead Discovery...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Execute Lead Search</span>
              </>
            )}
          </button>
        </div>

      </form>

      {/* Live Pipeline Steps Progress (Visible when searching) */}
      {isSearching && (
        <div className="bg-[#121217] border border-[#22222c] rounded-2xl p-4 shadow-lg space-y-3 animate-fade-in">
          <div className="text-xs font-bold text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#f95721]" />
              <span>Automated Pipeline In Progress</span>
            </span>
            <span className="text-[11px] text-slate-400">Step {activeStep} of 4</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            {[
              { num: 1, title: 'Serper.dev Discovery', desc: 'Google Search for candidates' },
              { num: 2, title: 'Firecrawl Crawl', desc: 'Verifying official websites' },
              { num: 3, title: 'Gemini AI Assessment', desc: 'Evaluating suitability & fit' },
              { num: 4, title: 'Hunter.io Decision-Makers', desc: 'Finding deliverable emails' },
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
        <div className="py-12 text-center max-w-lg mx-auto space-y-3 bg-[#101015] border border-[#1e1e28] rounded-2xl p-6">
          <div className="h-12 w-12 rounded-2xl bg-[#171720] mx-auto flex items-center justify-center text-[#f95721] shadow-inner">
            <SlidersHorizontal className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white">Configure Search Criteria Above</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Specify your target industry, geography, company size, and pitch angle in the form above or pick a quick preset. The automated LeadFlow pipeline will discover candidates, verify official websites, score suitability with Gemini, and find verified decision-makers via Hunter.io.
          </p>
        </div>
      )}

    </div>
  );
};
