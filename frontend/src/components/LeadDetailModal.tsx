import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  Sparkles,
  Users,
  Globe,
  Mail,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import type { LeadDetail } from '../types';
import { api } from '../services/api';

interface LeadDetailModalProps {
  leadId: number | null;
  onClose: () => void;
  onRefreshList?: () => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  leadId,
  onClose,
  onRefreshList,
}) => {
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [drafting, setDrafting] = useState<boolean>(false);
  const [customInstructions, setCustomInstructions] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'ai' | 'research' | 'contacts' | 'drafts'>('ai');

  const fetchDetails = async () => {
    if (!leadId) return;
    try {
      setLoading(true);
      const data = await api.getLead(leadId);
      setLead(data);
    } catch (err: any) {
      alert(`Error loading lead details: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [leadId]);

  if (!leadId) return null;

  const handleReanalyze = async () => {
    try {
      setAnalyzing(true);
      const updated = await api.reanalyzeLead(leadId);
      setLead(updated);
      onRefreshList?.();
    } catch (err: any) {
      alert(`Re-analysis failed: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerateDraft = async () => {
    try {
      setDrafting(true);
      const primaryContact = lead?.contacts?.[0];
      const newDraft = await api.generateDraft(leadId, primaryContact?.id, customInstructions);
      setLead((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          drafts: [newDraft, ...prev.drafts],
        };
      });
      setCustomInstructions('');
      setActiveTab('drafts');
      onRefreshList?.();
    } catch (err: any) {
      alert(`Draft generation failed: ${err.message}`);
    } finally {
      setDrafting(false);
    }
  };

  const handleApproveDraft = async (draftId: number) => {
    try {
      const approved = await api.approveDraft(draftId);
      setLead((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          drafts: prev.drafts.map((d) => (d.id === draftId ? approved : d)),
        };
      });
      onRefreshList?.();
    } catch (err: any) {
      alert(`Could not approve draft: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/40 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white tracking-tight">
                {lead?.company_name || 'Prospect Details'}
              </h2>
              {lead?.status && (
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                    lead.status === 'QUALIFIED'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : lead.status === 'CONTACTED'
                      ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                      : lead.status === 'UNQUALIFIED'
                      ? 'bg-red-500/10 text-red-400 border-red-500/20'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {lead.status}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-400">
              <a
                href={lead?.source_url || `https://${lead?.website}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-brand-400 hover:text-brand-300 font-medium"
              >
                <span>{lead?.website}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <span>•</span>
              <span>{lead?.industry || 'B2B Software'}</span>
              <span>•</span>
              <span>{lead?.location || 'Remote'}</span>
              <span>•</span>
              <span>{lead?.company_size || '10-50'} employees</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/20 px-6">
          {[
            { id: 'ai', label: 'Gemini AI Assessment', icon: Sparkles },
            { id: 'research', label: 'Company Research', icon: Globe },
            { id: 'contacts', label: `Contacts (${lead?.contacts?.length || 0})`, icon: Users },
            { id: 'drafts', label: `Outreach Drafts (${lead?.drafts?.length || 0})`, icon: Mail },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-brand-500 text-brand-400 bg-brand-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="py-20 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-brand-400" />
              <span>Fetching prospect intelligence...</span>
            </div>
          ) : (
            <>
              {/* TAB 1: AI Qualification Assessment */}
              {activeTab === 'ai' && (
                <div className="space-y-5 animate-fade-in">
                  
                  {/* Score & Re-analyze Header */}
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex flex-col items-center justify-center text-white shadow-lg shadow-brand-500/20">
                        <span className="text-xl font-black">{lead?.fit_score ?? '--'}</span>
                        <span className="text-[10px] text-white/80 font-medium">/ 100</span>
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Customer Fit Score
                        </div>
                        <div className="text-sm font-semibold text-slate-200 mt-0.5">
                          {lead?.fit_score && lead.fit_score >= 65
                            ? 'Strong Commercial Fit for Outreach'
                            : 'Moderate or Speculative Alignment'}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleReanalyze}
                      disabled={analyzing}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-xs font-medium text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin text-brand-400' : ''}`} />
                      <span>{analyzing ? 'Analyzing with Gemini...' : 'Re-Evaluate with Gemini'}</span>
                    </button>
                  </div>

                  {/* AI Reasoning */}
                  <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/80 space-y-2">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                      Executive Reasoning
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {lead?.fit_reason || 'No detailed analysis reasoning recorded.'}
                    </p>
                  </div>

                  {/* Strengths & Risks */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Strengths */}
                    <div className="p-4 rounded-2xl bg-slate-950/50 border border-emerald-500/20 space-y-2">
                      <h4 className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Positive Signals & Fit Factors</span>
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {lead?.fit_strengths && lead.fit_strengths.length > 0 ? (
                          lead.fit_strengths.map((str, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-emerald-400 text-sm leading-none">•</span>
                              <span>{str}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-slate-500 italic">No specific strengths flagged.</li>
                        )}
                      </ul>
                    </div>

                    {/* Risks */}
                    <div className="p-4 rounded-2xl bg-slate-950/50 border border-amber-500/20 space-y-2">
                      <h4 className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4" />
                        <span>Risks & Disqualifier Caveats</span>
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {lead?.fit_risks && lead.fit_risks.length > 0 ? (
                          lead.fit_risks.map((risk, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-amber-400 text-sm leading-none">•</span>
                              <span>{risk}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-slate-500 italic">No immediate disqualifiers detected.</li>
                        )}
                      </ul>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 2: Company Research */}
              {activeTab === 'research' && (
                <div className="space-y-4 animate-fade-in">
                  {lead?.research_records && lead.research_records.length > 0 ? (
                    lead.research_records.map((rec) => (
                      <div
                        key={rec.id}
                        className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-200">
                            {rec.summary || 'Website Extracted Profile'}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Scraped: {new Date(rec.researched_at).toLocaleString()}
                          </span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
                          {rec.raw_content || 'No text extracted.'}
                        </div>

                        {rec.source_urls && rec.source_urls.length > 0 && (
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <span>Sources:</span>
                            {rec.source_urls.map((url, i) => (
                              <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-brand-400 hover:underline flex items-center gap-1"
                              >
                                <span>{url}</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center text-xs text-slate-500">
                      No research records found for this company yet.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Contacts */}
              {activeTab === 'contacts' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="text-xs text-slate-400">
                    Contacts discovered via Hunter.io domain search and email verification:
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {lead?.contacts && lead.contacts.length > 0 ? (
                      lead.contacts.map((contact) => (
                        <div
                          key={contact.id}
                          className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2 hover:border-slate-700 transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="text-sm font-semibold text-white">
                                {contact.name}
                              </div>
                              <div className="text-xs text-slate-400">
                                {contact.job_title || 'Decision Maker'}
                              </div>
                            </div>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                                contact.email_status === 'verified'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                              }`}
                            >
                              {contact.email_status}
                            </span>
                          </div>

                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                            <span className="text-slate-300 font-mono select-all">
                              {contact.email || 'No email published'}
                            </span>
                            {contact.confidence_score && (
                              <span className="text-[11px] text-slate-500">
                                {contact.confidence_score}% confidence
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 py-12 text-center text-xs text-slate-500">
                        No contacts identified for this domain yet.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: Outreach Drafts */}
              {activeTab === 'drafts' && (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Draft Generator Form */}
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <h3 className="text-xs font-semibold text-white flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                      Generate Personalized Email Draft with Gemini
                    </h3>
                    <input
                      type="text"
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      placeholder="Optional custom instructions (e.g. mention our new SOC2 compliance or free trial)..."
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
                    />
                    <button
                      onClick={handleGenerateDraft}
                      disabled={drafting}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium shadow-md transition-all disabled:opacity-50"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${drafting ? 'animate-spin' : ''}`} />
                      <span>{drafting ? 'Writing with Gemini...' : 'Generate New Outreach Draft'}</span>
                    </button>
                  </div>

                  {/* Existing Drafts List */}
                  <div className="space-y-4">
                    {lead?.drafts && lead.drafts.length > 0 ? (
                      lead.drafts.map((draft) => (
                        <div
                          key={draft.id}
                          className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-200 truncate max-w-md">
                              Subject: {draft.subject}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                                draft.status === 'APPROVED'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                              }`}
                            >
                              {draft.status}
                            </span>
                          </div>

                          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                            {draft.body}
                          </div>

                          <div className="flex items-center justify-between pt-2 text-[11px] text-slate-400">
                            <span>
                              Created: {new Date(draft.created_at).toLocaleDateString()}
                            </span>
                            {draft.status === 'DRAFT' ? (
                              <button
                                onClick={() => handleApproveDraft(draft.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow transition-all"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Approve Draft</span>
                              </button>
                            ) : (
                              <span className="text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Approved for human sending
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-xs text-slate-500">
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
