import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  ExternalLink,
  Target,
  Sparkles,
  Users,
  Mail,
  RefreshCw,
  Calendar,
  Save,
  Globe
} from 'lucide-react';
import type { LeadDetail } from '../types';
import { api } from '../services/api';

interface LeadDetailModalProps {
  leadId: number | null;
  onClose: () => void;
  onRefreshParent: () => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  leadId,
  onClose,
  onRefreshParent,
}) => {
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'fit' | 'research' | 'contacts' | 'drafts'>('fit');
  const [customInstructions, setCustomInstructions] = useState<string>('');
  const [drafting, setDrafting] = useState<boolean>(false);
  const [analyzing, setAnalyzing] = useState<boolean>(false);

  // Follow-up state
  const [followUpDays, setFollowUpDays] = useState<number>(3);
  const [followUpNotes, setFollowUpNotes] = useState<string>('');
  const [isUpdatingFollowUp, setIsUpdatingFollowUp] = useState<boolean>(false);

  useEffect(() => {
    if (leadId) {
      loadLeadDetails(leadId);
    }
  }, [leadId]);

  const loadLeadDetails = async (id: number) => {
    try {
      setLoading(true);
      const data = await api.getLead(id);
      setLead(data);
      setFollowUpNotes((data as any).follow_up_notes || '');
    } catch (err: any) {
      console.error('Failed to load lead details', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReanalyze = async () => {
    if (!lead) return;
    try {
      setAnalyzing(true);
      const updated = await api.reanalyzeLead(lead.id);
      setLead(updated);
      onRefreshParent();
    } catch (err: any) {
      alert(`Could not re-analyze lead: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerateDraft = async () => {
    if (!lead) return;
    try {
      setDrafting(true);
      const contactId = lead.contacts?.[0]?.id;
      const newDraft = await api.generateDraft(lead.id, contactId, customInstructions);
      setLead((prev) => (prev ? { ...prev, drafts: [newDraft, ...(prev.drafts || [])] } : prev));
      setCustomInstructions('');
      onRefreshParent();
    } catch (err: any) {
      alert(`Could not generate draft: ${err.message}`);
    } finally {
      setDrafting(false);
    }
  };

  const handleApproveDraft = async (draftId: number) => {
    try {
      await api.approveDraft(draftId);
      setLead((prev) =>
        prev
          ? {
              ...prev,
              drafts: prev.drafts.map((d) => (d.id === draftId ? { ...d, status: 'APPROVED' } : d)),
            }
          : prev
      );
      onRefreshParent();
    } catch (err: any) {
      alert(`Could not approve draft: ${err.message}`);
    }
  };

  const handleSaveFollowUp = async () => {
    if (!lead) return;
    try {
      setIsUpdatingFollowUp(true);
      await api.rescheduleFollowUp(lead.id, {
        days: followUpDays,
        notes: followUpNotes,
        action_type: 'Lead Detail Follow-up Schedule'
      });
      await loadLeadDetails(lead.id);
      onRefreshParent();
      alert('Follow-up scheduled successfully.');
    } catch (err: any) {
      alert(`Could not schedule follow-up: ${err.message}`);
    } finally {
      setIsUpdatingFollowUp(false);
    }
  };

  if (!leadId) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121217] border border-[#262634] rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in">
        
        {/* Header */}
        <div className="p-5 border-b border-[#202028] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#181822] border border-[#2a2a38] flex items-center justify-center text-[#f95721]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  {loading ? 'Loading...' : lead?.company_name}
                </h2>
                {lead && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      lead.status === 'QUALIFIED'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                        : lead.status === 'CONTACTED'
                        ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25'
                        : lead.status === 'UNQUALIFIED'
                        ? 'bg-red-500/10 text-red-400 border-red-500/25'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {lead.status}
                  </span>
                )}
              </div>
              {lead?.website && (
                <a
                  href={`https://${lead.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1 mt-0.5"
                >
                  <span>{lead.website}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a1a24] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-[#1c1c24] text-xs">
          {[
            { id: 'fit', label: 'AI Qualification', icon: Target },
            { id: 'research', label: 'Website Evidence', icon: Globe },
            { id: 'contacts', label: 'Hunter Contacts', icon: Users },
            { id: 'drafts', label: 'Outreach Drafts', icon: Mail },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-2 font-semibold border-b-2 transition-all ${
                  isActive
                    ? 'border-[#f95721] text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {loading ? (
            <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-[#f95721]" />
              <span>Loading prospect details...</span>
            </div>
          ) : !lead ? (
            <div className="py-20 text-center text-red-400">Could not load lead record.</div>
          ) : (
            <>
              {/* TAB 1: AI Qualification */}
              {activeTab === 'fit' && (
                <div className="space-y-5 animate-fade-in">
                  
                  {/* Score & Reanalyze */}
                  <div className="p-4 rounded-2xl bg-[#0c0c10] border border-[#20202a] flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Gemini AI Suitability Score
                      </div>
                      <div className="text-3xl font-black text-white mt-1 flex items-baseline gap-2">
                        <span>{lead.fit_score || 0}</span>
                        <span className="text-xs text-slate-500 font-normal">/ 100</span>
                      </div>
                    </div>

                    <button
                      onClick={handleReanalyze}
                      disabled={analyzing}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#181822] hover:bg-[#222230] text-slate-200 border border-[#2a2a38] text-xs font-semibold transition-all disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
                      <span>{analyzing ? 'Re-scoring...' : 'Re-score with Gemini'}</span>
                    </button>
                  </div>


                  {/* Follow-up Touchpoint Scheduler Section */}
                  <div className="p-4 rounded-2xl bg-[#0c0c10] border border-[#20202a] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        <span>Follow-up Management</span>
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Status: <strong className="text-white">{(lead as any).follow_up_status || 'NOT_SCHEDULED'}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">Schedule In:</span>
                      {[1, 3, 5, 7].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setFollowUpDays(d)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                            followUpDays === d
                              ? 'bg-amber-500 text-black border-amber-400'
                              : 'bg-[#181822] text-slate-300 border-[#2a2a38]'
                          }`}
                        >
                          +{d}d
                        </button>
                      ))}
                    </div>

                    <textarea
                      rows={2}
                      value={followUpNotes}
                      onChange={(e) => setFollowUpNotes(e.target.value)}
                      placeholder="Notes for next follow-up touchpoint..."
                      className="w-full p-2.5 rounded-xl bg-[#121217] border border-[#242432] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 resize-none"
                    />

                    <button
                      onClick={handleSaveFollowUp}
                      disabled={isUpdatingFollowUp}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow transition-all disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isUpdatingFollowUp ? 'Saving...' : 'Update Follow-up Date'}</span>
                    </button>
                  </div>

                </div>
              )}

              {/* TAB 2: Website Evidence */}
              {activeTab === 'research' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="text-xs text-slate-400">
                    Content scraped from public domain and directory profiles:
                  </div>

                  {lead.research_records && lead.research_records.length > 0 ? (
                    lead.research_records.map((rec) => (
                      <div
                        key={rec.id}
                        className="p-4 rounded-xl bg-[#0c0c10] border border-[#20202a] space-y-2"
                      >
                        <div className="text-[10px] text-slate-500 flex items-center justify-between">
                          <span>Record #{rec.id}</span>
                          <span>Researched: {new Date(rec.researched_at).toLocaleString()}</span>
                        </div>
                        <div className="text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                          {rec.summary || rec.raw_content || 'No text extracted.'}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center text-slate-500">
                      No research evidence records stored for this prospect.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Contacts */}
              {activeTab === 'contacts' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="text-xs text-slate-400">
                    Professional emails located and verified via Hunter.io:
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {lead.contacts && lead.contacts.length > 0 ? (
                      lead.contacts.map((c) => (
                        <div
                          key={c.id}
                          className="p-4 rounded-xl bg-[#0c0c10] border border-[#20202a] space-y-1.5"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-bold text-white text-xs">{c.name}</div>
                              <div className="text-[11px] text-slate-400">{c.job_title || 'Representative'}</div>
                            </div>
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                c.email_status === 'verified'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                              }`}
                            >
                              {c.email_status}
                            </span>
                          </div>

                          <div className="text-slate-300 font-mono text-[11px] select-all pt-1 border-t border-[#1e1e28]">
                            {c.email || 'No email identified'}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 py-12 text-center text-slate-500">
                        No contacts identified for this domain.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: Outreach Drafts */}
              {activeTab === 'drafts' && (
                <div className="space-y-5 animate-fade-in">
                  
                  {/* Draft Generator */}
                  <div className="p-4 rounded-xl bg-[#0c0c10] border border-[#20202a] space-y-3">
                    <h3 className="text-xs font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-[#f95721]" />
                      <span>Generate Personalized Outreach Email with Gemini</span>
                    </h3>
                    <input
                      type="text"
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      placeholder="Optional instructions (e.g. emphasize direct booking or local expertise)..."
                      className="w-full px-3 py-2 rounded-xl bg-[#14141c] border border-[#242432] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#f95721]"
                    />
                    <button
                      onClick={handleGenerateDraft}
                      disabled={drafting}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f95721] hover:bg-[#ea4710] text-white text-xs font-bold shadow transition-all disabled:opacity-50"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${drafting ? 'animate-spin' : ''}`} />
                      <span>{drafting ? 'Drafting with Gemini...' : 'Generate New Outreach Draft'}</span>
                    </button>
                  </div>

                  {/* Drafts List */}
                  <div className="space-y-3">
                    {lead.drafts && lead.drafts.length > 0 ? (
                      lead.drafts.map((draft) => (
                        <div
                          key={draft.id}
                          className="p-4 rounded-xl bg-[#0c0c10] border border-[#20202a] space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white text-xs truncate max-w-md">
                              Subject: {draft.subject}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                draft.status === 'APPROVED'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                              }`}
                            >
                              {draft.status}
                            </span>
                          </div>

                          <div className="p-3 rounded-lg bg-[#14141c] text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">
                            {draft.body}
                          </div>

                          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                            <span>Created: {new Date(draft.created_at).toLocaleDateString()}</span>
                            {draft.status === 'DRAFT' && (
                              <button
                                onClick={() => handleApproveDraft(draft.id)}
                                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow transition-all"
                              >
                                Approve Draft
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-slate-500">
                        No drafts prepared yet. Click "Generate New Outreach Draft" above.
                      </div>
                    )}
                  </div>

                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
};
