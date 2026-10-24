import React, { useState, useEffect } from 'react';
import {
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
  Search,
  Check,
  Plus,
  X,
  BookmarkPlus
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
  name: string;
  location: string;
  jobTitles: string[];
  industries: string[];
  companySizes: string[];
  serviceOffered: string;
  requireNoWebsite: boolean;
  quantity: number;
  tag: string;
}

// Available options
const AVAILABLE_JOB_TITLES = [
  'IT Director',
  'IT Manager',
  'Chief Information Officer',
  'VP of IT',
  'Head of IT',
  'Director of Information Technology',
  'Founder & CEO',
  'Chief Technology Officer',
  'General Manager'
];

const AVAILABLE_INDUSTRIES = [
  'Software & Internet',
  'Computers & Electronics',
  'Business Services',
  'Hospitality',
  'Healthcare & Clinics',
  'Financial Services',
  'Digital Marketing Agencies'
];

const AVAILABLE_SIZES = [
  '1 - 25',
  '25 - 100',
  '100 - 250',
  '250 - 1000',
  '1000+'
];

export const SearchLeadsView: React.FC<SearchLeadsViewProps> = ({
  onSelectLead,
  onNavigateToManage,
  onRefreshParentStats,
}) => {
  // Target Profiles (FR-01 ICP integration)
  const [profiles, setProfiles] = useState<TargetProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number | 'custom'>('custom');

  // Form Fields
  const [personaName, setPersonaName] = useState<string>('IT Administrators and Business Decision Makers at SMBs');
  const [selectedJobTitles, setSelectedJobTitles] = useState<string[]>([
    'IT Director',
    'IT Manager',
    'Chief Information Officer',
    'VP of IT',
    'Head of IT',
    'Director of Information Technology'
  ]);
  const [customJobTitleInput, setCustomJobTitleInput] = useState<string>('');

  const [location, setLocation] = useState<string>('United States');

  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([
    'Software & Internet',
    'Computers & Electronics',
    'Business Services'
  ]);
  const [customIndustryInput, setCustomIndustryInput] = useState<string>('');

  const [selectedCompanySizes, setSelectedCompanySizes] = useState<string[]>([
    '25 - 100',
    '100 - 250'
  ]);

  const [serviceOffered, setServiceOffered] = useState<string>(
    'Enterprise IT Infrastructure, Cloud Management & Cybersecurity Automation'
  );
  const [requireNoWebsite, setRequireNoWebsite] = useState<boolean>(false);
  const [requireVerifiedEmail, setRequireVerifiedEmail] = useState<boolean>(true);
  const [quantity, setQuantity] = useState<number>(5);

  // Search execution states
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [searchResults, setSearchResults] = useState<DiscoveredResultItem[]>([]);
  const [searchSummary, setSearchSummary] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Form Presets
  const formPresets: FormPreset[] = [
    {
      title: '⭐ IT Admins & Decision Makers (SMBs)',
      name: 'IT Administrators and Business Decision Makers at SMBs',
      location: 'United States',
      jobTitles: [
        'IT Director',
        'IT Manager',
        'Chief Information Officer',
        'VP of IT',
        'Head of IT',
        'Director of Information Technology'
      ],
      industries: ['Software & Internet', 'Computers & Electronics', 'Business Services'],
      companySizes: ['25 - 100', '100 - 250'],
      serviceOffered: 'Enterprise IT Infrastructure, Cloud Management & Cybersecurity Automation',
      requireNoWebsite: false,
      quantity: 5,
      tag: 'IT / SMB'
    },
    {
      title: 'Addis Ababa Hotels (No Website)',
      name: 'Addis Ababa Boutique Hotels & Lodges',
      location: 'Addis Ababa, Ethiopia',
      jobTitles: ['General Manager', 'Owner', 'Managing Director'],
      industries: ['Hospitality'],
      companySizes: ['1 - 25', '25 - 100'],
      serviceOffered: 'Official Website & Digital Presence Development',
      requireNoWebsite: true,
      quantity: 5,
      tag: 'Hospitality'
    },
    {
      title: 'US B2B SaaS Startups',
      name: 'High-Growth US B2B SaaS',
      location: 'United States',
      jobTitles: ['Founder & CEO', 'Chief Technology Officer', 'Head of IT'],
      industries: ['Software & Internet'],
      companySizes: ['25 - 100'],
      serviceOffered: 'AI Customer Support Automation',
      requireNoWebsite: false,
      quantity: 5,
      tag: 'B2B SaaS'
    },
    {
      title: 'California Marketing Agencies',
      name: 'California Digital Agencies',
      location: 'California, USA',
      jobTitles: ['Founder & CEO', 'VP of IT', 'General Manager'],
      industries: ['Digital Marketing Agencies', 'Business Services'],
      companySizes: ['25 - 100'],
      serviceOffered: 'Automated Sales Pipeline & Outbound Prospecting',
      requireNoWebsite: false,
      quantity: 5,
      tag: 'Agencies'
    }
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

  const handleApplyPreset = (preset: FormPreset) => {
    setPersonaName(preset.name);
    setLocation(preset.location);
    setSelectedJobTitles([...preset.jobTitles]);
    setSelectedIndustries([...preset.industries]);
    setSelectedCompanySizes([...preset.companySizes]);
    setServiceOffered(preset.serviceOffered);
    setRequireNoWebsite(preset.requireNoWebsite);
    setQuantity(preset.quantity);
    setSelectedProfileId('custom');
    setErrorMessage(null);
    setSaveSuccessMessage(null);
  };

  const handleProfileChange = (val: string) => {
    if (val === 'custom') {
      setSelectedProfileId('custom');
    } else {
      const pId = Number(val);
      setSelectedProfileId(pId);
      const prof = profiles.find((p) => p.id === pId);
      if (prof) {
        setPersonaName(prof.name);
        setLocation(prof.location || 'United States');
        if (prof.industry) {
          const splitInd = prof.industry.split(',').map((s) => s.trim()).filter(Boolean);
          setSelectedIndustries(splitInd);
        }
        if (prof.company_size) {
          setSelectedCompanySizes([prof.company_size]);
        }
        if (prof.criteria) {
          setServiceOffered(prof.criteria);
        }
      }
    }
  };

  const handleToggleJobTitle = (title: string) => {
    setSelectedJobTitles((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const handleAddCustomJobTitle = () => {
    const val = customJobTitleInput.trim();
    if (val && !selectedJobTitles.includes(val)) {
      setSelectedJobTitles((prev) => [...prev, val]);
      setCustomJobTitleInput('');
    }
  };

  const handleToggleIndustry = (ind: string) => {
    setSelectedIndustries((prev) =>
      prev.includes(ind) ? prev.filter((i) => i !== ind) : [...prev, ind]
    );
  };

  const handleAddCustomIndustry = () => {
    const val = customIndustryInput.trim();
    if (val && !selectedIndustries.includes(val)) {
      setSelectedIndustries((prev) => [...prev, val]);
      setCustomIndustryInput('');
    }
  };

  const handleToggleSize = (size: string) => {
    setSelectedCompanySizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const handleResetForm = () => {
    setPersonaName('');
    setLocation('United States');
    setSelectedJobTitles([]);
    setSelectedIndustries([]);
    setSelectedCompanySizes(['25 - 100']);
    setServiceOffered('');
    setRequireNoWebsite(false);
    setRequireVerifiedEmail(true);
    setQuantity(5);
    setSelectedProfileId('custom');
    setErrorMessage(null);
    setSaveSuccessMessage(null);
  };

  const handleSaveAsProfile = async () => {
    if (!personaName.trim()) {
      setErrorMessage('Please provide a Campaign / Persona Name to save.');
      return;
    }
    try {
      const newProf = await api.createProfile({
        name: personaName.trim(),
        industry: selectedIndustries.join(', ') || 'Software & Internet',
        location: location.trim() || 'United States',
        company_size: selectedCompanySizes.join(', ') || '25 - 100, 100 - 250',
        criteria: `${selectedJobTitles.join(', ')} | ${serviceOffered}`
      });
      setProfiles((prev) => [newProf, ...prev]);
      setSelectedProfileId(newProf.id);
      setSaveSuccessMessage(`Successfully saved "${newProf.name}" to Target Profiles (FR-01)!`);
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save Target Profile.');
    }
  };

  const handleExecuteSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (selectedIndustries.length === 0) {
      setErrorMessage('Please include at least one Target Industry.');
      return;
    }
    if (!location.trim()) {
      setErrorMessage('Please specify a Target Location.');
      return;
    }

    setErrorMessage(null);
    setIsSearching(true);
    setActiveStep(1);

    const stepTimer1 = setTimeout(() => setActiveStep(2), 1400);
    const stepTimer2 = setTimeout(() => setActiveStep(3), 3200);

    try {
      const industryStr = selectedIndustries.join(', ');
      const sizeStr = selectedCompanySizes.length > 0 ? ` of company size ${selectedCompanySizes.join(' or ')} employees` : '';
      const locationStr = location.trim();
      const noWebClause = requireNoWebsite ? ' without an official website' : '';
      const rolesClause = selectedJobTitles.length > 0 ? ` (target decision-maker job titles: ${selectedJobTitles.join(', ')})` : '';
      const pitchClause = serviceOffered.trim() ? ` and pitch ${serviceOffered.trim()}` : '';

      const promptText = `Find ${quantity} companies in ${industryStr}${sizeStr} in ${locationStr}${noWebClause}${pitchClause}${rolesClause}`;

      const res = await api.sendChat([{ role: 'user', content: promptText }]);
      
      setActiveStep(4);
      setSearchSummary(res.content);

      if (res.pipeline_leads && res.pipeline_leads.length > 0) {
        setSearchResults(res.pipeline_leads);
      } else {
        const freshLeads = await api.getLeads({ search: selectedIndustries[0] || locationStr });
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
            Configure your target customer criteria below. LeadFlow discovers companies via Google Search, crawls official domains with Firecrawl, scores fit with Gemini, and verifies decision-maker emails with Hunter.io.
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
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-[#f95721]" />
          <span>Quick Form Templates:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {formPresets.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              className="px-3 py-1.5 rounded-xl bg-[#111116] hover:bg-[#1a1a22] border border-[#22222e] hover:border-[#f95721]/50 text-slate-300 hover:text-white text-[11px] transition-colors flex items-center gap-2 shadow-sm"
            >
              <span className="font-semibold">{preset.title}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1c1c28] text-[#f95721] font-mono">
                {preset.tag}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Saved Success Notification */}
      {saveSuccessMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {/* Structured Search Form */}
      <form onSubmit={handleExecuteSearch} className="bg-[#121217] border border-[#22222c] rounded-2xl p-5 shadow-xl space-y-6">
        
        {/* Section 1: Campaign Name & Target Profile Pre-fill */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 border-b border-[#1c1c26]">
          <div className="md:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-[#f95721]" />
                <span>Search Campaign / Persona Name</span>
              </span>
              <button
                type="button"
                onClick={handleSaveAsProfile}
                className="text-[10px] text-[#f95721] hover:underline flex items-center gap-1 normal-case font-medium"
              >
                <BookmarkPlus className="w-3 h-3" />
                <span>Save to Target Profiles (FR-01)</span>
              </button>
            </label>
            <input
              type="text"
              value={personaName}
              onChange={(e) => setPersonaName(e.target.value)}
              placeholder="e.g. IT Administrators and Business Decision Makers at SMBs"
              className="w-full mt-1.5 px-3 py-2 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white font-medium focus:outline-none focus:border-[#f95721]"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>Target Profile (ICP Pre-fill)</span>
            </label>
            <select
              value={selectedProfileId}
              onChange={(e) => handleProfileChange(e.target.value)}
              className="w-full mt-1.5 px-3 py-2 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white focus:outline-none focus:border-[#f95721]"
            >
              <option value="custom">Custom Form Parameters</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Section 2: Job Title (Include) */}
        <div className="space-y-2 pb-4 border-b border-[#1c1c26]">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-[#f95721]" />
              <span>Job Title</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-semibold">
                Include ({selectedJobTitles.length})
              </span>
            </label>
            <div className="flex items-center gap-2 text-[10px]">
              <button
                type="button"
                onClick={() => setSelectedJobTitles([...AVAILABLE_JOB_TITLES])}
                className="text-slate-400 hover:text-slate-200"
              >
                Select All
              </button>
              <span className="text-slate-600">|</span>
              <button
                type="button"
                onClick={() => setSelectedJobTitles([])}
                className="text-slate-400 hover:text-slate-200"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Job Title Selectable Tags */}
          <div className="flex flex-wrap items-center gap-2">
            {AVAILABLE_JOB_TITLES.map((title) => {
              const isSelected = selectedJobTitles.includes(title);
              return (
                <button
                  key={title}
                  type="button"
                  onClick={() => handleToggleJobTitle(title)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-[#f95721]/15 border-[#f95721]/50 text-white shadow-sm'
                      : 'bg-[#0c0c10] border-[#22222e] text-slate-400 hover:text-slate-200 hover:border-[#333346]'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-[#f95721]" />}
                  <span>{title}</span>
                </button>
              );
            })}

            {/* Custom job titles not in default list */}
            {selectedJobTitles
              .filter((t) => !AVAILABLE_JOB_TITLES.includes(t))
              .map((customTitle) => (
                <span
                  key={customTitle}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[#f95721]/20 border border-[#f95721] text-white flex items-center gap-1.5"
                >
                  <Check className="w-3 h-3 text-[#f95721]" />
                  <span>{customTitle}</span>
                  <button
                    type="button"
                    onClick={() => handleToggleJobTitle(customTitle)}
                    className="hover:text-red-400 ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
          </div>

          {/* Add custom Job Title input */}
          <div className="flex items-center gap-2 max-w-sm pt-1">
            <input
              type="text"
              value={customJobTitleInput}
              onChange={(e) => setCustomJobTitleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomJobTitle();
                }
              }}
              placeholder="Add another job title..."
              className="flex-1 px-3 py-1.5 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white focus:outline-none focus:border-[#f95721]"
            />
            <button
              type="button"
              onClick={handleAddCustomJobTitle}
              className="px-3 py-1.5 rounded-xl bg-[#181822] hover:bg-[#222230] border border-[#2a2a3a] text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Section 3: Location (Include) */}
        <div className="space-y-2 pb-4 border-b border-[#1c1c26]">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-[#f95721]" />
              <span>Location</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-semibold">
                Include: {location || 'Not Specified'}
              </span>
            </label>
            <span className="text-[10px] text-slate-500">Label: United States (Default)</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {['United States', 'California, USA', 'Addis Ababa, Ethiopia', 'United Kingdom', 'Canada', 'Remote / Global'].map((locOption) => {
              const isSelected = location.toLowerCase().includes(locOption.toLowerCase());
              return (
                <button
                  key={locOption}
                  type="button"
                  onClick={() => setLocation(locOption)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-[#f95721]/15 border-[#f95721]/50 text-white shadow-sm'
                      : 'bg-[#0c0c10] border-[#22222e] text-slate-400 hover:text-slate-200 hover:border-[#333346]'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-[#f95721]" />}
                  <span>{locOption}</span>
                </button>
              );
            })}
          </div>

          <div className="max-w-md pt-1">
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. United States or Addis Ababa, Ethiopia"
              className="w-full px-3 py-2 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white focus:outline-none focus:border-[#f95721]"
            />
          </div>
        </div>

        {/* Section 4: Industry (Include) */}
        <div className="space-y-2 pb-4 border-b border-[#1c1c26]">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-[#f95721]" />
              <span>Industry</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-semibold">
                Include ({selectedIndustries.length})
              </span>
            </label>
            <div className="flex items-center gap-2 text-[10px]">
              <button
                type="button"
                onClick={() => setSelectedIndustries([...AVAILABLE_INDUSTRIES])}
                className="text-slate-400 hover:text-slate-200"
              >
                Select All
              </button>
              <span className="text-slate-600">|</span>
              <button
                type="button"
                onClick={() => setSelectedIndustries([])}
                className="text-slate-400 hover:text-slate-200"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Industry Selectable Tags */}
          <div className="flex flex-wrap items-center gap-2">
            {AVAILABLE_INDUSTRIES.map((ind) => {
              const isSelected = selectedIndustries.includes(ind);
              return (
                <button
                  key={ind}
                  type="button"
                  onClick={() => handleToggleIndustry(ind)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-[#f95721]/15 border-[#f95721]/50 text-white shadow-sm'
                      : 'bg-[#0c0c10] border-[#22222e] text-slate-400 hover:text-slate-200 hover:border-[#333346]'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-[#f95721]" />}
                  <span>{ind}</span>
                </button>
              );
            })}

            {/* Custom industry tags */}
            {selectedIndustries
              .filter((i) => !AVAILABLE_INDUSTRIES.includes(i))
              .map((customInd) => (
                <span
                  key={customInd}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[#f95721]/20 border border-[#f95721] text-white flex items-center gap-1.5"
                >
                  <Check className="w-3 h-3 text-[#f95721]" />
                  <span>{customInd}</span>
                  <button
                    type="button"
                    onClick={() => handleToggleIndustry(customInd)}
                    className="hover:text-red-400 ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
          </div>

          {/* Add custom Industry input */}
          <div className="flex items-center gap-2 max-w-sm pt-1">
            <input
              type="text"
              value={customIndustryInput}
              onChange={(e) => setCustomIndustryInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomIndustry();
                }
              }}
              placeholder="Add another industry..."
              className="flex-1 px-3 py-1.5 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white focus:outline-none focus:border-[#f95721]"
            />
            <button
              type="button"
              onClick={handleAddCustomIndustry}
              className="px-3 py-1.5 rounded-xl bg-[#181822] hover:bg-[#222230] border border-[#2a2a3a] text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Section 5: Company Size */}
        <div className="space-y-2 pb-4 border-b border-[#1c1c26]">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-[#f95721]" />
              <span>Company Size (Employees)</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-semibold">
                {selectedCompanySizes.join(', ') || 'Any'}
              </span>
            </label>
            <span className="text-[10px] text-slate-500">Includes 25 - 100 & 100 - 250 (SMBs)</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {AVAILABLE_SIZES.map((size) => {
              const isSelected = selectedCompanySizes.includes(size);
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => handleToggleSize(size)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-[#f95721]/15 border-[#f95721]/50 text-white shadow-sm'
                      : 'bg-[#0c0c10] border-[#22222e] text-slate-400 hover:text-slate-200 hover:border-[#333346]'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-[#f95721]" />}
                  <span>{size} employees</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 6: Value Proposition & Discovery Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 border-b border-[#1c1c26]">
          <div className="md:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-[#f95721]" />
              <span>Value Proposition / Pitch Angle</span>
            </label>
            <input
              type="text"
              value={serviceOffered}
              onChange={(e) => setServiceOffered(e.target.value)}
              placeholder="e.g. Enterprise IT Infrastructure, Cloud Management & Cybersecurity Automation"
              className="w-full mt-1.5 px-3 py-2 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white focus:outline-none focus:border-[#f95721]"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Gemini evaluates lead suitability and drafts personalized cold email outreach based on this pitch.
            </span>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-[#f95721]" />
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

        {/* Section 7: Strict Constraints */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                Filters candidate businesses that lack official domains (verified with Firecrawl).
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
                Prioritizes verified emails for IT Directors, Managers, CIOs, and VPs.
              </span>
            </div>
          </label>
        </div>

        {/* Action Controls */}
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
            disabled={isSearching || selectedIndustries.length === 0 || !location.trim()}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#f95721] to-[#ea4710] hover:brightness-110 text-white font-bold text-xs shadow-md shadow-[#f95721]/25 transition-all disabled:opacity-50"
          >
            {isSearching ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Discovering Leads...</span>
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

      {/* Live Pipeline Steps Progress */}
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
          <h3 className="text-sm font-bold text-white">Target Criteria Ready</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Click <strong>Execute Lead Search</strong> to discover matching companies in <strong>{location}</strong> across <strong>{selectedIndustries.join(', ')}</strong> with decision-makers matching your selected IT roles.
          </p>
        </div>
      )}

    </div>
  );
};
