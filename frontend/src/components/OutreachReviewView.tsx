import React, { useState, useEffect } from 'react';
import {
  Mail,
  CheckCircle2,
  Edit3,
  Save,
  Check,
  ShieldCheck,
  RefreshCw,
  Clock,
  UserCheck
} from 'lucide-react';
import type { OutreachDraft } from '../types';
import { api } from '../services/api';

export const OutreachReviewView: React.FC = () => {
  const [drafts, setDrafts] = useState<OutreachDraft[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('DRAFT');
  const [editingDraftId, setEditingDraftId] = useState<number | null>(null);
  const [editSubject, setEditSubject] = useState<string>('');
  const [editBody, setEditBody] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const loadDrafts = async () => {
    try {
      setLoading(true);
      const data = await api.getDrafts(statusFilter === 'ALL' ? undefined : statusFilter);
      setDrafts(data);
    } catch (err: any) {
      alert(`Failed to load drafts: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrafts();
  }, [statusFilter]);

  const handleStartEdit = (draft: OutreachDraft) => {
    setEditingDraftId(draft.id);
    setEditSubject(draft.subject);
    setEditBody(draft.body);
  };

  const handleSaveEdit = async (draftId: number) => {
    try {
      setSaving(true);
      const updated = await api.updateDraft(draftId, {
        subject: editSubject,
        body: editBody,
      });
      setDrafts((prev) => prev.map((d) => (d.id === draftId ? updated : d)));
      setEditingDraftId(null);
    } catch (err: any) {
      alert(`Failed to save draft edits: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (draftId: number) => {
    try {
      const approved = await api.approveDraft(draftId);
      setDrafts((prev) =>
        prev.map((d) => (d.id === draftId ? approved : d))
      );
    } catch (err: any) {
      alert(`Approval failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Human Oversight Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3.5">
        <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-400 shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">
            Human-in-the-Loop Outreach Approval
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
            LeadFlow generates evidence-based personalized cold emails using Gemini. To prevent unintended communications, emails are stored as drafts and will never be dispatched autonomously. Review, edit, and approve each message before syncing.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          {[
            { id: 'DRAFT', label: 'Pending Review' },
            { id: 'APPROVED', label: 'Approved' },
            { id: 'ALL', label: 'All Drafts' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg font-medium transition-all ${
                statusFilter === tab.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={loadDrafts}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          title="Refresh drafts"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Drafts List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-brand-400" />
            <span>Loading outreach messages...</span>
          </div>
        ) : drafts.length === 0 ? (
          <div className="py-20 text-center bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <Mail className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-white">No drafts found in this category</h3>
            <p className="text-xs text-slate-400 mt-1">
              Start a new discovery run from the dashboard or generate a draft from a lead detail view.
            </p>
          </div>
        ) : (
          drafts.map((draft) => {
            const isEditing = editingDraftId === draft.id;
            const isApproved = draft.status === 'APPROVED';

            return (
              <div
                key={draft.id}
                className={`p-6 rounded-2xl border transition-all ${
                  isApproved
                    ? 'bg-slate-900/60 border-emerald-500/20'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        isApproved
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                      }`}
                    >
                      {draft.status}
                    </span>

                    {draft.contact ? (
                      <div className="text-xs text-slate-300 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-brand-400" />
                        <span>Recipient: <strong>{draft.contact.name}</strong></span>
                        <span className="text-slate-500">({draft.contact.email || 'No email'})</span>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400">
                        Lead #{draft.lead_id} • General Decision Maker
                      </div>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    <span>Created: {new Date(draft.created_at).toLocaleString()}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="mt-4 space-y-3">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 uppercase">
                          Subject
                        </label>
                        <input
                          type="text"
                          value={editSubject}
                          onChange={(e) => setEditSubject(e.target.value)}
                          className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-brand-500 font-medium"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 uppercase">
                          Email Body
                        </label>
                        <textarea
                          rows={6}
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                          className="w-full mt-1 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-brand-500 font-mono leading-relaxed"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs font-bold text-white mb-2">
                        Subject: {draft.subject}
                      </div>
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">
                        {draft.body}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div>
                    {isApproved && draft.approved_at && (
                      <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approved at {new Date(draft.approved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => setEditingDraftId(null)}
                          className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveEdit(draft.id)}
                          disabled={saving}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs shadow transition-all"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Save Changes</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleStartEdit(draft)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        {!isApproved && (
                          <button
                            onClick={() => handleApprove(draft.id)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02]"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve Outreach</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
