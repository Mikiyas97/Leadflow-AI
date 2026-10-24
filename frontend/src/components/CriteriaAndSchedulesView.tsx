import React, { useState, useEffect } from 'react';
import {
  Sliders,
  CalendarClock,
  Plus,
  Trash2,
  Play,
  CheckCircle2,
  AlertCircle,
  Building2,
  MapPin,
  Clock,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  RefreshCw
} from 'lucide-react';
import type { TargetProfile, DiscoverySchedule } from '../types';
import { api } from '../services/api';

interface CriteriaAndSchedulesViewProps {
  onOpenDiscoveryWithProfile?: (profile: TargetProfile) => void;
  onRefreshDashboard?: () => void;
}

export const CriteriaAndSchedulesView: React.FC<CriteriaAndSchedulesViewProps> = ({
  onOpenDiscoveryWithProfile,
  onRefreshDashboard,
}) => {
  const [profiles, setProfiles] = useState<TargetProfile[]>([]);
  const [schedules, setSchedules] = useState<DiscoverySchedule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Profile Form state (FR-01)
  const [profileName, setProfileName] = useState<string>('');
  const [profileIndustry, setProfileIndustry] = useState<string>('B2B SaaS');
  const [profileLocation, setProfileLocation] = useState<string>('United States');
  const [profileCompanySize, setProfileCompanySize] = useState<string>('20-100');
  const [profileCriteria, setProfileCriteria] = useState<string>('');
  const [isCreatingProfile, setIsCreatingProfile] = useState<boolean>(false);

  // Schedule Form state (FR-10)
  const [schedName, setSchedName] = useState<string>('');
  const [schedInterval, setSchedInterval] = useState<number>(24);
  const [schedIndustry, setSchedIndustry] = useState<string>('Hospitality / Hotels');
  const [schedLocation, setSchedLocation] = useState<string>('Addis Ababa, Ethiopia');
  const [schedCriteria, setSchedCriteria] = useState<string>('Hotels without an official website needing web development');
  const [schedMaxLeads, setSchedMaxLeads] = useState<number>(5);
  const [isCreatingSchedule, setIsCreatingSchedule] = useState<boolean>(false);

  // Feedback states
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [triggeringId, setTriggeringId] = useState<number | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [profilesData, schedulesData] = await Promise.all([
        api.getProfiles(),
        api.getSchedules(),
      ]);
      setProfiles(profilesData);
      setSchedules(schedulesData);
    } catch (err: any) {
      console.error('Failed to load data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim() || !profileCriteria.trim()) {
      setStatusMessage({ type: 'error', text: 'Profile name and qualification criteria are required.' });
      return;
    }

    try {
      setIsCreatingProfile(true);
      const created = await api.createProfile({
        name: profileName.trim(),
        industry: profileIndustry.trim(),
        location: profileLocation.trim() || undefined,
        company_size: profileCompanySize.trim() || undefined,
        criteria: profileCriteria.trim(),
      });
      setProfiles((prev) => [created, ...prev]);
      setProfileName('');
      setProfileCriteria('');
      setStatusMessage({ type: 'success', text: `Target Customer Profile '${created.name}' created successfully.` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to create target profile.' });
    } finally {
      setIsCreatingProfile(false);
    }
  };

  const handleDeleteProfile = async (id: number) => {
    if (!confirm('Are you sure you want to delete this target customer profile?')) return;
    try {
      await api.deleteProfile(id);
      setProfiles((prev) => prev.filter((p) => p.id !== id));
      setStatusMessage({ type: 'success', text: 'Profile deleted successfully.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to delete profile.' });
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedName.trim() || !schedCriteria.trim()) {
      setStatusMessage({ type: 'error', text: 'Schedule name and discovery criteria are required.' });
      return;
    }

    try {
      setIsCreatingSchedule(true);
      const created = await api.createSchedule({
        name: schedName.trim(),
        interval_hours: schedInterval,
        industry: schedIndustry.trim(),
        location: schedLocation.trim() || 'United States',
        criteria: schedCriteria.trim(),
        max_leads: schedMaxLeads,
        is_active: true,
      });
      setSchedules((prev) => [created, ...prev]);
      setSchedName('');
      setStatusMessage({ type: 'success', text: `Automated Discovery Schedule '${created.name}' activated.` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to create schedule.' });
    } finally {
      setIsCreatingSchedule(false);
    }
  };

  const handleToggleSchedule = async (schedule: DiscoverySchedule) => {
    try {
      const updated = await api.updateSchedule(schedule.id, { is_active: !schedule.is_active });
      setSchedules((prev) => prev.map((s) => (s.id === schedule.id ? updated : s)));
    } catch (err: any) {
      alert(`Could not toggle schedule: ${err.message}`);
    }
  };

  const handleDeleteSchedule = async (id: number) => {
    if (!confirm('Delete this automated discovery schedule?')) return;
    try {
      await api.deleteSchedule(id);
      setSchedules((prev) => prev.filter((s) => s.id !== id));
      setStatusMessage({ type: 'success', text: 'Schedule deleted.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  const handleTriggerScheduleNow = async (id: number) => {
    try {
      setTriggeringId(id);
      const res = await api.triggerScheduleNow(id);
      setStatusMessage({ type: 'success', text: `Immediate run triggered (Run #${res.run_id}).` });
      if (onRefreshDashboard) onRefreshDashboard();
      const schedulesData = await api.getSchedules();
      setSchedules(schedulesData);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to trigger run.' });
    } finally {
      setTriggeringId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8 animate-fade-in">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Customer Criteria & Scheduled Discovery</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#181822] text-[#f95721] border border-[#262634]">
              FR-01 & FR-10
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Define Ideal Customer Profiles (ICP), configure periodic autonomous discovery schedules, and trigger immediate pipeline runs.
          </p>
        </div>

        <button
          onClick={loadAll}
          className="p-2 rounded-xl bg-[#121217] border border-[#22222c] text-slate-400 hover:text-white transition-colors self-start sm:self-center"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Status Feedback Banner */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-white text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* SECTION 1: TARGET CUSTOMER CRITERIA (FR-01) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider text-slate-300">
            <Sliders className="w-4 h-4 text-[#f95721]" />
            <span>1. Target Customer Criteria & ICP Profiles (FR-01)</span>
          </h2>
          <span className="text-[11px] text-slate-500">
            {profiles.length} Saved Profile{profiles.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* Create Profile Form Card */}
          <div className="bg-[#121217] border border-[#22222c] rounded-2xl p-5 shadow-xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-[#f95721]" />
              <span>Define New Customer Criteria</span>
            </h3>

            <form onSubmit={handleCreateProfile} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Profile Name *
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="e.g. Ethiopian Tech Startups"
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#f95721]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Industry *
                  </label>
                  <input
                    type="text"
                    value={profileIndustry}
                    onChange={(e) => setProfileIndustry(e.target.value)}
                    placeholder="e.g. B2B SaaS"
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#f95721]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Location
                  </label>
                  <input
                    type="text"
                    value={profileLocation}
                    onChange={(e) => setProfileLocation(e.target.value)}
                    placeholder="e.g. Ethiopia"
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#f95721]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Company Size
                </label>
                <input
                  type="text"
                  value={profileCompanySize}
                  onChange={(e) => setProfileCompanySize(e.target.value)}
                  placeholder="e.g. 10-50, 50-200"
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#f95721]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Fit Criteria & Pain Points (Gemini Evaluates Against This) *
                </label>
                <textarea
                  rows={3}
                  value={profileCriteria}
                  onChange={(e) => setProfileCriteria(e.target.value)}
                  placeholder="e.g. Growing technology teams seeking automated sales operations, marketing workflows, or modern custom website infrastructure..."
                  className="w-full mt-1 p-2.5 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#f95721] resize-none leading-relaxed"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isCreatingProfile}
                className="w-full mt-2 py-2.5 rounded-xl bg-[#f95721] hover:bg-[#ea4710] text-white font-bold text-xs shadow-md shadow-[#f95721]/20 transition-all disabled:opacity-50"
              >
                {isCreatingProfile ? 'Saving...' : 'Save Customer Criteria Profile'}
              </button>
            </form>
          </div>

          {/* Saved Profiles List */}
          <div className="lg:col-span-2 space-y-3">
            {profiles.length === 0 ? (
              <div className="p-8 text-center bg-[#121217] border border-[#22222c] rounded-2xl text-xs text-slate-500">
                No custom criteria profiles created yet. Fill out the form to define an Ideal Customer Profile.
              </div>
            ) : (
              profiles.map((prof) => (
                <div
                  key={prof.id}
                  className="p-4 rounded-2xl bg-[#121217] border border-[#22222c] hover:border-[#2e2e3c] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{prof.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20">
                        {prof.industry}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      {prof.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#f95721]" />
                          <span>{prof.location}</span>
                        </span>
                      )}
                      {prof.company_size && (
                        <span className="flex items-center gap-1 text-slate-500">
                          <Building2 className="w-3 h-3" />
                          <span>{prof.company_size} employees</span>
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-300 bg-[#0c0c10] p-2 rounded-xl border border-[#1e1e28] mt-1 line-clamp-2">
                      {prof.criteria}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {onOpenDiscoveryWithProfile && (
                      <button
                        onClick={() => onOpenDiscoveryWithProfile(prof)}
                        className="px-3 py-1.5 rounded-lg bg-[#f95721]/10 hover:bg-[#f95721]/20 text-[#f95721] border border-[#f95721]/30 text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Run Discovery</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteProfile(prof.id)}
                      className="p-1.5 rounded-lg bg-[#181822] hover:bg-red-600 text-slate-400 hover:text-white transition-colors"
                      title="Delete profile"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      </div>

      {/* SECTION 2: SCHEDULED LEAD DISCOVERY RUNS (FR-10) */}
      <div className="space-y-4 pt-4 border-t border-[#202028]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider text-slate-300">
              <CalendarClock className="w-4 h-4 text-emerald-400" />
              <span>2. Scheduled Lead Discovery Automation (FR-10)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Runs in the background at periodic intervals (1h, 6h, 12h, 24h) to automatically crawl, score, and draft leads without human intervention.
            </p>
          </div>
          <span className="text-[11px] text-slate-500">
            {schedules.length} Active Schedule{schedules.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* Create Schedule Form Card */}
          <div className="bg-[#121217] border border-[#22222c] rounded-2xl p-5 shadow-xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>New Discovery Schedule</span>
            </h3>

            <form onSubmit={handleCreateSchedule} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Schedule Name *
                </label>
                <input
                  type="text"
                  value={schedName}
                  onChange={(e) => setSchedName(e.target.value)}
                  placeholder="e.g. Daily Addis Ababa Hotel Crawl"
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Execution Interval *
                  </label>
                  <select
                    value={schedInterval}
                    onChange={(e) => setSchedInterval(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
                  >
                    <option value={1}>Every 1 Hour</option>
                    <option value={6}>Every 6 Hours</option>
                    <option value={12}>Every 12 Hours</option>
                    <option value={24}>Every 24 Hours (Daily)</option>
                    <option value={72}>Every 3 Days</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Max Leads per Run
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={schedMaxLeads}
                    onChange={(e) => setSchedMaxLeads(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Target Industry *
                  </label>
                  <input
                    type="text"
                    value={schedIndustry}
                    onChange={(e) => setSchedIndustry(e.target.value)}
                    placeholder="e.g. Hospitality / Hotels"
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white focus:outline-none focus:border-emerald-400"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Location
                  </label>
                  <input
                    type="text"
                    value={schedLocation}
                    onChange={(e) => setSchedLocation(e.target.value)}
                    placeholder="e.g. Addis Ababa, Ethiopia"
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Discovery Criteria *
                </label>
                <textarea
                  rows={2}
                  value={schedCriteria}
                  onChange={(e) => setSchedCriteria(e.target.value)}
                  placeholder="e.g. Hotels without official website in Addis Ababa needing custom direct booking sites..."
                  className="w-full mt-1 p-2 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isCreatingSchedule}
                className="w-full mt-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
              >
                {isCreatingSchedule ? 'Scheduling...' : 'Activate Discovery Schedule'}
              </button>
            </form>
          </div>

          {/* Configured Schedules Table */}
          <div className="lg:col-span-2 space-y-3">
            {schedules.length === 0 ? (
              <div className="p-8 text-center bg-[#121217] border border-[#22222c] rounded-2xl text-xs text-slate-500">
                No recurring discovery schedules configured. Create a schedule to automate lead discovery in the background.
              </div>
            ) : (
              schedules.map((sched) => (
                <div
                  key={sched.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    sched.is_active
                      ? 'bg-[#101614] border-emerald-500/30'
                      : 'bg-[#121217] border-[#22222c] opacity-75'
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{sched.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                        Every {sched.interval_hours}h
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        sched.is_active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {sched.is_active ? 'ACTIVE' : 'PAUSED'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span>{sched.industry}</span>
                      {sched.location && (
                        <span className="flex items-center gap-1 text-slate-500">
                          <MapPin className="w-3 h-3 text-[#f95721]" />
                          <span>{sched.location}</span>
                        </span>
                      )}
                      <span className="text-slate-500">Max {sched.max_leads} leads/run</span>
                    </div>

                    <div className="flex items-center gap-4 text-[10px] text-slate-400 pt-1">
                      {sched.next_run_at && (
                        <span className="flex items-center gap-1 text-amber-400">
                          <Clock className="w-3 h-3" />
                          <span>Next Run: {new Date(sched.next_run_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(sched.next_run_at).toLocaleDateString([], { month: 'short', day: 'numeric' })})</span>
                        </span>
                      )}
                      {sched.last_run_at && (
                        <span className="text-slate-500">
                          Last run: {new Date(sched.last_run_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => handleToggleSchedule(sched)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1 ${
                        sched.is_active
                          ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      {sched.is_active ? <ToggleRight className="w-3.5 h-3.5 text-amber-400" /> : <ToggleLeft className="w-3.5 h-3.5 text-slate-500" />}
                      <span>{sched.is_active ? 'Pause' : 'Resume'}</span>
                    </button>

                    <button
                      onClick={() => handleTriggerScheduleNow(sched.id)}
                      disabled={triggeringId === sched.id}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition-all flex items-center gap-1 disabled:opacity-50"
                      title="Run immediately"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{triggeringId === sched.id ? 'Starting...' : 'Trigger Now'}</span>
                    </button>

                    <button
                      onClick={() => handleDeleteSchedule(sched.id)}
                      className="p-1.5 rounded-lg bg-[#181822] hover:bg-red-600 text-slate-400 hover:text-white transition-colors"
                      title="Delete schedule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      </div>

    </div>
  );
};
