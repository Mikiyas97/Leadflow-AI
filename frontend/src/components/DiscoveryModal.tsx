import React, { useState, useEffect } from 'react';
import { X, Sparkles, AlertCircle } from 'lucide-react';
import type { TargetProfile } from '../types';
import { api } from '../services/api';

interface DiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunStarted: () => void;
  initialProfile?: TargetProfile | null;
}

export const DiscoveryModal: React.FC<DiscoveryModalProps> = ({
  isOpen,
  onClose,
  onRunStarted,
  initialProfile,
}) => {
  const [profiles, setProfiles] = useState<TargetProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number | 'custom'>('custom');
  
  const [industry, setIndustry] = useState<string>('B2B SaaS');
  const [location, setLocation] = useState<string>('United States');
  const [companySize, setCompanySize] = useState<string>('20-100');
  const [criteria, setCriteria] = useState<string>('High-growth B2B software companies needing sales operations automation');
  const [maxLeads, setMaxLeads] = useState<number>(5);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadProfiles();
      if (initialProfile) {
        setSelectedProfileId(initialProfile.id);
        setIndustry(initialProfile.industry);
        setLocation(initialProfile.location || 'United States');
        setCompanySize(initialProfile.company_size || '20-100');
        setCriteria(initialProfile.criteria);
      }
    }
  }, [isOpen, initialProfile]);

  const loadProfiles = async () => {
    try {
      const data = await api.getProfiles();
      setProfiles(data);
    } catch {
      // ignore
    }
  };

  const handleProfileSelect = (val: string) => {
    if (val === 'custom') {
      setSelectedProfileId('custom');
    } else {
      const pId = Number(val);
      setSelectedProfileId(pId);
      const prof = profiles.find((p) => p.id === pId);
      if (prof) {
        setIndustry(prof.industry);
        setLocation(prof.location || 'United States');
        setCompanySize(prof.company_size || '20-100');
        setCriteria(prof.criteria);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await api.startDiscovery({
        profile_id: selectedProfileId !== 'custom' ? selectedProfileId : undefined,
        industry: industry.trim(),
        location: location.trim(),
        company_size: companySize.trim(),
        criteria: criteria.trim(),
        max_leads: maxLeads,
      });
      onRunStarted();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to trigger discovery run.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121217] border border-[#262634] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scale-in">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1e1e28]">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#f95721]" />
            <span>Launch Lead Discovery Run</span>
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {profiles.length > 0 && (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Load Criteria Profile
              </label>
              <select
                value={selectedProfileId}
                onChange={(e) => handleProfileSelect(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white focus:outline-none focus:border-[#f95721] cursor-pointer"
              >
                <option value="custom">Custom Parameters (One-time)</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.industry} in {p.location || 'Any'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Target Industry *
              </label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. B2B SaaS"
                className="w-full mt-1 px-3 py-2 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white focus:outline-none focus:border-[#f95721]"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Target Location *
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. United States or California, USA"
                className="w-full mt-1 px-3 py-2 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white focus:outline-none focus:border-[#f95721]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Company Size
              </label>
              <input
                type="text"
                value={companySize}
                onChange={(e) => setCompanySize(e.target.value)}
                placeholder="e.g. 20-100"
                className="w-full mt-1 px-3 py-2 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white focus:outline-none focus:border-[#f95721]"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Max Leads
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={maxLeads}
                onChange={(e) => setMaxLeads(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white focus:outline-none focus:border-[#f95721]"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Ideal Customer Fit Criteria *
            </label>
            <textarea
              rows={3}
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
              placeholder="e.g. SaaS firms scaling their outbound pipeline, or local businesses lacking dedicated web domains..."
              className="w-full mt-1 p-2.5 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white focus:outline-none focus:border-[#f95721] resize-none leading-relaxed"
              required
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1e1e28]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f95721] hover:bg-[#ea4710] text-white font-bold text-xs shadow-md shadow-[#f95721]/20 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{loading ? 'Starting Run...' : 'Launch Workflow'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
