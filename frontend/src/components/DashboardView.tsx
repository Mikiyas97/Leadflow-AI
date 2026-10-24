import React, { useState } from 'react';
import {
  Users,
  Target,
  FileEdit,
  MailCheck,
  Send,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Sparkles,
  RefreshCw,
  ArrowRight,
  MapPin
} from 'lucide-react';
import type { DashboardStats, OverdueLeadItem } from '../types';
import { api } from '../services/api';
import type { ActiveTab } from './Sidebar';

interface DashboardViewProps {
  stats: DashboardStats | null;
  loading: boolean;
  onRefresh: () => void;
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenDiscovery: () => void;
  onSelectLead: (leadId: number) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  loading,
  onRefresh,
  onNavigateTab,
  onOpenDiscovery,
  onSelectLead,
}) => {
  const [rescheduleLead, setRescheduleLead] = useState<OverdueLeadItem | null>(null);
  const [rescheduleDays, setRescheduleDays] = useState<number>(3);
  const [rescheduleNotes, setRescheduleNotes] = useState<string>('');
  const [isUpdatingFollowUp, setIsUpdatingFollowUp] = useState<boolean>(false);

  const totalLeads = stats?.total_leads || 0;
  const qualifiedLeads = stats?.qualified_leads || 0;
  const pendingDrafts = stats?.pending_drafts || 0;
  const approvedDrafts = stats?.approved_drafts || 0;
  const sentEmails = stats?.sent_emails || 0;
  const overdueCount = stats?.overdue_followups_count || 0;
  const qualRate = stats?.qualification_rate || (totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0);
  const overdueLeads = stats?.overdue_leads || [];

  const handleQuickReschedule = async () => {
    if (!rescheduleLead) return;
    try {
      setIsUpdatingFollowUp(true);
      await api.rescheduleFollowUp(rescheduleLead.id, {
        days: rescheduleDays,
        notes: rescheduleNotes || 'Rescheduled from dashboard overdue queue',
        action_type: 'Overdue Follow-up Extension'
      });
      setRescheduleLead(null);
      setRescheduleNotes('');
      onRefresh();
    } catch (err: any) {
      alert(`Could not reschedule follow-up: ${err.message}`);
    } finally {
      setIsUpdatingFollowUp(false);
    }
  };

  const handleMarkComplete = async (leadId: number) => {
    try {
      setIsUpdatingFollowUp(true);
      await api.rescheduleFollowUp(leadId, {
        status: 'COMPLETED',
        notes: 'Follow-up marked completed via Dashboard.',
        action_type: 'Completed Follow-up'
      });
      onRefresh();
    } catch (err: any) {
      alert(`Could not mark follow-up complete: ${err.message}`);
    } finally {
      setIsUpdatingFollowUp(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Sales Operations Dashboard</span>
            <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-[#1e1e28] text-slate-400 border border-[#2a2a38]">
              Autonomous Pipeline Monitor
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time prospect discovery, AI qualification metrics, email dispatch, and follow-up tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-xl bg-[#121217] border border-[#22222c] text-slate-400 hover:text-white hover:bg-[#181822] transition-colors"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onOpenDiscovery}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#f95721] hover:bg-[#ea4710] text-white text-xs font-semibold shadow-md shadow-[#f95721]/20 transition-all hover:scale-[1.01]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Start Discovery Run</span>
          </button>
        </div>
      </div>

      {/* FR-11: Performance Summaries KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        
        {/* Total Leads Discovered */}
        <div className="bg-[#121217] border border-[#22222c] rounded-2xl p-4 hover:border-[#2e2e3c] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Leads</span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{loading ? '...' : totalLeads}</span>
            <span className="text-[10px] text-slate-500 font-medium">discovered</span>
          </div>
          <button
            onClick={() => onNavigateTab('manage-leads')}
            className="mt-2 text-[10px] text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
          >
            View all leads &rarr;
          </button>
        </div>

        {/* Qualified Leads */}
        <div className="bg-[#121217] border border-[#22222c] rounded-2xl p-4 hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Qualified</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400">{loading ? '...' : qualifiedLeads}</span>
            <span className="text-[10px] text-emerald-500/80 font-bold">({qualRate}% fit rate)</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500">
            Scored ≥ 65/100 by Gemini
          </div>
        </div>

        {/* Outreach Drafts Prepared */}
        <div className="bg-[#121217] border border-[#22222c] rounded-2xl p-4 hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Drafts Prepared</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <FileEdit className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400">{loading ? '...' : pendingDrafts}</span>
            <span className="text-[10px] text-slate-500 font-medium">pending review</span>
          </div>
          <button
            onClick={() => onNavigateTab('outreach')}
            className="mt-2 text-[10px] text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
          >
            Review drafts &rarr;
          </button>
        </div>

        {/* Approved Drafts */}
        <div className="bg-[#121217] border border-[#22222c] rounded-2xl p-4 hover:border-indigo-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Approved</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <MailCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{loading ? '...' : approvedDrafts}</span>
            <span className="text-[10px] text-slate-500 font-medium">human-approved</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500">
            Ready for SMTP dispatch
          </div>
        </div>

        {/* Sent Emails via SMTP */}
        <div className="bg-[#121217] border border-[#22222c] rounded-2xl p-4 hover:border-[#f95721]/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Sent via SMTP</span>
            <div className="p-1.5 rounded-lg bg-[#f95721]/10 text-[#f95721]">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#f95721]">{loading ? '...' : sentEmails}</span>
            <span className="text-[10px] text-slate-500 font-medium">dispatched</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500">
            Gmail SMTP Verified
          </div>
        </div>

      </div>

      {/* FR-09: Overdue Follow-ups Alert Section */}
      <div className={`p-5 rounded-2xl border transition-all ${
        overdueCount > 0
          ? 'bg-gradient-to-r from-amber-950/30 via-[#181412] to-[#121217] border-amber-500/30 shadow-lg shadow-amber-500/5'
          : 'bg-[#121217] border-[#22222c]'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${
              overdueCount > 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/10 text-emerald-400'
            }`}>
              {overdueCount > 0 ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>Overdue Follow-up Tracker</span>
                {overdueCount > 0 ? (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500 text-black">
                    {overdueCount} Action Required
                  </span>
                ) : (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    All Clear
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {overdueCount > 0
                  ? 'Leads that received outreach and have passed their scheduled 3-day follow-up touchpoint date.'
                  : 'All prospective leads are on schedule. No overdue outreach follow-ups at this time.'}
              </p>
            </div>
          </div>

          {overdueCount > 0 && (
            <button
              onClick={() => onNavigateTab('manage-leads')}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 self-start sm:self-center"
            >
              <span>View Overdue in Manage Leads</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Overdue Items List */}
        {overdueLeads.length > 0 && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {overdueLeads.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-[#0e0e13] border border-amber-500/20 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-2.5"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => onSelectLead(item.id)}
                      className="text-xs font-bold text-white hover:text-amber-300 text-left transition-colors truncate"
                    >
                      {item.company_name}
                    </button>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                      {item.days_overdue}d overdue
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                    <span className="truncate">{item.website}</span>
                    {item.location && (
                      <span className="flex items-center gap-0.5 text-slate-500 shrink-0">
                        <MapPin className="w-2.5 h-2.5" />
                        <span className="truncate max-w-[90px]">{item.location}</span>
                      </span>
                    )}
                  </div>

                  {item.follow_up_notes && (
                    <p className="text-[10px] text-slate-400 bg-[#14141c] p-1.5 rounded-lg border border-[#22222e] mt-2 line-clamp-2">
                      {item.follow_up_notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#1e1e28]">
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-amber-400" />
                    <span>Due: {new Date(item.follow_up_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleMarkComplete(item.id)}
                      disabled={isUpdatingFollowUp}
                      className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium transition-colors"
                      title="Mark follow-up completed"
                    >
                      Complete
                    </button>
                    <button
                      onClick={() => {
                        setRescheduleLead(item);
                        setRescheduleNotes(item.follow_up_notes || '');
                      }}
                      className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-[10px] font-medium transition-colors"
                    >
                      Reschedule
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grid: Recent Runs & Live Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Recent Automation Runs */}
        <div className="bg-[#121217] border border-[#22222c] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#f95721]" />
              <span>Recent Automation Runs</span>
            </h2>
            <button
              onClick={onOpenDiscovery}
              className="text-xs text-[#f95721] hover:text-[#ea4710] font-semibold"
            >
              + New Run
            </button>
          </div>

          <div className="space-y-2.5">
            {(!stats?.recent_runs || stats.recent_runs.length === 0) ? (
              <div className="text-center py-8 text-xs text-slate-500">
                No automation runs executed yet. Click "Start Discovery Run" to begin.
              </div>
            ) : (
              stats.recent_runs.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#0e0e13] border border-[#20202a] hover:border-[#2e2e3c] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        run.status === 'COMPLETED'
                          ? 'bg-emerald-400'
                          : run.status === 'RUNNING'
                          ? 'bg-[#f95721] animate-ping'
                          : run.status === 'FAILED'
                          ? 'bg-red-400'
                          : 'bg-amber-400'
                      }`}
                    />
                    <div>
                      <div className="text-xs font-bold text-white">
                        Run #{run.id}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {run.leads_discovered} leads found • {run.leads_qualified} qualified • {run.drafts_generated} drafts
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        run.status === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : run.status === 'RUNNING'
                          ? 'bg-[#f95721]/10 text-[#f95721] border border-[#f95721]/20'
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
        <div className="bg-[#121217] border border-[#22222c] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Live Workflow Activity</span>
            </h2>
            <button
              onClick={() => onNavigateTab('activity')}
              className="text-xs text-[#f95721] hover:text-[#ea4710] font-semibold"
            >
              Full Audit Trail &rarr;
            </button>
          </div>

          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {(!stats?.recent_activities || stats.recent_activities.length === 0) ? (
              <div className="text-center py-8 text-xs text-slate-500">
                No activity logs recorded yet.
              </div>
            ) : (
              stats.recent_activities.map((act) => (
                <div
                  key={act.id}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#0e0e13] border border-[#1e1e28] text-xs"
                >
                  <span
                    className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                      act.level === 'SUCCESS'
                        ? 'bg-emerald-400'
                        : act.level === 'WARNING'
                        ? 'bg-amber-400'
                        : act.level === 'ERROR'
                        ? 'bg-red-400'
                        : 'bg-blue-400'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-200 text-[11px] truncate">
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

      {/* Quick Reschedule Modal */}
      {rescheduleLead && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121217] border border-[#2a2a38] rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>Reschedule Follow-up: {rescheduleLead.company_name}</span>
              </h3>
              <button
                onClick={() => setRescheduleLead(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Extend by Days
                </label>
                <div className="grid grid-cols-4 gap-2 mt-1.5">
                  {[1, 3, 5, 7].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setRescheduleDays(d)}
                      className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        rescheduleDays === d
                          ? 'bg-amber-500 text-black border-amber-400'
                          : 'bg-[#181822] text-slate-300 border-[#2a2a38] hover:border-slate-500'
                      }`}
                    >
                      +{d} Day{d > 1 ? 's' : ''}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Follow-up Notes / Touchpoint Strategy
                </label>
                <textarea
                  rows={3}
                  value={rescheduleNotes}
                  onChange={(e) => setRescheduleNotes(e.target.value)}
                  placeholder="e.g. Founder requested follow-up next Monday with direct case study..."
                  className="w-full mt-1.5 p-2.5 rounded-xl bg-[#0c0c10] border border-[#242432] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#20202a]">
              <button
                type="button"
                onClick={() => setRescheduleLead(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleQuickReschedule}
                disabled={isUpdatingFollowUp}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow transition-all disabled:opacity-50"
              >
                {isUpdatingFollowUp ? 'Updating...' : 'Save Follow-up'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
