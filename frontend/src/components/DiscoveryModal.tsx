import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Play,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import type { TargetProfile, AutomationRun } from '../types';
import { api } from '../services/api';

interface DiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunFinished: () => void;
}

export const DiscoveryModal: React.FC<DiscoveryModalProps> = ({
  isOpen,
  onClose,
  onRunFinished,
}) => {
  const [profiles, setProfiles] = useState<TargetProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('custom');

  // Form Fields
  const [profileName, setProfileName] = useState<string>('');
  const [industry, setIndustry] = useState<string>('B2B SaaS');
  const [location, setLocation] = useState<string>('United States / Remote');
  const [companySize, setCompanySize] = useState<string>('20-100 employees');
  const [criteria, setCriteria] = useState<string>(
    'Growing software companies with technical founders needing automated sales ops and email personalization'
  );
  const [maxLeads, setMaxLeads] = useState<number>(5);
  const [saveAsProfile, setSaveAsProfile] = useState<boolean>(false);

  // Run execution state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeRun, setActiveRun] = useState<AutomationRun | null>(null);
  const [pollingInterval, setPollingInterval] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadProfiles();
    } else {
      if (pollingInterval) clearInterval(pollingInterval);
      setActiveRun(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const loadProfiles = async () => {
    try {
      const data = await api.getProfiles();
      setProfiles(data);
    } catch {
      // ignore
    }
  };

  const handleProfileSelect = (val: string) => {
    setSelectedProfileId(val);
    if (val === 'custom') return;
    const found = profiles.find((p) => p.id.toString() === val);
    if (found) {
      setIndustry(found.industry);
      setLocation(found.location || '');
      setCompanySize(found.company_size || '');
      setCriteria(found.criteria);
    }
  };

  const handleStartDiscovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let profileIdToUse: number | undefined = undefined;

      // Optionally save as new profile
      if (saveAsProfile && profileName.trim()) {
        const newProf = await api.createProfile({
          name: profileName.trim(),
          industry,
          location,
          company_size: companySize,
          criteria,
        });
        profileIdToUse = newProf.id;
      } else if (selectedProfileId !== 'custom') {
        profileIdToUse = parseInt(selectedProfileId, 10);
      }

      // Launch run
      const run = await api.startDiscovery({
        profile_id: profileIdToUse,
        industry,
        location,
        company_size: companySize,
        criteria,
        max_leads: maxLeads,
      });

      setActiveRun(run);

      // Poll run status
      const interval = setInterval(async () => {
        try {
          const updated = await api.getDiscoveryRun(run.id);
          setActiveRun(updated);
          if (updated.status === 'COMPLETED' || updated.status === 'FAILED') {
            clearInterval(interval);
            setIsSubmitting(false);
            onRunFinished();
          }
        } catch {
          clearInterval(interval);
          setIsSubmitting(false);
        }
      }, 2000);

      setPollingInterval(interval);
    } catch (err: any) {
      alert(`Could not start run: ${err.message}`);
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-600/20 text-brand-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Launch Lead Discovery Run
              </h2>
              <p className="text-xs text-slate-400">
                Define your ideal customer profile and criteria
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {activeRun ? (
            /* Running Progress State */
            <div className="py-8 text-center space-y-5">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
                {activeRun.status === 'COMPLETED' ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                ) : activeRun.status === 'FAILED' ? (
                  <AlertCircle className="w-8 h-8 text-red-400" />
                ) : (
                  <RefreshCw className="w-8 h-8 animate-spin" />
                )}
              </div>

              <div>
                <h3 className="text-base font-bold text-white">
                  {activeRun.status === 'COMPLETED'
                    ? 'Discovery Run Completed!'
                    : activeRun.status === 'FAILED'
                    ? 'Discovery Run Encountered an Issue'
                    : 'Executing Lead Discovery Workflow...'}
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {activeRun.status === 'COMPLETED'
                    ? 'All prospects evaluated with Gemini, contacts enriched via Hunter, and outreach drafts prepared.'
                    : activeRun.status === 'FAILED'
                    ? activeRun.error_summary || 'Workflow stopped.'
                    : 'Crawling target websites, scoring qualification fit, and writing customized outreach drafts...'}
                </p>
              </div>

              {/* Real-time Counters */}
              <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-lg font-bold text-white">{activeRun.leads_discovered}</div>
                  <div className="text-[10px] text-slate-400">Discovered</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-lg font-bold text-emerald-400">{activeRun.leads_qualified}</div>
                  <div className="text-[10px] text-slate-400">Qualified</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-lg font-bold text-brand-400">{activeRun.drafts_generated}</div>
                  <div className="text-[10px] text-slate-400">Drafts</div>
                </div>
              </div>

              {activeRun.status === 'COMPLETED' && (
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-500/20 transition-all"
                >
                  View Discovered Leads
                </button>
              )}
            </div>
          ) : (
            /* Input Form */
            <form onSubmit={handleStartDiscovery} className="space-y-4">
              
              {/* Preset Selector */}
              {profiles.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-slate-300">
                    Load Saved Profile
                  </label>
                  <select
                    value={selectedProfileId}
                    onChange={(e) => handleProfileSelect(e.target.value)}
                    className="w-full mt-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                  >
                    <option value="custom">-- Custom Search --</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id.toString()}>
                        {p.name} ({p.industry})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Target Industry */}
              <div>
                <label className="text-xs font-semibold text-slate-300">
                  Target Industry & Vertical *
                </label>
                <input
                  type="text"
                  required
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. B2B SaaS, FinTech, DevTools, AI Infrastructure"
                  className="w-full mt-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Geography & Company Size */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300">
                    Location / Region
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. United States, Europe, Remote"
                    className="w-full mt-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300">
                    Company Size
                  </label>
                  <input
                    type="text"
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                    placeholder="e.g. 10-50, 50-200"
                    className="w-full mt-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Fit Criteria */}
              <div>
                <label className="text-xs font-semibold text-slate-300">
                  Ideal Customer Fit Criteria & Pain Points *
                </label>
                <textarea
                  rows={3}
                  required
                  value={criteria}
                  onChange={(e) => setCriteria(e.target.value)}
                  placeholder="Describe your ideal buyer, pain points solved, and key qualification signals..."
                  className="w-full mt-1 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-brand-500 leading-relaxed"
                />
              </div>

              {/* Max Leads Slider */}
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Prospect Limit for Run</span>
                  <span className="font-bold text-brand-400">{maxLeads} companies</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={maxLeads}
                  onChange={(e) => setMaxLeads(parseInt(e.target.value, 10))}
                  className="w-full mt-2 accent-brand-500 cursor-pointer"
                />
              </div>

              {/* Save Profile Option */}
              <div className="pt-2 border-t border-slate-800">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveAsProfile}
                    onChange={(e) => setSaveAsProfile(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-brand-500 focus:ring-0"
                  />
                  <span>Save these criteria as a reusable Target Profile</span>
                </label>

                {saveAsProfile && (
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Profile name (e.g. Early Stage DevTools ICP)..."
                    className="w-full mt-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 text-white font-semibold text-xs shadow-lg shadow-brand-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Automated Discovery & Scoring</span>
                </button>
              </div>

            </form>
          )}
        </div>

      </div>
    </div>
  );
};
