import React, { useState, useEffect, useRef } from 'react';
import {
  SlidersHorizontal,
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
  BookmarkPlus,
  Target,
  Download,
  Crown,
  Copy,
  ExternalLink,
  Sliders,
  Calendar,
  Globe,
  Radio,
  Send,
  Cpu
} from 'lucide-react';
import type { TargetProfile } from '../types';
import { api } from '../services/api';

interface SearchLeadsViewProps {
  onSelectLead: (leadId: number) => void;
  onNavigateToManage: () => void;
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
  technologies?: Array<{ name: string; category: string }>;
  signals?: Array<{ type: string; title: string; date?: string }>;
  fit_score?: number | null;
  status: string;
  website_status?: string;
  fit_reason?: string | null;
  strengths?: string[];
  risks?: string[];
  contacts?: ContactItem[];
}


// Available options for select dropdowns
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
  'Financial Services',
  'Healthcare',
  'Manufacturing',
  'Retail & E-commerce',
  'Education',
  'Telecommunications'
];

const AVAILABLE_LOCATIONS = [
  'United States',
  'California, USA',
  'New York, USA',
  'Texas, USA',
  'United Kingdom',
  'Canada',
  'European Union',
  'Remote / Global'
];

const AVAILABLE_SIZES = [
  '1 - 25',
  '25 - 100',
  '100 - 250',
  '250 - 1,000',
  '1,001 - 5,000',
  '5,001+'
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

  // Dropdown open/close state for Choices.js style select inputs
  const [openDropdown, setOpenDropdown] = useState<'jobTitles' | 'industries' | 'location' | 'sizes' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Search execution & selection states
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [searchResults, setSearchResults] = useState<DiscoveredResultItem[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<number[]>([]);
  
  // In-page inspection state (matches the split view in the reference screenshot)
  const [inspectedLead, setInspectedLead] = useState<DiscoveredResultItem | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'emails' | 'technologies' | 'signals'>('emails');
  const [contactSegment, setContactSegment] = useState<'people' | 'decision_makers' | 'generic'>('people');
  const [isExecutiveOpen, setIsExecutiveOpen] = useState<boolean>(true);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [isKeywordsOpen, setIsKeywordsOpen] = useState<boolean>(false);
  const [isSavedCompany, setIsSavedCompany] = useState<boolean>(false);

  const [searchSummary, setSearchSummary] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

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


  useEffect(() => {
    loadProfiles();
    loadExistingLeads();
  }, []);

  const loadProfiles = async () => {
    try {
      const data = await api.getProfiles();
      setProfiles(data);
    } catch {
      // ignore
    }
  };

  const loadExistingLeads = async () => {
    try {
      const data = await api.getLeads();
      if (data && data.length > 0) {
        setSearchResults(data);
        setInspectedLead(data[0]);
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
              job_title: c.job_title || 'Executive Decision Maker',
              email: c.email || undefined,
              email_status: c.email_status || 'verified',
              confidence_score: c.confidence_score || undefined,
              seniority: isExecutive ? 'Executive' : 'Management',
              is_c_level: isCLevel
            };
          });

          setInspectedLead((prev) =>
            prev?.id === lead.id
              ? {
                  ...prev,
                  company_name: full.company_name,
                  website: full.website,
                  industry: full.industry || prev.industry,
                  location: full.location || prev.location,
                  company_size: full.company_size || prev.company_size,
                  fit_score: full.fit_score || prev.fit_score,
                  fit_reason: full.fit_reason || prev.fit_reason,
                  strengths: full.fit_strengths || prev.strengths,
                  risks: full.fit_risks || prev.risks,
                  contacts: mappedContacts
                }
              : prev
          );
        }
      } catch {
        // ignore
      }
    }
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
    setOpenDropdown(null);
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
    setOpenDropdown(null);

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
        setInspectedLead(res.pipeline_leads[0]);
      } else {
        const freshLeads = await api.getLeads({ search: selectedIndustries[0] || locationStr });
        if (freshLeads.length > 0) {
          setSearchResults(freshLeads.slice(0, quantity));
          setInspectedLead(freshLeads[0]);
        } else {
          setSearchResults([]);
          setInspectedLead(null);
        }
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
    if (lead.signals && lead.signals.some((s) => s.type.toLowerCase().includes('hiring'))) {
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

  const handleExportCSV = () => {
    const itemsToExport =
      selectedLeadIds.length > 0
        ? searchResults.filter((l) => selectedLeadIds.includes(l.id))
        : searchResults;

    const headers = ['Company Name', 'Domain', 'Size', 'Industry', 'Location', 'Email Addresses'];
    const rows = itemsToExport.map((l) => [
      `"${l.company_name}"`,
      `"${cleanDomain(l.website)}"`,
      `"${l.company_size || ''}"`,
      `"${l.industry || ''}"`,
      `"${l.location || ''}"`,
      `"${formatEmailCount(l)}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `discovered_companies_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-5 space-y-4 animate-fade-in font-sans" ref={dropdownRef}>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#1c1c24]">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-[#f95721]" />
            <span>Search Leads Form</span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#181824] text-[#f95721] border border-[#2a2a3c]">
              FR-01 / FR-02
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Click any field to select from choices. Select a company from the list to view its Hunter.io profile & email addresses.
          </p>
        </div>

        {/* Go to Manage Leads button */}
        <button
          onClick={onNavigateToManage}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#14141c] hover:bg-[#1c1c28] border border-[#262636] text-slate-300 hover:text-white text-xs font-semibold transition-all group shrink-0"
        >
          <span>View Saved Leads</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-[#f95721]" />
        </button>
      </div>


      {/* Saved Success Notification */}
      {saveSuccessMessage && (
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {/* Compact Structured Search Form with Choices.js Style Select Dropdowns */}
      <form onSubmit={handleExecuteSearch} className="bg-[#121217] border border-[#22222c] rounded-2xl p-4 shadow-xl space-y-3.5">
        
        {/* Row 1: Campaign Persona Name & Profile Pre-fill */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Briefcase className="w-3 h-3 text-[#f95721]" />
                <span>Search Campaign / Persona Name</span>
              </label>
              <button
                type="button"
                onClick={handleSaveAsProfile}
                className="text-[10px] text-[#f95721] hover:underline flex items-center gap-1 normal-case font-medium"
              >
                <BookmarkPlus className="w-3 h-3" />
                <span>Save Target Profile</span>
              </button>
            </div>
            <input
              type="text"
              value={personaName}
              onChange={(e) => setPersonaName(e.target.value)}
              placeholder="e.g. IT Administrators and Business Decision Makers at SMBs"
              className="w-full px-3 py-1.5 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white font-medium focus:outline-none focus:border-[#f95721]"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1">
              <Layers className="w-3 h-3 text-slate-400" />
              <span>Target Profile (ICP Pre-fill)</span>
            </label>
            <select
              value={selectedProfileId}
              onChange={(e) => handleProfileChange(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white focus:outline-none focus:border-[#f95721]"
            >
              <option value="custom">Custom Parameters</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Choices.js Select Style Dropdowns Grid (Job Title, Industry, Location, Company Size) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Select 1: Job Title (Click input to show list) */}
          <div className="relative choices-select-container">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between mb-1">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3 text-[#f95721]" />
                <span>Job Title</span>
              </span>
              <span className="text-[9px] text-emerald-400 font-mono">
                {selectedJobTitles.length} Included
              </span>
            </label>
            
            {/* Input Trigger Box */}
            <div
              onClick={() => setOpenDropdown(openDropdown === 'jobTitles' ? null : 'jobTitles')}
              className={`min-h-[38px] px-2.5 py-1.5 rounded-xl bg-[#0c0c10] border text-xs cursor-pointer flex items-center justify-between gap-1.5 transition-all ${
                openDropdown === 'jobTitles'
                  ? 'border-[#f95721] ring-1 ring-[#f95721]/30 shadow-md'
                  : 'border-[#22222e] hover:border-[#333346]'
              }`}
            >
              <div className="flex flex-wrap items-center gap-1 overflow-hidden max-h-[46px]">
                {selectedJobTitles.length > 0 ? (
                  <>
                    {selectedJobTitles.slice(0, 2).map((title) => (
                      <span
                        key={title}
                        className="px-1.5 py-0.5 rounded bg-[#181824] border border-[#2a2a3c] text-[10px] text-slate-200 font-medium flex items-center gap-1 shrink-0"
                      >
                        <span className="truncate max-w-[85px]">{title}</span>
                        <X
                          className="w-2.5 h-2.5 text-slate-400 hover:text-red-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleJobTitle(title);
                          }}
                        />
                      </span>
                    ))}
                    {selectedJobTitles.length > 2 && (
                      <span className="text-[10px] text-[#f95721] font-mono px-1">
                        +{selectedJobTitles.length - 2}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-slate-500 text-xs">Select Job Titles...</span>
                )}
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${openDropdown === 'jobTitles' ? 'rotate-180 text-[#f95721]' : ''}`} />
            </div>

            {/* Dropdown Options Popup */}
            {openDropdown === 'jobTitles' && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#121217] border border-[#262638] rounded-xl shadow-2xl p-2.5 space-y-2 max-h-64 overflow-y-auto animate-fade-in"
              >
                <div className="flex items-center justify-between text-[10px] pb-1 border-b border-[#1c1c28]">
                  <span className="text-slate-400 font-semibold uppercase">Include Job Titles</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedJobTitles([...AVAILABLE_JOB_TITLES])}
                      className="text-[#f95721] hover:underline"
                    >
                      All
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedJobTitles([])}
                      className="text-slate-400 hover:text-white"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  {AVAILABLE_JOB_TITLES.map((title) => {
                    const isSelected = selectedJobTitles.includes(title);
                    return (
                      <div
                        key={title}
                        onClick={() => handleToggleJobTitle(title)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? 'bg-[#f95721]/15 text-white font-medium' : 'text-slate-300 hover:bg-[#181824]'
                        }`}
                      >
                        <span className="truncate">{title}</span>
                        {isSelected ? (
                          <Check className="w-3.5 h-3.5 text-[#f95721]" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded border border-[#333346]" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Add Custom Title */}
                <div className="pt-2 border-t border-[#1c1c28] flex items-center gap-1.5">
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
                    placeholder="Add custom title..."
                    className="flex-1 px-2.5 py-1 rounded-lg bg-[#0c0c10] border border-[#22222e] text-[11px] text-white focus:outline-none focus:border-[#f95721]"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomJobTitle}
                    className="p-1 rounded-lg bg-[#181824] hover:bg-[#202030] text-slate-300 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Select 2: Industry (Click input to show list) */}
          <div className="relative choices-select-container">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between mb-1">
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3 text-[#f95721]" />
                <span>Industry</span>
              </span>
              <span className="text-[9px] text-emerald-400 font-mono">
                {selectedIndustries.length} Included
              </span>
            </label>
            
            {/* Input Trigger Box */}
            <div
              onClick={() => setOpenDropdown(openDropdown === 'industries' ? null : 'industries')}
              className={`min-h-[38px] px-2.5 py-1.5 rounded-xl bg-[#0c0c10] border text-xs cursor-pointer flex items-center justify-between gap-1.5 transition-all ${
                openDropdown === 'industries'
                  ? 'border-[#f95721] ring-1 ring-[#f95721]/30 shadow-md'
                  : 'border-[#22222e] hover:border-[#333346]'
              }`}
            >
              <div className="flex flex-wrap items-center gap-1 overflow-hidden max-h-[46px]">
                {selectedIndustries.length > 0 ? (
                  <>
                    {selectedIndustries.slice(0, 1).map((ind) => (
                      <span
                        key={ind}
                        className="px-1.5 py-0.5 rounded bg-[#181824] border border-[#2a2a3c] text-[10px] text-slate-200 font-medium flex items-center gap-1 shrink-0"
                      >
                        <span className="truncate max-w-[95px]">{ind}</span>
                        <X
                          className="w-2.5 h-2.5 text-slate-400 hover:text-red-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleIndustry(ind);
                          }}
                        />
                      </span>
                    ))}
                    {selectedIndustries.length > 1 && (
                      <span className="text-[10px] text-[#f95721] font-mono px-1">
                        +{selectedIndustries.length - 1}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-slate-500 text-xs">Select Industry...</span>
                )}
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${openDropdown === 'industries' ? 'rotate-180 text-[#f95721]' : ''}`} />
            </div>

            {/* Dropdown Options Popup */}
            {openDropdown === 'industries' && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#121217] border border-[#262638] rounded-xl shadow-2xl p-2.5 space-y-2 max-h-64 overflow-y-auto animate-fade-in"
              >
                <div className="flex items-center justify-between text-[10px] pb-1 border-b border-[#1c1c28]">
                  <span className="text-slate-400 font-semibold uppercase">Include Industries</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedIndustries([...AVAILABLE_INDUSTRIES])}
                      className="text-[#f95721] hover:underline"
                    >
                      All
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedIndustries([])}
                      className="text-slate-400 hover:text-white"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  {AVAILABLE_INDUSTRIES.map((ind) => {
                    const isSelected = selectedIndustries.includes(ind);
                    return (
                      <div
                        key={ind}
                        onClick={() => handleToggleIndustry(ind)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? 'bg-[#f95721]/15 text-white font-medium' : 'text-slate-300 hover:bg-[#181824]'
                        }`}
                      >
                        <span className="truncate">{ind}</span>
                        {isSelected ? (
                          <Check className="w-3.5 h-3.5 text-[#f95721]" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded border border-[#333346]" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Add Custom Industry */}
                <div className="pt-2 border-t border-[#1c1c28] flex items-center gap-1.5">
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
                    placeholder="Add custom industry..."
                    className="flex-1 px-2.5 py-1 rounded-lg bg-[#0c0c10] border border-[#22222e] text-[11px] text-white focus:outline-none focus:border-[#f95721]"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomIndustry}
                    className="p-1 rounded-lg bg-[#181824] hover:bg-[#202030] text-slate-300 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Select 3: Location (Click input to show list) */}
          <div className="relative choices-select-container">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between mb-1">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#f95721]" />
                <span>Location</span>
              </span>
              <span className="text-[9px] text-slate-400 font-mono">Include</span>
            </label>
            
            {/* Input Trigger Box */}
            <div
              onClick={() => setOpenDropdown(openDropdown === 'location' ? null : 'location')}
              className={`min-h-[38px] px-2.5 py-1.5 rounded-xl bg-[#0c0c10] border text-xs cursor-pointer flex items-center justify-between gap-1.5 transition-all ${
                openDropdown === 'location'
                  ? 'border-[#f95721] ring-1 ring-[#f95721]/30 shadow-md'
                  : 'border-[#22222e] hover:border-[#333346]'
              }`}
            >
              <span className="text-white font-medium truncate">
                {location || 'Select Location...'}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${openDropdown === 'location' ? 'rotate-180 text-[#f95721]' : ''}`} />
            </div>

            {/* Dropdown Options Popup */}
            {openDropdown === 'location' && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#121217] border border-[#262638] rounded-xl shadow-2xl p-2.5 space-y-2 max-h-60 overflow-y-auto animate-fade-in"
              >
                <div className="text-[10px] text-slate-400 font-semibold uppercase pb-1 border-b border-[#1c1c28]">
                  Select Location Target
                </div>

                <div className="space-y-1">
                  {AVAILABLE_LOCATIONS.map((loc) => {
                    const isSelected = location.toLowerCase().includes(loc.toLowerCase());
                    return (
                      <div
                        key={loc}
                        onClick={() => {
                          setLocation(loc);
                          setOpenDropdown(null);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? 'bg-[#f95721]/15 text-white font-medium' : 'text-slate-300 hover:bg-[#181824]'
                        }`}
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

          {/* Select 4: Company Size (Click input to show list) */}
          <div className="relative choices-select-container">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between mb-1">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3 text-[#f95721]" />
                <span>Company Size</span>
              </span>
              <span className="text-[9px] text-emerald-400 font-mono">
                {selectedCompanySizes.length} Brackets
              </span>
            </label>
            
            {/* Input Trigger Box */}
            <div
              onClick={() => setOpenDropdown(openDropdown === 'sizes' ? null : 'sizes')}
              className={`min-h-[38px] px-2.5 py-1.5 rounded-xl bg-[#0c0c10] border text-xs cursor-pointer flex items-center justify-between gap-1.5 transition-all ${
                openDropdown === 'sizes'
                  ? 'border-[#f95721] ring-1 ring-[#f95721]/30 shadow-md'
                  : 'border-[#22222e] hover:border-[#333346]'
              }`}
            >
              <div className="flex flex-wrap items-center gap-1 overflow-hidden max-h-[46px]">
                {selectedCompanySizes.length > 0 ? (
                  <>
                    {selectedCompanySizes.slice(0, 1).map((sz) => (
                      <span
                        key={sz}
                        className="px-1.5 py-0.5 rounded bg-[#181824] border border-[#2a2a3c] text-[10px] text-slate-200 font-medium flex items-center gap-1 shrink-0"
                      >
                        <span>{sz}</span>
                        <X
                          className="w-2.5 h-2.5 text-slate-400 hover:text-red-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSize(sz);
                          }}
                        />
                      </span>
                    ))}
                    {selectedCompanySizes.length > 1 && (
                      <span className="text-[10px] text-[#f95721] font-mono px-1">
                        +{selectedCompanySizes.length - 1}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-slate-500 text-xs">Select Size...</span>
                )}
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${openDropdown === 'sizes' ? 'rotate-180 text-[#f95721]' : ''}`} />
            </div>

            {/* Dropdown Options Popup */}
            {openDropdown === 'sizes' && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#121217] border border-[#262638] rounded-xl shadow-2xl p-2.5 space-y-1.5 max-h-60 overflow-y-auto animate-fade-in"
              >
                <div className="text-[10px] text-slate-400 font-semibold uppercase pb-1 border-b border-[#1c1c28]">
                  Select Employee Brackets
                </div>

                <div className="space-y-1">
                  {AVAILABLE_SIZES.map((sz) => {
                    const isSelected = selectedCompanySizes.includes(sz);
                    return (
                      <div
                        key={sz}
                        onClick={() => handleToggleSize(sz)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? 'bg-[#f95721]/15 text-white font-medium' : 'text-slate-300 hover:bg-[#181824]'
                        }`}
                      >
                        <span>{sz} employees</span>
                        {isSelected ? (
                          <Check className="w-3.5 h-3.5 text-[#f95721]" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded border border-[#333346]" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Row 3: Pitch Angle, Quantity, Constraints & Action Buttons */}
        <div className="pt-2 border-t border-[#1c1c26] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
          
          {/* Pitch & Quantity Inputs */}
          <div className="flex flex-1 flex-col sm:flex-row items-center gap-2">
            <div className="w-full sm:flex-1">
              <input
                type="text"
                value={serviceOffered}
                onChange={(e) => setServiceOffered(e.target.value)}
                placeholder="Pitch: e.g. Enterprise Cloud Infrastructure & Cybersecurity"
                className="w-full px-3 py-1.5 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white focus:outline-none focus:border-[#f95721]"
              />
            </div>

            <div className="w-full sm:w-auto">
              <select
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full sm:w-auto px-3 py-1.5 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white focus:outline-none focus:border-[#f95721]"
              >
                <option value={5}>5 Leads</option>
                <option value={8}>8 Leads (Screenshot Batch)</option>
                <option value={10}>10 Leads</option>
                <option value={15}>15 Leads</option>
              </select>
            </div>
          </div>

          {/* Constraints Checkboxes */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 text-[11px]">
              <input
                type="checkbox"
                checked={requireNoWebsite}
                onChange={(e) => setRequireNoWebsite(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-[#f95721] focus:ring-0 bg-[#14141c] border-[#333344] cursor-pointer"
              />
              <span>No Official Website</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 text-[11px]">
              <input
                type="checkbox"
                checked={requireVerifiedEmail}
                onChange={(e) => setRequireVerifiedEmail(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-[#f95721] focus:ring-0 bg-[#14141c] border-[#333344] cursor-pointer"
              />
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Hunter.io Verified</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
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
              disabled={isSearching || selectedIndustries.length === 0 || !location.trim()}
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
                  className={`p-2 rounded-xl border transition-all ${
                    isPast
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
          
          {searchSummary && (
            <div className="p-3 rounded-2xl bg-[#121217] border border-[#22222e] text-xs text-slate-300 whitespace-pre-line leading-relaxed">
              {searchSummary}
            </div>
          )}

          <div className="flex flex-col lg:flex-row items-start gap-4">
            
            {/* Left Column: Company List (Matches Screenshot) */}
            <div className={`transition-all duration-300 w-full ${inspectedLead ? 'lg:w-[46%] xl:w-[43%]' : 'w-full'} space-y-2`}>
              
              {/* List Header Strip: "3,462 companies match your filters" */}
              <div className="flex items-center justify-between bg-[#121217] border border-[#22222e] rounded-2xl px-4 py-2.5 shadow-sm">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedLeadIds.length === searchResults.length && searchResults.length > 0}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded text-[#f95721] focus:ring-0 bg-[#14141c] border-[#333346] cursor-pointer"
                    title="Select all companies"
                  />
                  <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <span className="text-white font-bold">
                      {searchResults.length.toLocaleString()}
                    </span>
                    <span>companies match your filters</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="p-1.5 rounded-lg bg-[#181822] hover:bg-[#222230] border border-[#2a2a3a] text-slate-400 hover:text-white text-xs transition-colors"
                    title="Export CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={onNavigateToManage}
                    className="text-[11px] font-semibold text-[#f95721] hover:underline flex items-center gap-1"
                  >
                    <span>Pipeline</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Company Rows Container */}
              <div className="bg-[#121217] border border-[#22222e] rounded-2xl overflow-hidden divide-y divide-[#1c1c28] shadow-xl">
                {searchResults.map((lead) => {
                  const isSelected = selectedLeadIds.includes(lead.id);
                  const isInspected = inspectedLead?.id === lead.id;
                  const domain = cleanDomain(lead.website);

                  return (
                    <div
                      key={lead.id}
                      onClick={() => handleInspectLead(lead)}
                      className={`group flex items-center justify-between px-3.5 py-3 transition-all cursor-pointer ${
                        isInspected
                          ? 'bg-[#181826] border-l-4 border-l-[#f95721] shadow-inner'
                          : isSelected
                          ? 'bg-[#161622]'
                          : 'hover:bg-[#161620]'
                      }`}
                    >
                      {/* Left: Checkbox + Logo + Titles */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => handleToggleSelectLead(lead.id)}
                          className="w-4 h-4 rounded text-[#f95721] focus:ring-0 bg-[#14141c] border-[#333346] cursor-pointer shrink-0"
                        />

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

                      {/* Right: Hiring Pill + Email count badge */}
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {isHiring(lead) && (
                          <span className="hidden xl:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#181824] border border-[#2c2c3e] text-[10px] font-medium text-slate-300">
                            <Target className="w-3 h-3 text-slate-400" />
                            <span>Hiring</span>
                          </span>
                        )}

                        <div className="px-2.5 py-1 rounded-md bg-[#1a1a24] border border-[#2a2a3c] text-[11px] font-semibold text-slate-200 whitespace-nowrap shadow-sm">
                          {formatEmailCount(lead)} emails
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>

            {/* Right Column: In-page Company Inspector Panel (Matches Exact Screenshot Layout) */}
            {inspectedLead && (
              <div className="w-full lg:w-[54%] xl:w-[57%] bg-[#121217] border border-[#22222e] rounded-2xl p-5 shadow-2xl animate-fade-in space-y-4 sticky top-4">
                
                {/* Panel Top Row: Logo, Name, Email Count, Close Button */}
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
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <span>{inspectedLead.company_name}</span>
                      </h2>
                      <div className="mt-1.5 inline-block px-2.5 py-0.5 rounded-md bg-[#1c1c28] border border-[#2c2c3e] text-xs font-semibold text-slate-200 shadow-sm">
                        {formatEmailCount(inspectedLead)} email addresses
                      </div>
                    </div>
                  </div>

                  {/* Close Inspector Button */}
                  <button
                    type="button"
                    onClick={() => setInspectedLead(null)}
                    className="p-1.5 rounded-lg hover:bg-[#1f1f2e] text-slate-400 hover:text-white transition-colors"
                    title="Close Inspector"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Company Description */}
                <p className="text-xs text-slate-300 leading-relaxed">
                  {inspectedLead.description ||
                    `${inspectedLead.company_name} is a leading enterprise organization in ${inspectedLead.location || 'its region'}, operating across ${inspectedLead.industry || 'its sector'}.`}
                </p>

                {/* Action Button: Save company ⌄ */}
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSavedCompany(true);
                      setTimeout(() => setIsSavedCompany(false), 3000);
                    }}
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      isSavedCompany
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                        : 'bg-[#181824] hover:bg-[#202030] border-[#2c2c3e] text-white shadow-sm'
                    }`}
                  >
                    {isSavedCompany ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Saved to Pipeline</span>
                      </>
                    ) : (
                      <>
                        <span>Save company</span>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectLead(inspectedLead.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-transparent hover:bg-[#181824] border border-[#262638] text-slate-300 hover:text-white text-xs font-medium transition-colors"
                  >
                    <span>Full CRM Dossier</span>
                    <ExternalLink className="w-3 h-3 text-[#f95721]" />
                  </button>
                </div>

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

                    {/* Social Icons (LinkedIn & Facebook SVGs) */}
                    <div className="flex items-center gap-2 pt-1">
                      <a
                        href={`https://www.linkedin.com/company/${cleanDomain(inspectedLead.website).split('.')[0]}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-6 h-6 rounded bg-[#0a66c2] text-white flex items-center justify-center font-bold text-[10px] hover:opacity-90 transition-opacity"
                        title="LinkedIn Profile"
                      >
                        in
                      </a>
                      <a
                        href={`https://www.facebook.com/${cleanDomain(inspectedLead.website).split('.')[0]}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-6 h-6 rounded-full bg-[#1877f2] text-white flex items-center justify-center font-bold text-xs hover:opacity-90 transition-opacity"
                        title="Facebook Page"
                      >
                        f
                      </a>
                    </div>
                  </div>

                </div>

                {/* Tab Navigation: Email addresses | Technologies | Signals */}
                <div className="pt-2 border-t border-[#1c1c28]">
                  <div className="flex items-center gap-6 border-b border-[#1c1c28] text-xs">
                    <button
                      type="button"
                      onClick={() => setInspectorTab('emails')}
                      className={`pb-2.5 font-bold transition-all relative ${
                        inspectorTab === 'emails'
                          ? 'text-white border-b-2 border-[#f95721]'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Email addresses
                    </button>
                    <button
                      type="button"
                      onClick={() => setInspectorTab('technologies')}
                      className={`pb-2.5 font-bold transition-all relative ${
                        inspectorTab === 'technologies'
                          ? 'text-white border-b-2 border-[#f95721]'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Technologies
                    </button>
                    <button
                      type="button"
                      onClick={() => setInspectorTab('signals')}
                      className={`pb-2.5 font-bold transition-all relative ${
                        inspectorTab === 'signals'
                          ? 'text-white border-b-2 border-[#f95721]'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Signals
                    </button>
                  </div>
                </div>

                {/* Tab Content 1: Email Addresses Explorer */}
                {inspectorTab === 'emails' && (
                  <div className="space-y-3.5 animate-fade-in">
                    
                    {/* Sub-Header Strip: Results count & Filters */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs text-slate-300 font-semibold">
                        <strong className="text-white">{formatEmailCount(inspectedLead)} results</strong> for {cleanDomain(inspectedLead.website)}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="px-2.5 py-1 rounded-lg bg-[#181822] hover:bg-[#20202e] border border-[#2a2a3a] text-slate-300 text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <Sliders className="w-3 h-3 text-slate-400" />
                          <span>Filters</span>
                          <ChevronDown className="w-3 h-3 text-slate-400" />
                        </button>

                        <button
                          type="button"
                          className="px-2.5 py-1 rounded-lg bg-[#181822] hover:bg-[#20202e] border border-[#2a2a3a] text-slate-300 text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <Users className="w-3 h-3 text-slate-400" />
                          <span>Find by Name</span>
                          <ChevronDown className="w-3 h-3 text-slate-400" />
                        </button>
                      </div>
                    </div>

                    {/* Segmented Filter Control: People | Decision makers | Generic */}
                    <div className="grid grid-cols-3 bg-[#0c0c10] p-1 rounded-xl border border-[#22222e] text-xs">
                      <button
                        type="button"
                        onClick={() => setContactSegment('people')}
                        className={`py-1.5 rounded-lg font-medium transition-all text-center ${
                          contactSegment === 'people'
                            ? 'bg-[#181824] text-white shadow-sm font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        People · {(inspectedLead.people_count || inspectedLead.contacts?.length || 0).toLocaleString()}
                      </button>
                      <button
                        type="button"
                        onClick={() => setContactSegment('decision_makers')}
                        className={`py-1.5 rounded-lg font-medium transition-all text-center ${
                          contactSegment === 'decision_makers'
                            ? 'bg-[#181824] text-white shadow-sm font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Decision makers · {(inspectedLead.decision_maker_count || inspectedLead.contacts?.filter((c) => c.seniority === 'Executive' || c.is_c_level || c.job_title?.toLowerCase().includes('director') || c.job_title?.toLowerCase().includes('officer') || c.job_title?.toLowerCase().includes('head') || c.job_title?.toLowerCase().includes('manager')).length || 0).toLocaleString()}
                      </button>
                      <button
                        type="button"
                        onClick={() => setContactSegment('generic')}
                        className={`py-1.5 rounded-lg font-medium transition-all text-center ${
                          contactSegment === 'generic'
                            ? 'bg-[#181824] text-white shadow-sm font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Generic · {(inspectedLead.generic_count || inspectedLead.contacts?.filter((c) => c.email && (c.email.startsWith('info@') || c.email.startsWith('contact@') || c.email.startsWith('support@'))).length || 0).toLocaleString()}
                      </button>
                    </div>

                    {/* Executive Group Header (Matches ▾ Executive 72 from reference screenshot) */}
                    <div className="border border-[#1e1e28] rounded-xl overflow-hidden divide-y divide-[#1e1e28]">
                      <button
                        type="button"
                        onClick={() => setIsExecutiveOpen(!isExecutiveOpen)}
                        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#14141c] hover:bg-[#181822] text-xs font-bold text-white transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          {isExecutiveOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                          <span>Executive</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#222230] text-slate-300">
                            {inspectedLead.contacts?.filter((c) => c.seniority === 'Executive' || c.is_c_level).length || 0}
                          </span>
                        </span>
                        <span className="text-[11px] text-[#f95721] font-medium">Hunter.io Verified</span>
                      </button>

                      {/* Contacts List */}
                      {isExecutiveOpen && (
                        <div className="divide-y divide-[#1a1a24] bg-[#0f0f14]">
                          {inspectedLead.contacts && inspectedLead.contacts.length > 0 ? (
                            inspectedLead.contacts.map((contact, idx) => (
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
                                      <span className="text-slate-500 text-xs">|</span>
                                      <span className="text-xs text-slate-300">
                                        {contact.job_title}
                                      </span>
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
                                    onClick={() => onSelectLead(inspectedLead.id)}
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
                              No verified contacts discovered yet for this company. Click "Full CRM Dossier" to run contact discovery.
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                  </div>
                )}

                {/* Tab Content 2: Technologies Detected by Firecrawl */}
                {inspectorTab === 'technologies' && (
                  <div className="space-y-3 animate-fade-in text-xs">
                    <p className="text-slate-400 text-xs">
                      Web technologies, cloud stack, and business software detected via Firecrawl domain crawl:
                    </p>
                    {inspectedLead.technologies && inspectedLead.technologies.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {inspectedLead.technologies.map((tech, idx) => (
                          <div key={idx} className="p-3 rounded-xl bg-[#0c0c10] border border-[#1e1e28] flex items-center gap-2.5">
                            <Cpu className="w-4 h-4 text-[#f95721] shrink-0" />
                            <div>
                              <div className="font-bold text-white text-xs">{tech.name}</div>
                              <div className="text-[10px] text-slate-500">{tech.category}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-[#0c0c10] border border-[#1e1e28] text-slate-500 text-center text-xs">
                        No technology stack detected for this domain.
                      </div>
                    )}
                  </div>
                )}

                {/* Tab Content 3: Company Signals */}
                {inspectorTab === 'signals' && (
                  <div className="space-y-3 animate-fade-in text-xs">
                    <p className="text-slate-400 text-xs">
                      Public business triggers, hiring initiatives, and technology upgrades:
                    </p>
                    {inspectedLead.signals && inspectedLead.signals.length > 0 ? (
                      <div className="space-y-2">
                        {inspectedLead.signals.map((signal, idx) => (
                          <div key={idx} className="p-3 rounded-xl bg-[#0c0c10] border border-[#1e1e28] flex items-start gap-2.5">
                            <Radio className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                              <div className="font-bold text-white text-xs">{signal.title}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                                <span className="text-emerald-400 font-semibold">{signal.type}</span>
                                {signal.date && <span>• {signal.date}</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-[#0c0c10] border border-[#1e1e28] text-slate-500 text-center text-xs">
                        No public hiring or business signals detected yet.
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

          </div>

        </div>
      )}

      {/* Empty State when no results */}
      {!isSearching && searchResults.length === 0 && (
        <div className="py-12 text-center max-w-lg mx-auto space-y-3 bg-[#101015] border border-[#1e1e28] rounded-2xl p-6">
          <div className="h-12 w-12 rounded-2xl bg-[#171720] mx-auto flex items-center justify-center text-[#f95721] shadow-inner">
            <SlidersHorizontal className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white">Target Criteria Ready</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Click <strong>Execute Lead Search</strong> to discover matching companies in <strong>{location}</strong> across <strong>{selectedIndustries.join(', ')}</strong> with decision-makers matching your selected roles.
          </p>
        </div>
      )}

    </div>
  );
};
