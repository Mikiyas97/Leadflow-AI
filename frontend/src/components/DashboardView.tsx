import React from 'react';
import {
  Users,
  Target,
  MailCheck,
  FileEdit,
  ArrowRight,
  Sparkles,
  Clock,
  CheckCircle,
  Play
} from 'lucide-react';
import type { DashboardStats } from '../types';

interface DashboardViewProps {
  stats: DashboardStats | null;
  loading: boolean;
  onOpenDiscovery: () => void;
  onNavigateTab: (tab: 'dashboard' | 'leads' | 'outreach' | 'activity') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  loading,
  onOpenDiscovery,
  onNavigateTab,
}) => {
  const totalLeads = stats?.total_leads || 0;
  const qualifiedLeads = stats?.qualified_leads || 0;
  const pendingDrafts = stats?.pending_drafts || 0;
  const approvedDrafts = stats?.approved_drafts || 0;
  const qualRate = totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Hero Quick Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-brand-950/60 to-slate-900 border border-slate-800 p-6 sm:p-8">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 text-xs font-semibold border border-brand-500/20 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Sales Operations Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Accelerate B2B Sales Prospecting with Autonomous AI
          </h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            LeadFlow crawls public company profiles, enriches decision-maker contacts with Hunter.io, assesses fit with Google Gemini, and prepares personalized outreach drafts for human review.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenDiscovery}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs shadow-lg shadow-brand-500/25 transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Launch Discovery Run</span>
            </button>
            <button
              onClick={() => onNavigateTab('leads')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-medium text-xs border border-slate-700 transition-all"
            >
              <span>Explore Prospects</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Ambient subtle glow */}
        <div className="absolute right-0 top-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-brand-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Leads */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Leads Discovered</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {loading ? '...' : totalLeads}
            </span>
            <span className="text-xs text-slate-400">prospects</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Deduplicated across runs</p>
        </div>

        {/* Qualified Rate */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Qualified Fit</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Target className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400 tracking-tight">
              {loading ? '...' : qualifiedLeads}
            </span>
            <span className="text-xs text-emerald-500 font-medium">({qualRate}% fit rate)</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Scored ≥ 65/100 by Gemini</p>
        </div>

        {/* Pending Drafts */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Outreach Under Review</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <FileEdit className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-400 tracking-tight">
              {loading ? '...' : pendingDrafts}
            </span>
            <span className="text-xs text-slate-400">pending approval</span>
          </div>
          <div className="mt-2">
            <button
              onClick={() => onNavigateTab('outreach')}
              className="text-[11px] text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1"
            >
              Review drafts &rarr;
            </button>
          </div>
        </div>

        {/* Approved Drafts */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Approved Drafts</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <MailCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {loading ? '...' : approvedDrafts}
            </span>
            <span className="text-xs text-slate-400">human-approved</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Ready for outreach sync</p>
        </div>

      </div>

      {/* Grid: Recent Runs & Live Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Automation Runs */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-400" />
              <span>Recent Automation Runs</span>
            </h2>
            <button
              onClick={onOpenDiscovery}
              className="text-xs text-brand-400 hover:text-brand-300 font-medium"
            >
              + New Run
            </button>
          </div>

          <div className="space-y-3">
            {(!stats?.recent_runs || stats.recent_runs.length === 0) ? (
              <div className="text-center py-8 text-xs text-slate-500">
                No automation runs executed yet. Click "Launch Discovery Run" to begin.
              </div>
            ) : (
              stats.recent_runs.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/70 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        run.status === 'COMPLETED'
                          ? 'bg-emerald-400'
                          : run.status === 'RUNNING'
                          ? 'bg-brand-400 animate-pulse'
                          : run.status === 'FAILED'
                          ? 'bg-red-400'
                          : 'bg-amber-400'
                      }`}
                    />
                    <div>
                      <div className="text-xs font-semibold text-white">
                        Run #{run.id}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {run.leads_discovered} leads found • {run.leads_qualified} qualified • {run.drafts_generated} drafts
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                        run.status === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : run.status === 'RUNNING'
                          ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      {run.status}
                    </span>
                    <div className="text-[10px] text-slate-500 mt-1">
                      {new Date(run.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live Activity Stream */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Live Workflow Activity</span>
            </h2>
            <button
              onClick={() => onNavigateTab('activity')}
              className="text-xs text-brand-400 hover:text-brand-300 font-medium"
            >
              View Full Audit Log &rarr;
            </button>
          </div>

          <div className="space-y-2.5 max-h-[290px] overflow-y-auto pr-1">
            {(!stats?.recent_activities || stats.recent_activities.length === 0) ? (
              <div className="text-center py-8 text-xs text-slate-500">
                No activity logs recorded yet.
              </div>
            ) : (
              stats.recent_activities.map((act) => (
                <div
                  key={act.id}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-950/40 border border-slate-850 text-xs"
                >
                  <span
                    className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                      act.level === 'SUCCESS'
                        ? 'bg-emerald-400'
                        : act.level === 'WARNING'
                        ? 'bg-amber-400'
                        : act.level === 'ERROR'
                        ? 'bg-red-400'
                        : 'bg-brand-400'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-200 text-[11px] truncate">
                        {act.action}
                      </span>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {act.details && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                        {act.details}
                      </p>
                    )}
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
