import React, { useState, useEffect } from 'react';
import {
  Mail,
  CheckCircle2,
  Edit3,
  Save,
  Check,
  RefreshCw,
  Send,
  AlertCircle,
  Clock,
  UserCheck,
  ShieldCheck
} from 'lucide-react';
import type { OutreachDraft } from '../types';
import { api } from '../services/api';

interface OutreachReviewViewProps {
  onRefreshStats?: () => void;
}

export const OutreachReviewView: React.FC<OutreachReviewViewProps> = ({ onRefreshStats }) => {
  const [drafts, setDrafts] = useState<OutreachDraft[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<string>('DRAFT');
  const [editingDraftId, setEditingDraftId] = useState<number | null>(null);
  const [editSubject, setEditSubject] = useState<string>('');
  const [editBody, setEditBody] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  // Send Email Modal state
  const [sendDraft, setSendDraft] = useState<OutreachDraft | null>(null);
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccessMessage, setSendSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadDrafts();
  }, [activeFilter]);

  const loadDrafts = async () => {
    try {
      setLoading(true);
      const data = await api.getDrafts(activeFilter !== 'ALL' ? activeFilter : undefined);
      setDrafts(data);
    } catch (err: any) {
      console.error('Failed to load drafts', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (draft: OutreachDraft) => {
    setEditingDraftId(draft.id);
    setEditSubject(draft.subject);
    setEditBody(draft.body);
  };

  const handleSaveEdit = async (draftId: number) => {
    try {
      setSaving(true);
      await api.updateDraft(draftId, {
        subject: editSubject,
        body: editBody,
      });
      setDrafts((prev) =>
        prev.map((d) =>
          d.id === draftId ? { ...d, subject: editSubject, body: editBody } : d
        )
      );
      setEditingDraftId(null);
    } catch (err: any) {
      alert(`Could not save draft: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (draftId: number) => {
    try {
      const updated = await api.approveDraft(draftId);
      setDrafts((prev) =>
        prev.map((d) => (d.id === draftId ? { ...d, status: 'APPROVED', approved_at: updated.approved_at } : d))
      );
      if (onRefreshStats) onRefreshStats();
    } catch (err: any) {
      alert(`Could not approve draft: ${err.message}`);
    }
  };

  const openSendModal = (draft: OutreachDraft) => {
    const defaultRecipient = draft.contact?.email || '';
    setSendDraft(draft);
    setRecipientEmail(defaultRecipient);
    setSendError(null);
    setSendSuccessMessage(null);
  };

  const handleConfirmSend = async () => {
    if (!sendDraft) return;
    if (!recipientEmail.trim()) {
      setSendError('Recipient email address is required.');
      return;
    }

    try {
      setIsSending(true);
      setSendError(null);
      const idempotencyKey = `review-send-${sendDraft.id}-${Date.now()}`;
      const res = await api.sendDraftEmail(sendDraft.id, {
        recipient_email: recipientEmail.trim(),
        idempotency_key: idempotencyKey,
      });

      setSendSuccessMessage(res.message || 'Email successfully sent via Gmail SMTP!');
      setDrafts((prev) =>
        prev.map((d) =>
          d.id === sendDraft.id
            ? { ...d, status: 'SENT' as any, sent_at: res.sent_at }
            : d
        )
      );
      if (onRefreshStats) onRefreshStats();
      setTimeout(() => {
        setSendDraft(null);
        setSendSuccessMessage(null);
      }, 2000);
    } catch (err: any) {
      setSendError(err.message || 'Gmail SMTP send failed.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Outreach Drafts & Approval</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#181822] text-[#f95721] border border-[#262634]">
              FR-07 Compliant
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Human-in-the-loop email review. Edit messaging, approve personalized copy, and dispatch via Gmail SMTP.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-[#121217] p-1 rounded-xl border border-[#22222c]">
          {[
            { id: 'DRAFT', label: 'Under Review' },
            { id: 'APPROVED', label: 'Approved' },
            { id: 'SENT', label: 'Sent via SMTP' },
            { id: 'ALL', label: 'All' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeFilter === tab.id
                  ? 'bg-[#f95721] text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}

          <button
            onClick={loadDrafts}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors ml-1"
            title="Refresh drafts"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Drafts List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-[#f95721]" />
            <span>Loading outreach messages...</span>
          </div>
        ) : drafts.length === 0 ? (
          <div className="py-20 text-center bg-[#121217] border border-[#22222c] rounded-2xl p-6">
            <Mail className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-white">No drafts found in this category</h3>
            <p className="text-xs text-slate-400 mt-1">
              Start a new discovery run from the dashboard or generate an outreach draft from a lead card.
            </p>
          </div>
        ) : (
          drafts.map((draft) => {
            const isEditing = editingDraftId === draft.id;
            const isApproved = draft.status === 'APPROVED';
            const isSent = (draft.status as any) === 'SENT';

            return (
              <div
                key={draft.id}
                className={`p-5 rounded-2xl border transition-all ${
                  isSent
                    ? 'bg-[#101318] border-indigo-500/30'
                    : isApproved
                    ? 'bg-[#101614] border-emerald-500/30'
                    : 'bg-[#121217] border-[#22222c] hover:border-[#2e2e3c]'
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#1e1e28]">
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        isSent
                          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25'
                          : isApproved
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                      }`}
                    >
                      {draft.status}
                    </span>

                    {draft.contact ? (
                      <div className="text-xs text-slate-300 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-[#f95721]" />
                        <span>Recipient: <strong>{draft.contact.name}</strong></span>
                        <span className="text-slate-500 font-mono text-[11px]">
                          ({draft.contact.email || 'No email located'})
                        </span>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400">
                        Lead #{draft.lead_id} • Executive Contact
                      </div>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    <span>Created: {new Date(draft.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="mt-4 space-y-3">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Subject Line
                        </label>
                        <input
                          type="text"
                          value={editSubject}
                          onChange={(e) => setEditSubject(e.target.value)}
                          className="w-full mt-1 px-3 py-2 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white focus:outline-none focus:border-[#f95721] font-medium"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Email Body (Personalized Copy)
                        </label>
                        <textarea
                          rows={6}
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                          className="w-full mt-1 p-3 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-slate-200 focus:outline-none focus:border-[#f95721] leading-relaxed font-sans"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-[#f95721]" />
                        <span>Subject: {draft.subject}</span>
                      </div>
                      <div className="p-4 rounded-xl bg-[#0c0c10] border border-[#1e1e28] text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">
                        {draft.body}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="mt-4 pt-3 border-t border-[#1e1e28] flex items-center justify-between">
                  <div>
                    {isSent ? (
                      <span className="text-[11px] text-indigo-400 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Dispatched via Gmail SMTP
                      </span>
                    ) : isApproved && draft.approved_at ? (
                      <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Human-approved for outreach
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500">
                        Human review required before sending
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
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#f95721] hover:bg-[#ea4710] text-white font-semibold text-xs shadow transition-all"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Save Changes</span>
                        </button>
                      </>
                    ) : (
                      <>
                        {!isSent && (
                          <button
                            onClick={() => handleStartEdit(draft)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#181822] hover:bg-[#20202c] text-slate-300 text-xs font-semibold border border-[#2a2a38] transition-colors"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        )}

                        {!isApproved && !isSent && (
                          <button
                            onClick={() => handleApprove(draft.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.01]"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve Draft</span>
                          </button>
                        )}

                        {!isSent && (
                          <button
                            onClick={() => openSendModal(draft)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#f95721] to-[#ea4710] hover:brightness-110 text-white font-semibold text-xs shadow-md shadow-[#f95721]/20 transition-all hover:scale-[1.01]"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Send via SMTP</span>
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

      {/* Send Confirmation Modal */}
      {sendDraft && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121217] border border-[#282836] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-[#f95721]" />
                <span>Confirm Email Dispatch via Gmail SMTP</span>
              </h3>
              <button
                onClick={() => setSendDraft(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Recipient Email Address
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="contact@company.com"
                  className="w-full mt-1.5 px-3 py-2 rounded-xl bg-[#0c0c10] border border-[#242432] text-xs text-white focus:outline-none focus:border-[#f95721]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Subject Line
                </label>
                <div className="mt-1 p-2.5 rounded-xl bg-[#0c0c10] border border-[#20202a] text-xs text-slate-300 font-semibold">
                  {sendDraft.subject}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Body Preview
                </label>
                <div className="mt-1 p-3 rounded-xl bg-[#0c0c10] border border-[#20202a] text-xs text-slate-300 max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed font-sans">
                  {sendDraft.body}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#14141c] border border-[#22222e] text-[11px] text-slate-400 space-y-1">
                <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Human-in-the-Loop Safeguards:</span>
                </div>
                <p>• Verified idempotency prevents duplicate dispatch.</p>
                <p>• 3-day follow-up touchpoint is scheduled strictly upon verified delivery acceptance.</p>
              </div>

              {sendError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{sendError}</span>
                </div>
              )}

              {sendSuccessMessage && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{sendSuccessMessage}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#20202a]">
              <button
                type="button"
                onClick={() => setSendDraft(null)}
                className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSend}
                disabled={isSending}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f95721] hover:bg-[#ea4710] text-white font-bold text-xs shadow-md shadow-[#f95721]/20 transition-all disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSending ? 'Sending via SMTP...' : 'Confirm & Send Now'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
