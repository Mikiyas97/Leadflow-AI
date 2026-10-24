import React, { useState, useRef, useEffect } from 'react';
import {
  Flame,
  Send,
  RotateCcw,
  User,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  Mail,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  X,
  Clock,
  Edit3,
  Building2,
  MapPin,
  Zap,
  History,
  CheckCheck,
  AlertTriangle,
  XCircle,
  Globe,
  Search,
  KeyRound
} from 'lucide-react';
import type { ChatMessage, PipelineLead, ActivityLog } from '../types';
import { api } from '../services/api';

const QUICK_PROMPTS = [
  "SaaS companies in the United States that may need AI automation",
  "Find 5 software companies without an official website and draft website-development emails",
  "Find B2B fintech startups in California that may need AI automation",
  "Approve all pending outreach drafts",
  "Show pipeline activity audit log",
];

interface SendEmailModalState {
  isOpen: boolean;
  leadId: number;
  draftId: number;
  companyName: string;
  subject: string;
  body: string;
  recipientEmail: string;
  isSending: boolean;
  sendError: string | null;
}

export const ChatbotUI: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // In-chat editing state for outreach drafts
  const [editingDraftId, setEditingDraftId] = useState<number | null>(null);
  const [editSubject, setEditSubject] = useState<string>('');
  const [editBody, setEditBody] = useState<string>('');
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);

  // Expanded intel toggle per lead
  const [expandedResearch, setExpandedResearch] = useState<Record<number, boolean>>({});

  // Follow-up management state per lead
  const [managingFollowUpLeadId, setManagingFollowUpLeadId] = useState<number | null>(null);
  const [followUpNotesInput, setFollowUpNotesInput] = useState<string>('');
  const [followUpActionType, setFollowUpActionType] = useState<string>('Email Check-in');
  const [isUpdatingFollowUp, setIsUpdatingFollowUp] = useState<boolean>(false);

  // Send Email Modal state (Human-in-the-loop SMTP review)
  const [sendModal, setSendModal] = useState<SendEmailModalState | null>(null);

  // Test SMTP Modal state
  const [isTestSmtpOpen, setIsTestSmtpOpen] = useState<boolean>(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState<string>('');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState<boolean>(false);
  const [testEmailFeedback, setTestEmailFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Activity Log Drawer state
  const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState<boolean>(false);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    loadActivityLogs();
  }, []);

  const loadActivityLogs = async () => {
    try {
      setIsLoadingLogs(true);
      const logs = await api.getActivityLogs(30);
      setActivityLogs(logs);
    } catch {
      // ignore
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const history = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await api.sendChat(history);

      const agentMessage: ChatMessage = {
        id: `agent-${Date.now()}`,
        role: 'assistant',
        content: response.content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        parsed_criteria: response.parsed_criteria,
        pipeline_leads: response.pipeline_leads as PipelineLead[] | undefined,
        qualified_count: response.qualified_count,
        total_candidates: response.total_candidates,
      };

      setMessages((prev) => [...prev, agentMessage]);
      loadActivityLogs();
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Connection error: ${err.message || 'Agent backend unavailable'}. Please verify that the server is running.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleResearch = (leadId: number) => {
    setExpandedResearch((prev) => ({
      ...prev,
      [leadId]: !prev[leadId],
    }));
  };

  const handleStartEditDraft = (draft: { id: number; subject: string; body: string }) => {
    setEditingDraftId(draft.id);
    setEditSubject(draft.subject);
    setEditBody(draft.body);
  };

  const handleSaveDraftEdit = async (messageId: string, leadId: number, draftId: number) => {
    try {
      setIsSavingDraft(true);
      await api.updateDraft(draftId, {
        subject: editSubject,
        body: editBody,
      });

      // Update message state
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId || !msg.pipeline_leads) return msg;
          return {
            ...msg,
            pipeline_leads: msg.pipeline_leads.map((l) => {
              if (l.id !== leadId || !l.draft) return l;
              return {
                ...l,
                draft: {
                  ...l.draft,
                  subject: editSubject,
                  body: editBody,
                },
              };
            }),
          };
        })
      );
      setEditingDraftId(null);
      loadActivityLogs();
    } catch (err: any) {
      alert(`Could not save draft: ${err.message}`);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleApproveDraft = async (messageId: string, leadId: number, draftId: number) => {
    try {
      await api.approveDraft(draftId);

      // Update message state in-place
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId || !msg.pipeline_leads) return msg;
          return {
            ...msg,
            pipeline_leads: msg.pipeline_leads.map((l) => {
              if (l.id !== leadId || !l.draft) return l;
              return {
                ...l,
                draft: {
                  ...l.draft,
                  status: 'APPROVED',
                  approved_at: new Date().toISOString(),
                },
              };
            }),
          };
        })
      );
      loadActivityLogs();
    } catch (err: any) {
      alert(`Could not approve draft: ${err.message}`);
    }
  };

  // Open the Human-in-the-Loop Send Confirmation Modal
  const openSendModal = (lead: PipelineLead) => {
    if (!lead.draft) return;
    const recipient = lead.contacts?.[0]?.email || '';
    setSendModal({
      isOpen: true,
      leadId: lead.id,
      draftId: lead.draft.id,
      companyName: lead.company_name,
      subject: lead.draft.subject,
      body: lead.draft.body,
      recipientEmail: recipient,
      isSending: false,
      sendError: null,
    });
  };

  // Confirm sending approved draft via Gmail SMTP
  const handleConfirmSendEmail = async () => {
    if (!sendModal) return;
    const recipient = sendModal.recipientEmail.trim();
    if (!recipient) {
      setSendModal((prev) => (prev ? { ...prev, sendError: 'Recipient email address is required.' } : null));
      return;
    }

    setSendModal((prev) => (prev ? { ...prev, isSending: true, sendError: null } : null));
    const idempotencyKey = `send-draft-${sendModal.draftId}-${Date.now()}`;

    try {
      const res = await api.sendDraftEmail(sendModal.draftId, {
        recipient_email: recipient,
        idempotency_key: idempotencyKey,
      });

      // Update lead state across messages
      setMessages((prev) =>
        prev.map((msg) => {
          if (!msg.pipeline_leads) return msg;
          return {
            ...msg,
            pipeline_leads: msg.pipeline_leads.map((l) => {
              if (l.id !== sendModal.leadId) return l;
              return {
                ...l,
                follow_up_date: res.follow_up_date || '3 days from now',
                follow_up_status: 'SCHEDULED',
                follow_up_notes: `Initial follow-up scheduled following confirmed email dispatch to ${res.recipient}.`,
                draft: l.draft
                  ? {
                    ...l.draft,
                    status: 'SENT',
                    sent_at: res.sent_at,
                    send_error: null,
                  }
                  : null,
              };
            }),
          };
        })
      );

      setSendModal(null);
      loadActivityLogs();
    } catch (err: any) {
      setSendModal((prev) =>
        prev
          ? {
            ...prev,
            isSending: false,
            sendError: err.message || 'SMTP send failed. Please verify credentials.',
          }
          : null
      );
    }
  };

  // Send Test Email via Gmail SMTP
  const handleRunTestEmail = async () => {
    if (!testEmailRecipient.trim()) {
      setTestEmailFeedback({ success: false, message: 'Please enter a valid recipient address.' });
      return;
    }

    setIsSendingTestEmail(true);
    setTestEmailFeedback(null);
    try {
      const res = await api.sendTestEmail(testEmailRecipient.trim());
      setTestEmailFeedback({ success: true, message: res.message });
      loadActivityLogs();
    } catch (err: any) {
      setTestEmailFeedback({
        success: false,
        message: err.message || 'SMTP connection failed. Check your GMAIL_USER and GMAIL_APP_PASSWORD.',
      });
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const handleRescheduleFollowUp = async (
    messageId: string,
    leadId: number,
    days?: number,
    customDate?: string,
    notes?: string,
    status?: string
  ) => {
    try {
      setIsUpdatingFollowUp(true);
      const res = await api.rescheduleFollowUp(leadId, {
        days,
        date: customDate,
        notes: notes || followUpNotesInput || undefined,
        action_type: followUpActionType,
        status,
      });

      // Update message state
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId || !msg.pipeline_leads) return msg;
          return {
            ...msg,
            pipeline_leads: msg.pipeline_leads.map((l) => {
              if (l.id !== leadId) return l;
              return {
                ...l,
                follow_up_date: res.follow_up_date,
                follow_up_notes: res.follow_up_notes,
                follow_up_status: res.follow_up_status || l.follow_up_status,
              };
            }),
          };
        })
      );
      setManagingFollowUpLeadId(null);
      setFollowUpNotesInput('');
      loadActivityLogs();
    } catch (err: any) {
      alert(`Could not reschedule follow-up: ${err.message}`);
    } finally {
      setIsUpdatingFollowUp(false);
    }
  };

  const handleRegenerateDraftPrompt = (companyName: string, promptInstruction: string) => {
    handleSend(`Please rewrite the email draft for ${companyName}: ${promptInstruction}`);
  };

  return (
    <div className="relative min-h-screen bg-[#080809] bg-grid-lines text-slate-100 flex flex-col font-sans selection:bg-[#f95721] selection:text-white">
      {/* Main Chat Interface */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 flex flex-col justify-between">
        {/* Messages Feed or Empty State */}
        <div className="flex-1 overflow-y-auto space-y-6 mb-6 pr-1 min-h-[50vh]">
          {messages.length === 0 ? (
            /* Empty State */
            <div className="h-full flex flex-col items-center justify-center text-center py-8 animate-fade-in">
              <div className="h-14 w-14 rounded-2xl bg-[#f95721]/15 border border-[#f95721]/30 flex items-center justify-center text-[#f95721] mb-4 shadow-xl shadow-[#f95721]/15">
                <Flame className="w-7 h-7 fill-current" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Autonomous B2B Lead Operations
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-lg leading-relaxed">
                General-purpose sales operations pipeline: Dynamic criteria parsing ➔ Firecrawl web research ➔ Gemini qualification gates ➔ Hunter.io contact discovery ➔ Gemini email drafting ➔ Human review & Gmail SMTP sending.
              </p>

              {/* Featured Starter Prompts */}
              <div className="mt-6 w-full max-w-xl space-y-2.5">
                <button
                  onClick={() => handleSend("SaaS companies in the United States that may need AI automation")}
                  className="w-full p-3.5 rounded-xl bg-gradient-to-r from-[#17171d] via-[#1c1c24] to-[#17171d] hover:border-[#f95721]/50 border border-[#2b2b38] text-left transition-all group shadow-lg flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#f95721] text-white">
                        Standard Workflow
                      </span>
                      <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCheck className="w-3 h-3" /> US B2B SaaS
                      </span>
                    </div>
                    <div className="text-sm font-bold text-white group-hover:text-[#f95721] transition-colors">
                      "SaaS companies in the United States that may need AI automation"
                    </div>
                  </div>
                  <div className="h-8 w-8 rounded-lg bg-[#f95721]/20 border border-[#f95721]/40 flex items-center justify-center text-[#f95721] shrink-0 ml-3">
                    <Zap className="w-4 h-4 fill-current" />
                  </div>
                </button>

                <button
                  onClick={() => handleSend("Find 5 software companies without an official website and draft website-development emails")}
                  className="w-full p-3.5 rounded-xl bg-[#121217] hover:bg-[#181820] hover:border-amber-500/40 border border-[#252532] text-left transition-all group shadow-md flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Website Pitch Workflow
                      </span>
                      <span className="text-[11px] text-amber-400 font-medium">No Official Website</span>
                    </div>
                    <div className="text-xs sm:text-sm font-semibold text-slate-200 group-hover:text-amber-300 transition-colors">
                      "Find 5 software companies without an official website and draft website-development emails"
                    </div>
                  </div>
                  <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 ml-3">
                    <Globe className="w-4 h-4" />
                  </div>
                </button>

                <button
                  onClick={() => handleSend("Find B2B fintech startups in California that may need AI automation")}
                  className="w-full p-3.5 rounded-xl bg-[#121217] hover:bg-[#181820] hover:border-blue-500/40 border border-[#252532] text-left transition-all group shadow-md flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        Strict Geography Workflow
                      </span>
                      <span className="text-[11px] text-blue-400 font-medium">California, USA</span>
                    </div>
                    <div className="text-xs sm:text-sm font-semibold text-slate-200 group-hover:text-blue-300 transition-colors">
                      "Find B2B fintech startups in California that may need AI automation"
                    </div>
                  </div>
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 ml-3">
                    <MapPin className="w-4 h-4" />
                  </div>
                </button>

                <div className="grid grid-cols-2 gap-2 pt-1 text-left">
                  {QUICK_PROMPTS.slice(3).map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(prompt)}
                      className="p-2 rounded-lg bg-[#101014] hover:bg-[#16161d] border border-[#202028] text-xs text-slate-400 hover:text-white transition-all flex items-center justify-between group"
                    >
                      <span className="truncate">{prompt}</span>
                      <Sparkles className="w-3 h-3 text-slate-500 group-hover:text-[#f95721] shrink-0 ml-1.5 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Active Messages History */
            messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
                >
                  {!isUser && (
                    <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-[#f95721] to-[#ff7d47] flex items-center justify-center text-white shrink-0 shadow-md mt-0.5">
                      <Flame className="w-4 h-4 fill-current" />
                    </div>
                  )}

                  <div
                    className={`relative w-full ${isUser ? 'max-w-xl' : 'max-w-3xl'} px-4 py-3.5 rounded-2xl text-xs leading-relaxed ${isUser
                        ? 'bg-[#1c1c24] text-slate-100 border border-[#2d2d38] rounded-tr-sm shadow-md'
                        : 'bg-[#121216] text-slate-200 border border-[#24242e] rounded-tl-sm shadow-md'
                      }`}
                  >
                    {/* Content text */}
                    <div className="whitespace-pre-wrap font-sans space-y-2 text-slate-200 leading-relaxed">
                      {msg.content}
                    </div>

                    {/* Criteria Banner (shown when parsed_criteria exists) */}
                    {msg.parsed_criteria && (
                      <div className="mt-3.5 mb-2 bg-[#0c0c10] border border-[#242432] p-3 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <Search className="w-3.5 h-3.5 text-[#f95721]" />
                            <span>Parsed Criteria & Active Qualification Rules</span>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#181822] text-slate-300 border border-[#2a2a38]">
                            Exact Criteria Preserved
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                          <div className="p-2 rounded-lg bg-[#14141b] border border-[#20202a]">
                            <div className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Target Location</div>
                            <div className="text-white font-medium flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-[#f95721] shrink-0" />
                              <span className="truncate">{msg.parsed_criteria.location}</span>
                            </div>
                          </div>
                          <div className="p-2 rounded-lg bg-[#14141b] border border-[#20202a]">
                            <div className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Target Industry</div>
                            <div className="text-white font-medium flex items-center gap-1 mt-0.5">
                              <Building2 className="w-3 h-3 text-blue-400 shrink-0" />
                              <span className="truncate">{msg.parsed_criteria.industry}</span>
                            </div>
                          </div>
                          <div className="p-2 rounded-lg bg-[#14141b] border border-[#20202a]">
                            <div className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Target Quantity</div>
                            <div className="text-white font-medium flex items-center gap-1 mt-0.5">
                              <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                              <span>{msg.parsed_criteria.target_quantity} Candidates</span>
                            </div>
                          </div>
                          <div className="p-2 rounded-lg bg-[#14141b] border border-[#20202a]">
                            <div className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Service Pitch</div>
                            <div className="text-white font-medium flex items-center gap-1 mt-0.5">
                              <Zap className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span className="truncate">{msg.parsed_criteria.service_offered}</span>
                            </div>
                          </div>
                        </div>

                        {msg.parsed_criteria.require_no_website && (
                          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[10px]">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                            <span>Special Rule: Specifically qualifying candidates with <strong>no official website</strong> to pitch website development.</span>
                          </div>
                        )}

                        {msg.qualified_count !== undefined && (
                          <div className="flex items-center justify-between text-[11px] pt-1 text-slate-400 border-t border-[#1b1b24]">
                            <span>
                              Evaluated Candidates: <strong className="text-white">{msg.total_candidates ?? msg.pipeline_leads?.length ?? 0}</strong>
                            </span>
                            <span className={msg.qualified_count > 0 ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
                              {msg.qualified_count} Qualified (Score ≥ 65 & Geography Verified)
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 8-Step Pipeline Stepper Banner */}
                    {msg.pipeline_leads && msg.pipeline_leads.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-[#22222e]">
                        <div className="mb-4 bg-[#0d0d10] p-3 rounded-xl border border-[#1f1f28]">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-[#f95721]" />
                              Pipeline Workflow Execution
                            </span>
                            <span className="text-emerald-400 font-mono">COMPLETE</span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
                            <div className="p-1.5 rounded-lg bg-[#15151c] border border-emerald-500/20 text-slate-300 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="truncate">1. Criteria Parsed</span>
                            </div>
                            <div className="p-1.5 rounded-lg bg-[#15151c] border border-emerald-500/20 text-slate-300 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="truncate">2. Firecrawl Discovery</span>
                            </div>
                            <div className="p-1.5 rounded-lg bg-[#15151c] border border-emerald-500/20 text-slate-300 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="truncate">3. Website Intel</span>
                            </div>
                            <div className="p-1.5 rounded-lg bg-[#15151c] border border-emerald-500/20 text-slate-300 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="truncate">4. Gemini Scored</span>
                            </div>
                            <div className="p-1.5 rounded-lg bg-[#15151c] border border-emerald-500/20 text-slate-300 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="truncate">5. Hunter.io Lookup</span>
                            </div>
                            <div className="p-1.5 rounded-lg bg-[#15151c] border border-emerald-500/20 text-slate-300 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="truncate">6. Outreach Drafted</span>
                            </div>
                            <div className="p-1.5 rounded-lg bg-[#15151c] border border-amber-500/30 text-amber-300 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span className="truncate">7. Human Review</span>
                            </div>
                            <div className="p-1.5 rounded-lg bg-[#15151c] border border-blue-500/30 text-blue-300 flex items-center gap-1.5">
                              <Send className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              <span className="truncate">8. Gmail SMTP Send</span>
                            </div>
                          </div>
                        </div>

                        {/* Lead Cards List */}
                        <div className="space-y-5">
                          {msg.pipeline_leads.map((lead, idx) => {
                            const isDisqualified =
                              lead.qualification_status === 'UNQUALIFIED' ||
                              lead.qualification_status === 'REJECTED_MISMATCH' ||
                              lead.fit_score < 65;

                            const isApproved = lead.draft?.status === 'APPROVED';
                            const isSent = lead.draft?.status === 'SENT';
                            const isFailed = lead.draft?.status === 'FAILED';
                            const isEditing = editingDraftId === lead.draft?.id;
                            const isManagingFollowUp = managingFollowUpLeadId === lead.id;
                            const isResearchOpen = !!expandedResearch[lead.id];

                            if (isDisqualified) {
                              /* DISQUALIFIED / REJECTED LEAD CARD */
                              return (
                                <div
                                  key={lead.id}
                                  className="rounded-2xl bg-[#130f11] border border-rose-900/40 p-4 sm:p-5 space-y-3.5 shadow-xl relative overflow-hidden"
                                >
                                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-rose-900/30 pb-3">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                          PROSPECT #{idx + 1} • DISQUALIFIED
                                        </span>
                                        <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                                          <Building2 className="w-4 h-4 text-slate-400" />
                                          {lead.company_name}
                                        </h3>
                                      </div>

                                      <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                                        <span className="font-mono text-slate-300">{lead.website || 'No website'}</span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                          <MapPin className="w-3 h-3 text-rose-400" />
                                          {lead.location || 'Unknown Location'}
                                        </span>
                                        <span>•</span>
                                        <span>{lead.industry || 'Unknown Industry'}</span>
                                      </div>
                                    </div>

                                    <div className="text-right">
                                      <div className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30">
                                        <XCircle className="w-3.5 h-3.5 text-rose-400" />
                                        <span>{lead.fit_score}/100 REJECTED</span>
                                      </div>
                                      <div className="text-[10px] text-rose-400/80 mt-1">
                                        Failed Qualification Gates
                                      </div>
                                    </div>
                                  </div>

                                  {/* Rejection Reason */}
                                  <div className="p-3 rounded-xl bg-[#1b1418] border border-rose-950/60 text-[11px] space-y-1.5">
                                    <div className="font-bold text-rose-300 uppercase text-[10px] flex items-center gap-1.5">
                                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                                      <span>Qualification Gate Failure Analysis</span>
                                    </div>
                                    <p className="text-slate-300 leading-relaxed font-sans">
                                      {lead.fit_reason || 'Candidate did not satisfy mandatory geography or fit thresholds.'}
                                    </p>
                                    {lead.fit_risks && lead.fit_risks.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5 pt-1">
                                        {lead.fit_risks.map((risk, rIdx) => (
                                          <span
                                            key={rIdx}
                                            className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/20"
                                          >
                                            ✕ {risk}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* Outreach Skipped Banner */}
                                  <div className="p-2.5 rounded-xl bg-[#171216] border border-rose-900/30 text-rose-300/80 text-[11px] flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                                      Contact discovery, email drafting, and follow-up scheduling skipped for unqualified candidate.
                                    </span>
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-400">
                                      Gated Out
                                    </span>
                                  </div>
                                </div>
                              );
                            }

                            /* QUALIFIED LEAD CARD */
                            return (
                              <div
                                key={lead.id}
                                className="rounded-2xl bg-[#16161c] border border-[#2b2b36] p-4 sm:p-5 space-y-4 shadow-xl"
                              >
                                {/* Step 2: Company Discovery Header */}
                                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#252532] pb-3">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#f95721]/20 text-[#f95721] border border-[#f95721]/30">
                                        PROSPECT #{idx + 1}
                                      </span>
                                      <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                                        <Building2 className="w-4 h-4 text-slate-400" />
                                        {lead.company_name}
                                      </h3>

                                      {/* Website Status Badge */}
                                      {lead.website_status === 'NO_OFFICIAL_WEBSITE_FOUND' ? (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                                          No Official Website Found
                                        </span>
                                      ) : lead.website_status === 'WEBSITE_STATUS_UNCERTAIN' ? (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-700/50 text-slate-300 border border-slate-600 flex items-center gap-1">
                                          <Globe className="w-3 h-3 text-slate-400" />
                                          Website Status Uncertain
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                          <Check className="w-3 h-3 text-emerald-400" />
                                          Official Website Verified
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                                      {lead.website ? (
                                        <a
                                          href={`https://${lead.website}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-1 text-[#f95721] hover:underline font-mono"
                                        >
                                          <span>{lead.website}</span>
                                          <ExternalLink className="w-3 h-3" />
                                        </a>
                                      ) : (
                                        <span className="text-amber-400 italic">No official domain</span>
                                      )}
                                      <span>•</span>
                                      <span className="flex items-center gap-1">
                                        <MapPin className="w-3 h-3 text-slate-500" />
                                        {lead.location || 'Target Location'}
                                      </span>
                                      <span>•</span>
                                      <span className="text-slate-300">{lead.industry || 'B2B'}</span>
                                    </div>

                                    {lead.website_evidence && (
                                      <div className="text-[10px] text-slate-400 mt-1 italic">
                                        {lead.website_evidence}
                                      </div>
                                    )}
                                  </div>

                                  {/* Gemini Fit Score Gauge */}
                                  <div className="text-right">
                                    <div className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm">
                                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                      <span>{lead.fit_score}/100 QUALIFIED</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-1">
                                      Google Gemini Fit Score
                                    </div>
                                  </div>
                                </div>

                                {/* Step 3: Firecrawl Website Research */}
                                <div className="bg-[#101014] rounded-xl p-3 border border-[#20202a] text-[11px] text-slate-300 space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                                      <Flame className="w-3.5 h-3.5 text-[#f95721]" />
                                      <span>Step 3 • Firecrawl Website Intel Extraction</span>
                                    </div>
                                    <button
                                      onClick={() => toggleResearch(lead.id)}
                                      className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                                    >
                                      <span>{isResearchOpen ? 'Hide Full Intel' : 'View Extracted Intel'}</span>
                                      {isResearchOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                    </button>
                                  </div>

                                  <p className="text-slate-300 font-sans leading-relaxed">
                                    {lead.research_summary}
                                  </p>

                                  {isResearchOpen && (
                                    <div className="mt-2 pt-2 border-t border-[#1c1c24] text-[10px] text-slate-400 bg-[#0c0c0e] p-2.5 rounded-lg space-y-1 font-mono">
                                      <div className="text-emerald-400 font-sans font-semibold">Firecrawl Markdown Intel Summary:</div>
                                      <div>Primary Target: Evaluated against criteria and web presence signals.</div>
                                      <div>Source Verified: {lead.website ? `https://${lead.website}` : 'Online Directory Search'}</div>
                                    </div>
                                  )}
                                </div>

                                {/* Step 4: Gemini Fit Assessment & Key Strengths */}
                                {lead.fit_reason && (
                                  <div className="bg-[#121217] rounded-xl p-3 border border-[#242430] space-y-2">
                                    <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                                      <Sparkles className="w-3.5 h-3.5 text-[#f95721]" />
                                      <span>Step 4 • Gemini Customer-Fit Assessment</span>
                                    </div>
                                    <p className="text-[11px] text-slate-200 leading-relaxed font-sans">
                                      {lead.fit_reason}
                                    </p>

                                    {lead.fit_strengths && lead.fit_strengths.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5 pt-1">
                                        {lead.fit_strengths.map((str, sIdx) => (
                                          <span
                                            key={sIdx}
                                            className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                                          >
                                            ✓ {str}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Step 5: Hunter.io Discovered Contacts */}
                                <div className="bg-[#101014] rounded-xl p-3 border border-[#20202a] space-y-2 text-[11px]">
                                  <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5 text-[#f95721]" />
                                    <span>Step 5 • Hunter.io Contact Discovery</span>
                                  </div>

                                  {lead.contacts && lead.contacts.length > 0 && lead.contacts[0].email ? (
                                    <div className="flex flex-wrap items-center justify-between gap-2 bg-[#15151c] p-2.5 rounded-lg border border-[#252532]">
                                      <div>
                                        <div className="font-bold text-white text-xs">
                                          {lead.contacts[0].name}
                                        </div>
                                        <div className="text-[11px] text-slate-400">
                                          {lead.contacts[0].job_title || 'Decision Maker'}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <div className="text-right">
                                          <div className="text-xs font-mono text-emerald-400 font-semibold">
                                            {lead.contacts[0].email}
                                          </div>
                                          <div className="text-[10px] text-slate-500">
                                            {lead.contacts[0].confidence_score || 90}% confidence • {lead.contacts[0].email_status}
                                          </div>
                                        </div>
                                        <button
                                          onClick={() => handleCopy(`email-${lead.id}`, lead.contacts[0].email!)}
                                          className="p-1.5 rounded-md bg-[#20202a] hover:bg-[#2b2b38] text-slate-300 hover:text-white transition-colors"
                                          title="Copy email address"
                                        >
                                          {copiedId === `email-${lead.id}` ? (
                                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                                          ) : (
                                            <Copy className="w-3.5 h-3.5" />
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="p-2.5 rounded-lg bg-[#14141a] border border-[#202028] text-slate-400 flex items-center justify-between">
                                      <span className="text-[11px]">
                                        No verified email found via Hunter.io (Confidence &lt; 80% or domain unlisted). Manual recipient entry available on send.
                                      </span>
                                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                                        Manual Entry
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Step 6 & 7: Gemini Outreach Email Draft & Human Review */}
                                {lead.draft && (
                                  <div className="bg-[#0e0e12] rounded-xl p-3.5 border border-[#23232e] space-y-2.5">
                                    <div className="flex items-center justify-between text-[11px]">
                                      <div className="font-bold text-slate-200 flex items-center gap-1.5">
                                        <Mail className="w-3.5 h-3.5 text-[#f95721]" />
                                        <span>Step 6 • Personalized Outreach Email</span>
                                      </div>

                                      {/* Status Badges */}
                                      {isSent ? (
                                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                                          <CheckCircle2 className="w-3 h-3 text-blue-400" />
                                          SENT VIA GMAIL SMTP
                                        </span>
                                      ) : isFailed ? (
                                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                                          <AlertTriangle className="w-3 h-3 text-rose-400" />
                                          SEND FAILED
                                        </span>
                                      ) : isApproved ? (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                          APPROVED • READY TO SEND
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                          DRAFT • PENDING APPROVAL
                                        </span>
                                      )}
                                    </div>

                                    {/* Edit Mode */}
                                    {isEditing ? (
                                      <div className="space-y-2 mt-2">
                                        <div className="text-[10px] text-slate-400 font-semibold uppercase">Subject</div>
                                        <input
                                          type="text"
                                          value={editSubject}
                                          onChange={(e) => setEditSubject(e.target.value)}
                                          className="w-full px-3 py-1.5 rounded-lg bg-[#181820] border border-[#2b2b36] text-xs text-white focus:outline-none focus:border-[#f95721]"
                                        />
                                        <div className="text-[10px] text-slate-400 font-semibold uppercase">Email Body</div>
                                        <textarea
                                          rows={5}
                                          value={editBody}
                                          onChange={(e) => setEditBody(e.target.value)}
                                          className="w-full p-3 rounded-lg bg-[#181820] border border-[#2b2b36] text-xs text-white font-mono leading-relaxed focus:outline-none focus:border-[#f95721]"
                                        />
                                        <div className="flex justify-end gap-2">
                                          <button
                                            onClick={() => setEditingDraftId(null)}
                                            className="px-3 py-1 rounded-lg text-xs text-slate-400 hover:text-white"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            onClick={() => handleSaveDraftEdit(msg.id, lead.id, lead.draft!.id)}
                                            disabled={isSavingDraft}
                                            className="px-3 py-1 rounded-lg bg-[#f95721] text-white text-xs font-semibold hover:bg-[#ea4710] transition-colors"
                                          >
                                            {isSavingDraft ? 'Saving...' : 'Save Draft'}
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      /* View Mode */
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between text-xs font-bold text-white bg-[#14141a] px-3 py-2 rounded-lg border border-[#202028]">
                                          <span className="truncate">Subject: {lead.draft.subject}</span>
                                          <button
                                            onClick={() => handleCopy(`subject-${lead.id}`, lead.draft!.subject)}
                                            className="text-slate-400 hover:text-white ml-2 shrink-0"
                                            title="Copy subject"
                                          >
                                            {copiedId === `subject-${lead.id}` ? (
                                              <Check className="w-3 h-3 text-emerald-400" />
                                            ) : (
                                              <Copy className="w-3 h-3" />
                                            )}
                                          </button>
                                        </div>

                                        <div className="p-3 rounded-xl bg-[#131318] border border-[#1e1e26] text-xs text-slate-300 font-sans whitespace-pre-wrap leading-relaxed">
                                          {lead.draft.body}
                                        </div>

                                        {lead.draft.send_error && (
                                          <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-900/50 text-[11px] text-rose-300 space-y-1">
                                            <div className="font-bold flex items-center gap-1 text-rose-400">
                                              <AlertTriangle className="w-3.5 h-3.5" />
                                              SMTP Send Error
                                            </div>
                                            <div>{lead.draft.send_error}</div>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Action Bar */}
                                    <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#1c1c24]">
                                      <div className="flex items-center gap-2">
                                        {!isSent && !isEditing && (
                                          <>
                                            <button
                                              onClick={() => handleStartEditDraft(lead.draft!)}
                                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1a1a22] hover:bg-[#22222d] text-slate-300 text-xs border border-[#2b2b3a] transition-colors"
                                            >
                                              <Edit3 className="w-3 h-3" />
                                              <span>Edit Draft</span>
                                            </button>
                                            <button
                                              onClick={() => handleRegenerateDraftPrompt(lead.company_name, "Make it shorter and emphasize ROI")}
                                              className="px-2.5 py-1.5 rounded-lg bg-[#1a1a22] hover:bg-[#22222d] text-slate-400 hover:text-slate-200 text-xs border border-[#2b2b3a] transition-colors"
                                              title="Request shorter version"
                                            >
                                              Make Shorter
                                            </button>
                                          </>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-2">
                                        {/* State: Pending Approval */}
                                        {!isApproved && !isSent && (
                                          <button
                                            onClick={() => handleApproveDraft(msg.id, lead.id, lead.draft!.id)}
                                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                          >
                                            <CheckCircle2 className="w-4 h-4" />
                                            <span>Approve Outreach Draft</span>
                                          </button>
                                        )}

                                        {/* State: Approved & Ready to Send */}
                                        {isApproved && !isSent && (
                                          <button
                                            onClick={() => openSendModal(lead)}
                                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#f95721] to-[#ff7438] hover:from-[#ea4710] hover:to-[#f95721] text-white font-bold text-xs shadow-lg shadow-[#f95721]/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                          >
                                            <Send className="w-4 h-4" />
                                            <span>Send Email via Gmail SMTP</span>
                                          </button>
                                        )}

                                        {/* State: Send Failed (Allow retry) */}
                                        {isFailed && (
                                          <button
                                            onClick={() => openSendModal(lead)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all"
                                          >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                            <span>Retry Send Email</span>
                                          </button>
                                        )}

                                        {/* State: Sent Confirmed */}
                                        {isSent && (
                                          <div className="flex items-center gap-2">
                                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                                              <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                              <span>Sent & Confirmed</span>
                                            </span>
                                            {lead.draft.sent_at && (
                                              <span className="text-[10px] text-slate-500 font-mono">
                                                {new Date(lead.draft.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Step 8: Activity & Follow-up Management */}
                                <div className="bg-[#101014] rounded-xl p-3.5 border border-[#22222c] space-y-3">
                                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                    <div className="font-bold text-slate-300 flex items-center gap-1.5">
                                      <Calendar className="w-3.5 h-3.5 text-[#f95721]" />
                                      <span>Step 8 • Follow-Up Management</span>
                                    </div>

                                    {isSent ? (
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                                          Next: {lead.follow_up_date || '3 days from now'}
                                        </span>
                                        <button
                                          onClick={() => setManagingFollowUpLeadId(isManagingFollowUp ? null : lead.id)}
                                          className="text-[11px] font-semibold text-[#f95721] hover:underline"
                                        >
                                          {isManagingFollowUp ? 'Done' : 'Manage Follow-up'}
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                                        Awaiting Email Dispatch
                                      </span>
                                    )}
                                  </div>

                                  {!isSent ? (
                                    <div className="text-[11px] text-slate-400 bg-[#0c0c0f] px-3 py-2 rounded-lg border border-[#1b1b22] leading-relaxed">
                                      Follow-up schedule is paused. Follow-ups are automatically scheduled only after explicit human approval and verified Gmail SMTP dispatch.
                                    </div>
                                  ) : (
                                    <>
                                      {lead.follow_up_notes && (
                                        <div className="text-[11px] text-slate-400 bg-[#0c0c0f] px-3 py-1.5 rounded-lg border border-[#1b1b22]">
                                          <strong className="text-slate-300">Follow-up Note:</strong> {lead.follow_up_notes}
                                        </div>
                                      )}

                                      {/* Interactive Follow-up Management Panel */}
                                      {isManagingFollowUp && (
                                        <div className="pt-2 border-t border-[#1e1e28] space-y-2.5 animate-fade-in">
                                          <div className="text-[11px] text-slate-300 font-semibold">
                                            Reschedule or Record Follow-up Action:
                                          </div>

                                          <div className="flex flex-wrap items-center gap-2">
                                            <select
                                              value={followUpActionType}
                                              onChange={(e) => setFollowUpActionType(e.target.value)}
                                              className="px-2.5 py-1 rounded-lg bg-[#181820] border border-[#2b2b38] text-xs text-slate-200 focus:outline-none focus:border-[#f95721]"
                                            >
                                              <option value="Email Check-in">Email Check-in</option>
                                              <option value="Discovery Call">Discovery Call</option>
                                              <option value="LinkedIn Connection">LinkedIn Connection</option>
                                              <option value="Product Demo">Product Demo</option>
                                            </select>
                                            <button
                                              onClick={() => handleRescheduleFollowUp(msg.id, lead.id, 3)}
                                              disabled={isUpdatingFollowUp}
                                              className="px-2.5 py-1 rounded-lg bg-[#181820] hover:bg-[#22222c] text-xs text-slate-200 border border-[#2b2b38] transition-colors"
                                            >
                                              +3 Days
                                            </button>
                                            <button
                                              onClick={() => handleRescheduleFollowUp(msg.id, lead.id, 7)}
                                              disabled={isUpdatingFollowUp}
                                              className="px-2.5 py-1 rounded-lg bg-[#181820] hover:bg-[#22222c] text-xs text-slate-200 border border-[#2b2b38] transition-colors"
                                            >
                                              +1 Week
                                            </button>
                                            <button
                                              onClick={() => handleRescheduleFollowUp(msg.id, lead.id, 14)}
                                              disabled={isUpdatingFollowUp}
                                              className="px-2.5 py-1 rounded-lg bg-[#181820] hover:bg-[#22222c] text-xs text-slate-200 border border-[#2b2b38] transition-colors"
                                            >
                                              +2 Weeks
                                            </button>
                                            <button
                                              onClick={() =>
                                                handleRescheduleFollowUp(
                                                  msg.id,
                                                  lead.id,
                                                  undefined,
                                                  undefined,
                                                  'Marked complete via sales agent',
                                                  'COMPLETED'
                                                )
                                              }
                                              disabled={isUpdatingFollowUp}
                                              className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-colors"
                                            >
                                              ✓ Mark Completed
                                            </button>
                                          </div>

                                          <div className="flex items-center gap-2">
                                            <input
                                              type="text"
                                              placeholder="Add follow-up notes..."
                                              value={followUpNotesInput}
                                              onChange={(e) => setFollowUpNotesInput(e.target.value)}
                                              className="flex-1 px-3 py-1.5 rounded-lg bg-[#16161d] border border-[#262632] text-xs text-white focus:outline-none focus:border-[#f95721]"
                                            />
                                            <button
                                              onClick={() =>
                                                handleRescheduleFollowUp(msg.id, lead.id, undefined, undefined, followUpNotesInput)
                                              }
                                              disabled={isUpdatingFollowUp || !followUpNotesInput.trim()}
                                              className="px-3 py-1.5 rounded-lg bg-[#f95721] text-white text-xs font-semibold disabled:opacity-50"
                                            >
                                              Save
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  )}

                                  {/* Audit Log Transparency Badge */}
                                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                                    <span className="flex items-center gap-1 text-emerald-400">
                                      <CheckCircle2 className="w-3 h-3" />
                                      Activity automatically logged in database audit trail
                                    </span>
                                    <button
                                      onClick={() => {
                                        setIsActivityDrawerOpen(true);
                                        loadActivityLogs();
                                      }}
                                      className="text-slate-400 hover:text-white underline"
                                    >
                                      View Audit Log
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Timestamp & Copy */}
                    <div className="mt-2.5 pt-1.5 border-t border-[#22222e]/60 flex items-center justify-between text-[10px] text-slate-500">
                      <span>{msg.timestamp}</span>
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="hover:text-slate-300 transition-colors flex items-center gap-1"
                        title="Copy text"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {isUser && (
                    <div className="h-8 w-8 rounded-xl bg-[#22222a] border border-[#373744] flex items-center justify-center text-slate-300 shrink-0 mt-0.5 shadow-sm">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-start gap-3 justify-start animate-fade-in">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-[#f95721] to-[#ff7d47] flex items-center justify-center text-white shrink-0 shadow-md mt-0.5 animate-pulse">
                <Flame className="w-4 h-4 fill-current" />
              </div>
              <div className="px-5 py-4 rounded-2xl bg-[#121216] border border-[#24242e] rounded-tl-sm text-xs text-slate-300 space-y-2 shadow-lg max-w-lg">
                <div className="flex items-center gap-2 font-bold text-white">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#f95721] animate-ping" />
                  <span>Executing 8-Step Sales Operations Pipeline...</span>
                </div>
                <div className="text-[11px] text-slate-400 space-y-1 font-mono">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <span className="text-emerald-400">✓</span> 1. Parsing search criteria & geography
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <span className="text-emerald-400">✓</span> 2. Discovering matching company candidates
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <span className="text-[#f95721] animate-pulse">➔</span> 3. Firecrawl scraping website profiles & signals...
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span>○</span> 4. Google Gemini evaluating target qualification gates
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span>○</span> 5. Hunter.io identifying verified decision-makers
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span>○</span> 6. Gemini drafting evidence-grounded outreach
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span>○</span> 7. Presenting for human review & approval
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span>○</span> 8. Audit logging & Gmail SMTP integration
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Card */}
        <div className="bg-[#121216] border border-[#24242e] rounded-2xl p-3.5 shadow-2xl relative">
          <textarea
            ref={inputRef}
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="E.g. SaaS companies in the United States that may need AI automation..."
            className="w-full bg-transparent text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
          />

          <div className="flex items-center justify-between pt-2.5 border-t border-[#1c1c24] mt-1">
            <div className="flex items-center gap-2 text-slate-500 text-xs">
              <span className="hidden sm:inline text-[11px] text-slate-400">
                Press <kbd className="px-1.5 py-0.5 rounded bg-[#1c1c22] border border-[#2b2b36] font-mono text-[10px] text-slate-300">Enter</kbd> to run pipeline
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#f95721] hover:bg-[#ea4710] disabled:bg-[#f95721]/30 text-white text-xs font-bold shadow-md shadow-[#f95721]/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed"
            >
              <span>{isLoading ? 'Processing Pipeline...' : 'Run LeadFlow Pipeline'}</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Human-in-the-Loop Send Confirmation Modal (Gmail SMTP) */}
      {sendModal && sendModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-xl bg-[#0f0f14] border border-[#272736] rounded-2xl p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#20202c]">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-[#f95721]/20 text-[#f95721] flex items-center justify-center border border-[#f95721]/30">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Approve & Send Outreach Email</h3>
                  <p className="text-[11px] text-slate-400">Gmail SMTP • smtp.gmail.com:587 (STARTTLS)</p>
                </div>
              </div>
              <button
                onClick={() => setSendModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto flex-1 pr-1 text-xs">
              {/* Recipient Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Recipient Email Address *
                </label>
                <input
                  type="email"
                  value={sendModal.recipientEmail}
                  onChange={(e) =>
                    setSendModal((prev) => (prev ? { ...prev, recipientEmail: e.target.value, sendError: null } : null))
                  }
                  placeholder="e.g. founder@company.com"
                  className="w-full px-3 py-2 rounded-xl bg-[#16161f] border border-[#282838] text-white text-xs font-mono focus:outline-none focus:border-[#f95721]"
                />
              </div>

              {/* Subject */}
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Subject</div>
                <div className="p-2.5 rounded-xl bg-[#14141a] border border-[#202028] text-white font-medium">
                  {sendModal.subject}
                </div>
              </div>

              {/* Message Body */}
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Message Body</div>
                <div className="p-3 rounded-xl bg-[#121217] border border-[#1e1e28] text-slate-300 font-sans whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {sendModal.body}
                </div>
              </div>

              {/* SMTP Disclaimer */}
              <div className="p-2.5 rounded-xl bg-blue-950/20 border border-blue-900/30 text-[10px] text-blue-300 space-y-1">
                <div className="font-semibold flex items-center gap-1 text-blue-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  SMTP Relay Acceptance Notice
                </div>
                <div>
                  Emails are dispatched securely using your server-side Gmail App Password. Acceptance by Gmail confirms message receipt by Google's SMTP queue, not delivery or read status.
                </div>
              </div>

              {/* Error Banner */}
              {sendModal.sendError && (
                <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-900/50 text-rose-300 text-[11px] flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong>Send Error:</strong> {sendModal.sendError}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-[#20202c] flex items-center justify-end gap-2.5">
              <button
                onClick={() => setSendModal(null)}
                className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSendEmail}
                disabled={sendModal.isSending || !sendModal.recipientEmail.trim()}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#f95721] hover:bg-[#ea4710] disabled:bg-[#f95721]/40 text-white font-bold text-xs shadow-md transition-all disabled:cursor-not-allowed"
              >
                {sendModal.isSending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending via Gmail...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Confirm & Send Email</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Gmail SMTP Modal */}
      {isTestSmtpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#0f0f14] border border-[#272736] rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#20202c]">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Test Gmail SMTP Connection</h3>
                  <p className="text-[10px] text-slate-400">Verify GMAIL_USER & GMAIL_APP_PASSWORD</p>
                </div>
              </div>
              <button
                onClick={() => setIsTestSmtpOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300 leading-relaxed text-[11px]">
                Sends an explicit test email through <code className="font-mono text-[#f95721]">smtp.gmail.com:587</code> (STARTTLS) to verify credentials and network accessibility.
              </p>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Test Recipient Address
                </label>
                <input
                  type="email"
                  value={testEmailRecipient}
                  onChange={(e) => setTestEmailRecipient(e.target.value)}
                  placeholder="your-email@example.com"
                  className="w-full px-3 py-2 rounded-xl bg-[#16161f] border border-[#282838] text-white text-xs font-mono focus:outline-none focus:border-[#f95721]"
                />
              </div>

              {testEmailFeedback && (
                <div
                  className={`p-3 rounded-xl border text-[11px] leading-relaxed ${testEmailFeedback.success
                      ? 'bg-emerald-950/30 border-emerald-900/50 text-emerald-300'
                      : 'bg-rose-950/30 border-rose-900/50 text-rose-300'
                    }`}
                >
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    {testEmailFeedback.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                    )}
                    <span>{testEmailFeedback.success ? 'SMTP Connection Succeeded' : 'SMTP Connection Failed'}</span>
                  </div>
                  <div>{testEmailFeedback.message}</div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#20202c] flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsTestSmtpOpen(false)}
                className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
              <button
                onClick={handleRunTestEmail}
                disabled={isSendingTestEmail || !testEmailRecipient.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/40 text-white font-bold text-xs shadow-md transition-all disabled:cursor-not-allowed"
              >
                {isSendingTestEmail ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Test Email</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity Log Slide-over Drawer */}
      {isActivityDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#0e0e12] border-l border-[#22222c] h-full flex flex-col p-5 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-[#1f1f28]">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-[#f95721]" />
                <h2 className="text-sm font-bold text-white">LeadFlow Activity Audit Trail</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadActivityLogs}
                  disabled={isLoadingLogs}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a1a22] transition-colors"
                  title="Refresh activity logs"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setIsActivityDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a1a22] transition-colors"
                  title="Close drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="py-2.5 text-[11px] text-slate-400">
              Chronological audit log of automated discovery, Firecrawl searches, Gemini scoring, Hunter.io inquiries, follow-up scheduling, and Gmail SMTP email dispatches.
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 py-2">
              {activityLogs.length === 0 ? (
                <div className="text-center text-xs text-slate-500 py-10">
                  No activity events recorded yet.
                </div>
              ) : (
                activityLogs.map((log) => {
                  const isSuccess = log.level === 'SUCCESS';
                  const isWarning = log.level === 'WARNING';
                  const dateObj = new Date(log.created_at);
                  const timeFormatted = dateObj.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  return (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-[#14141a] border border-[#20202a] text-xs space-y-1 hover:border-[#2d2d3c] transition-colors"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span
                          className={`font-bold px-1.5 py-0.5 rounded ${isSuccess
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                              : isWarning
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                                : 'bg-blue-500/15 text-blue-400 border border-blue-500/25'
                            }`}
                        >
                          {log.action}
                        </span>
                        <span className="font-mono text-slate-500">{timeFormatted}</span>
                      </div>
                      <div className="text-slate-300 text-[11px] leading-relaxed">{log.details}</div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-[#1f1f28] flex items-center justify-between text-[11px] text-slate-400">
              <span>Total recorded: {activityLogs.length} events</span>
              <button
                onClick={() => setIsActivityDrawerOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-[#181820] text-slate-300 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
