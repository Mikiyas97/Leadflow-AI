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
  AlertTriangle,
  XCircle,
  Globe,
  Search,
  KeyRound,
  Plus,
  Sliders,
  CheckCheck,
  Crown
} from 'lucide-react';
import type { ChatMessage, ChatSession, PipelineLead, LeadSearchRequest } from '../types';
import { api } from '../services/api';
import { LeadDetailModal } from './LeadDetailModal';

const cleanDomain = (website?: string | null): string => {
  if (!website) return '';
  let d = website.trim().toLowerCase();
  d = d.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '');
  return d.split('/')[0];
};

const formatEmailCount = (lead: PipelineLead): number => {
  return lead.contacts?.length || lead.email_count || 0;
};

const getWebsiteStatusBadge = (status?: string | null) => {
  if (status === 'NO_OFFICIAL_WEBSITE_FOUND') {
    return {
      label: 'No Official Website',
      className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    };
  }
  if (status === 'WEBSITE_STATUS_UNCERTAIN') {
    return {
      label: 'Website Uncertain',
      className: 'bg-slate-700/50 text-slate-300 border-slate-600',
    };
  }
  return {
    label: 'Active Web',
    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  };
};

interface InlineLeadSearchFormProps {
  initialCriteria?: LeadSearchRequest | null;
  onSubmit: (criteria: LeadSearchRequest) => void;
  isLoading: boolean;
}

export const InlineLeadSearchForm: React.FC<InlineLeadSearchFormProps> = ({
  initialCriteria,
  onSubmit,
  isLoading,
}) => {
  const [targetBusiness, setTargetBusiness] = useState<string>(
    initialCriteria?.target_business?.[0] || 'Web Development'
  );
  const [location, setLocation] = useState<string>(
    initialCriteria?.location || 'Addis Ababa, Ethiopia'
  );
  const [leadQuantity, setLeadQuantity] = useState<number>(
    initialCriteria?.lead_quantity || 1
  );
  const [serviceOffered, setServiceOffered] = useState<string>(
    initialCriteria?.service_offered || 'AI Workflow Automation & Operations'
  );
  const [websiteStatus, setWebsiteStatus] = useState<string>(
    initialCriteria?.website_status || 'Any'
  );
  const [minScore, setMinScore] = useState<number>(
    initialCriteria?.min_qualification_score || 60
  );

  const businessChips = [
    'Web Development',
    'Hotels',
    'B2B SaaS',
    'FinTech',
    'Healthcare',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    onSubmit({
      campaign_name: 'Chat Lead Discovery',
      target_business: [targetBusiness.trim()],
      location: location.trim(),
      lead_quantity: Number(leadQuantity),
      service_offered: serviceOffered.trim(),
      website_status: websiteStatus,
      min_qualification_score: Number(minScore),
      decision_makers: ['Founder & CEO', 'Managing Director', 'Owner'],
      company_size: 'Any',
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3.5 bg-[#0d0d12] border border-[#28283a] rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xl animate-fade-in"
    >
      <div className="flex items-center justify-between border-b border-[#1c1c28] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-[#f95721]/15 border border-[#f95721]/30 flex items-center justify-center text-[#f95721]">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white tracking-wide">
              LeadFlow Prospecting Search Form
            </h4>
            <p className="text-[10px] text-slate-400">
              Customize criteria to discover, qualify, and prepare outreach for matching leads
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#181824] text-slate-300 border border-[#2a2a38]">
          Interactive Search
        </span>
      </div>

      {/* Target Business Type */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-slate-300">
          Target Business / Industry
        </label>
        <div className="flex flex-wrap gap-1.5">
          {businessChips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setTargetBusiness(chip)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${targetBusiness === chip
                  ? 'bg-[#f95721] text-white shadow-sm'
                  : 'bg-[#161620] hover:bg-[#20202c] text-slate-300 border border-[#282838]'
                }`}
            >
              {chip}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={targetBusiness}
          onChange={(e) => setTargetBusiness(e.target.value)}
          placeholder="e.g. Web Development or Hotels"
          className="w-full mt-1.5 px-3 py-2 rounded-xl bg-[#14141c] border border-[#282838] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#f95721]"
          required
        />
      </div>

      {/* Grid: Location & Quantity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-[#f95721]" />
            Target Geography
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Addis Ababa, Ethiopia"
            className="w-full px-3 py-2 rounded-xl bg-[#14141c] border border-[#282838] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#f95721]"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Lead Quantity
          </label>
          <select
            value={leadQuantity}
            onChange={(e) => setLeadQuantity(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl bg-[#14141c] border border-[#282838] text-xs text-white focus:outline-none focus:border-[#f95721] cursor-pointer"
          >
            <option value={1}>1 Best Qualified Company</option>
            <option value={3}>Top 3 Qualified Candidates</option>
            <option value={5}>5 Qualified Candidates</option>
            <option value={10}>10 Candidates</option>
          </select>
        </div>
      </div>

      {/* Service Pitch */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
          <Zap className="w-3.5 h-3.5 text-emerald-400" />
          Service Offered / Pitch Proposition
        </label>
        <input
          type="text"
          value={serviceOffered}
          onChange={(e) => setServiceOffered(e.target.value)}
          placeholder="e.g. AI Workflow Automation & Operations or Website Development"
          className="w-full px-3 py-2 rounded-xl bg-[#14141c] border border-[#282838] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#f95721]"
          required
        />
      </div>

      {/* Website Status & Min Score */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            Website Status
          </label>
          <select
            value={websiteStatus}
            onChange={(e) => setWebsiteStatus(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[#14141c] border border-[#282838] text-xs text-white focus:outline-none focus:border-[#f95721] cursor-pointer"
          >
            <option value="Any">Any Website Status</option>
            <option value="Missing">Must Lack Official Website</option>
            <option value="Outdated">Outdated Website</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-300">Min Fit Threshold</span>
            <span className="font-mono text-[#f95721] font-bold">{minScore}%</span>
          </div>
          <input
            type="range"
            min={40}
            max={90}
            step={5}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="w-full accent-[#f95721] bg-[#1a1a24] rounded-lg cursor-pointer"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#f95721] via-[#ff6a38] to-[#f95721] hover:from-[#ea4710] hover:to-[#ea4710] text-white font-bold text-xs shadow-lg shadow-[#f95721]/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Executing 8-Step Sales Ops Pipeline...</span>
          </>
        ) : (
          <>
            <Zap className="w-4 h-4 fill-current" />
            <span>Find Best Lead & Prepare Outreach</span>
          </>
        )}
      </button>
    </form>
  );
};

const QUICK_PROMPTS = [
  "SaaS companies in the United States that may need AI automation",
  "find best one a company that give web development service in addis ababa and prepare outreach email",
  "skilyhotel for a lead",
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

interface ChatbotUIProps {
  session?: ChatSession;
  onUpdateSessionMessages?: (sessionId: string, messages: ChatMessage[], newTitle?: string) => void;
  onNewChat?: () => void;
}

export const ChatbotUI: React.FC<ChatbotUIProps> = ({
  session,
  onUpdateSessionMessages,
  onNewChat,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => session?.messages || []);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync internal messages whenever active session switches
  useEffect(() => {
    if (session) {
      setMessages(session.messages || []);
    }
  }, [session?.id]);

  const updateMessages = (
    updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[]),
    customTitle?: string
  ) => {
    setMessages((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (session && onUpdateSessionMessages) {
        onUpdateSessionMessages(session.id, next, customTitle);
      }
      return next;
    });
  };

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

  const [selectedProfileLead, setSelectedProfileLead] = useState<PipelineLead | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const loadActivityLogs = () => {};

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Auto-generate a title from the first prompt if session still has default title
    let firstMessageTitle: string | undefined = undefined;
    if (session && (session.title === 'New Chat' || !session.title) && messages.length === 0) {
      const clean = text.replace(/^["']|["']$/g, '').trim();
      firstMessageTitle = clean.length > 36 ? `${clean.substring(0, 36)}...` : clean;
    }

    updateMessages((prev) => [...prev, userMessage], firstMessageTitle);
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
        show_form: response.show_form,
        suggested_form_criteria: response.suggested_form_criteria,
      };

      updateMessages((prev) => [...prev, agentMessage]);
      loadActivityLogs();
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Connection error: ${err.message || 'Agent backend unavailable'}. Please verify that the server is running.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      updateMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleSendWithCriteria = async (criteria: LeadSearchRequest) => {
    const text = `Find ${criteria.lead_quantity} ${criteria.target_business.join(', ')} in ${criteria.location} and prepare outreach email`;
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    updateMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const history = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await api.sendChat(history, criteria);

      const agentMessage: ChatMessage = {
        id: `agent-${Date.now()}`,
        role: 'assistant',
        content: response.content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        parsed_criteria: response.parsed_criteria,
        pipeline_leads: response.pipeline_leads as PipelineLead[] | undefined,
        qualified_count: response.qualified_count,
        total_candidates: response.total_candidates,
        show_form: response.show_form,
        suggested_form_criteria: response.suggested_form_criteria,
      };

      updateMessages((prev) => [...prev, agentMessage]);
      loadActivityLogs();
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Connection error: ${err.message || 'Agent backend unavailable'}. Please verify that the server is running.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      updateMessages((prev) => [...prev, errorMessage]);
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
      updateMessages((prev) =>
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
      updateMessages((prev) =>
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
      updateMessages((prev) =>
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

      // Notify user with exact confirmation message requested by prompt
      const successConfirmationMsg: ChatMessage = {
        id: `agent-sent-${Date.now()}`,
        role: 'assistant',
        content: `Good! I sent the email to **${sendModal.companyName}** (${recipient}). Is there anything else I should do?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      updateMessages((prev) => [...prev, successConfirmationMsg]);
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
      updateMessages((prev) =>
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
    <div className="relative h-full flex-1 bg-[#080809] bg-grid-lines text-slate-100 flex flex-col font-sans selection:bg-[#f95721] selection:text-white overflow-hidden">
      {/* Top Session Header Bar */}
      <div className="h-11 border-b border-[#1c1c24] bg-[#0a0a0d]/90 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-6 w-6 rounded-lg bg-[#f95721]/15 border border-[#f95721]/30 flex items-center justify-center text-[#f95721] shrink-0">
            <Flame className="w-3.5 h-3.5 fill-current" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-xs text-white truncate max-w-[180px] sm:max-w-xs md:max-w-md">
              {session?.title || 'AI Sales Agent'}
            </span>
            {messages.length > 0 && (
              <span className="text-[10px] text-slate-400 font-mono bg-[#14141c] px-2 py-0.5 rounded-full border border-[#22222e] shrink-0 hidden sm:inline-block">
                {messages.length} {messages.length === 1 ? 'msg' : 'msgs'}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onNewChat && (
            <button
              type="button"
              onClick={onNewChat}
              className="px-2.5 py-1 rounded-lg bg-[#14141c] hover:bg-[#1e1e28] border border-[#242432] hover:border-[#f95721]/50 text-xs text-slate-200 hover:text-white flex items-center gap-1.5 transition-all shadow-sm group"
              title="Start a new conversation"
            >
              <Plus className="w-3.5 h-3.5 text-[#f95721] group-hover:rotate-90 transition-transform" />
              <span className="font-medium text-[11px]">New Chat</span>
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Messages Feed (Scrollbar Hidden) */}
      <div className="flex-1 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden px-4 pt-4 pb-4">
        <div className="max-w-4xl w-full mx-auto space-y-6">
          {messages.length === 0 ? (
            /* Empty State */
            <div className="h-full flex flex-col items-center justify-center text-center py-8 animate-fade-in">
              <div className="h-14 w-14 rounded-2xl bg-[#f95721]/15 border border-[#f95721]/30 flex items-center justify-center text-[#f95721] mb-4 shadow-xl shadow-[#f95721]/15">
                <Flame className="w-7 h-7 fill-current" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                LeadFlow AI Agent
              </h1>

              {/* Featured Starter Prompts */}
              <div className="mt-6 w-full max-w-xl space-y-2.5">
                <button
                  onClick={() => handleSend("SaaS companies in the United States that may need AI automation")}
                  className="w-full p-3.5 rounded-xl bg-gradient-to-r from-[#17171d] via-[#1c1c24] to-[#17171d] hover:border-[#f95721]/50 border border-[#2b2b38] text-left transition-all group shadow-lg flex items-center justify-between"
                >
                  <div className="text-sm font-bold text-white group-hover:text-[#f95721] transition-colors">
                    "SaaS companies in the United States that may need AI automation"
                  </div>
                  <div className="h-8 w-8 rounded-lg bg-[#f95721]/20 border border-[#f95721]/40 flex items-center justify-center text-[#f95721] shrink-0 ml-3">
                    <Zap className="w-4 h-4 fill-current" />
                  </div>
                </button>

                <button
                  onClick={() => handleSend("Find 5 software companies without an official website and draft website-development emails")}
                  className="w-full p-3.5 rounded-xl bg-[#121217] hover:bg-[#181820] hover:border-amber-500/40 border border-[#252532] text-left transition-all group shadow-md flex items-center justify-between"
                >
                  <div className="text-xs sm:text-sm font-semibold text-slate-200 group-hover:text-amber-300 transition-colors">
                    "Find 5 software companies without an official website and draft website-development emails"
                  </div>
                  <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 ml-3">
                    <Globe className="w-4 h-4" />
                  </div>
                </button>

                <button
                  onClick={() => handleSend("Find B2B fintech startups in California that may need AI automation")}
                  className="w-full p-3.5 rounded-xl bg-[#121217] hover:bg-[#181820] hover:border-blue-500/40 border border-[#252532] text-left transition-all group shadow-md flex items-center justify-between"
                >
                  <div className="text-xs sm:text-sm font-semibold text-slate-200 group-hover:text-blue-300 transition-colors">
                    "Find B2B fintech startups in California that may need AI automation"
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

                    {/* Inline Lead Search Form fallback */}
                    {msg.show_form && (
                      <InlineLeadSearchForm
                        initialCriteria={msg.suggested_form_criteria}
                        onSubmit={(crit) => handleSendWithCriteria(crit)}
                        isLoading={isLoading}
                      />
                    )}

                    {/* Post-send follow-up chips */}
                    {msg.content && (msg.content.includes("Good! I sent the email") || msg.content.includes("Good! I sent the outreach email")) && (
                      <div className="mt-3.5 pt-3 border-t border-[#22222e] flex flex-wrap gap-2 animate-fade-in">
                        <button
                          onClick={() => handleSend("Schedule follow-up check-in in 3 days")}
                          className="px-3 py-1.5 rounded-lg bg-[#181822] hover:bg-[#222230] border border-[#2b2b3a] text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5"
                        >
                          <Calendar className="w-3.5 h-3.5 text-blue-400" />
                          <span>Schedule follow-up in 3 days</span>
                        </button>
                        <button
                          onClick={() => handleSend("Find another company in Addis Ababa and prepare outreach email")}
                          className="px-3 py-1.5 rounded-lg bg-[#181822] hover:bg-[#222230] border border-[#2b2b3a] text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5"
                        >
                          <Search className="w-3.5 h-3.5 text-[#f95721]" />
                          <span>Find another company in Addis Ababa</span>
                        </button>
                      </div>
                    )}

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

                      </div>
                    )}

                    {/* 8-Step Pipeline Stepper Banner */}
                    {msg.pipeline_leads && msg.pipeline_leads.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-[#22222e]">


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
                                {/* Panel Top Row: Logo, Name, Email Count, Lead Profile Button */}
                                <div className="p-4 sm:p-5 pb-3 border-b border-[#22222e]">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3.5">
                                      {/* Large Favicon / Logo */}
                                      <div className="w-12 h-12 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 border border-slate-200 shadow-md overflow-hidden">
                                        {cleanDomain(lead.website) ? (
                                          <img
                                            src={`https://www.google.com/s2/favicons?domain=${cleanDomain(lead.website)}&sz=128`}
                                            alt={lead.company_name}
                                            className="w-9 h-9 object-contain"
                                            onError={(e) => {
                                              e.currentTarget.style.display = 'none';
                                              if (e.currentTarget.parentElement) {
                                                e.currentTarget.parentElement.innerHTML = `<span class="font-bold text-sm text-slate-900">${lead.company_name.substring(0, 2).toUpperCase()}</span>`;
                                              }
                                            }}
                                          />
                                        ) : (
                                          <Building2 className="w-7 h-7 text-slate-800" />
                                        )}
                                      </div>

                                      <div>
                                        <h3 className="text-base font-bold text-white flex items-center gap-2 flex-wrap">
                                          <span>{lead.company_name}</span>
                                          {lead.fit_score !== undefined && lead.fit_score !== null && (
                                            <span
                                              className={`text-[11px] px-2 py-0.5 rounded-md border font-semibold ${
                                                lead.fit_score >= 65
                                                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                                  : 'bg-rose-500/10 border-rose-500/25 text-rose-300'
                                              }`}
                                            >
                                              Qualified {lead.fit_score}%
                                            </span>
                                          )}
                                        </h3>

                                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                          {(() => {
                                            const badge = getWebsiteStatusBadge(lead.website_status);
                                            return (
                                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium ${badge.className}`}>
                                                {badge.label}
                                              </span>
                                            );
                                          })()}
                                          <div className="inline-block px-2.5 py-0.5 rounded-md bg-[#1c1c28] border border-[#2c2c3e] text-xs font-semibold text-slate-200 shadow-sm">
                                            {formatEmailCount(lead)} emails
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Action: Open Lead Profile Modal */}
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => setSelectedProfileLead(lead)}
                                        className="px-2.5 py-1 rounded-lg bg-[#181824] hover:bg-[#222232] border border-[#2a2a3e] text-slate-300 hover:text-white text-xs font-medium transition-colors"
                                        title="Open complete lead detail modal"
                                      >
                                        Lead Profile
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* Company Description */}
                                <div className="p-4 sm:p-5 pt-3.5 space-y-3">
                                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                                    {lead.description || lead.research_summary || 'No company description available.'}
                                  </p>

                                  {/* Company Details Grid (Two Columns matching SearchLeadsView) */}
                                  <div className="pt-3 border-t border-[#1c1c28] grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-xs">
                                    <div className="space-y-1">
                                      <div className="text-slate-200 font-medium">
                                        {lead.industry || 'Not specified'}
                                      </div>
                                      <div className="text-slate-400">
                                        {lead.company_size || 'Not specified'}
                                      </div>
                                    </div>

                                    <div className="space-y-1">
                                      {lead.website && (
                                        <a
                                          href={`https://${cleanDomain(lead.website)}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1.5"
                                        >
                                          <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                          <span className="font-mono">{cleanDomain(lead.website)}</span>
                                        </a>
                                      )}
                                      <div className="text-slate-400 flex items-start gap-1.5">
                                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                                        <span>{lead.location || 'Location not specified'}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Hunter.io Verified Contacts Explorer Section */}
                                {lead.contacts && lead.contacts.length > 0 && (
                                  <div className="p-4 sm:p-5 pt-3 space-y-2.5">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-slate-300 font-semibold">
                                        <strong className="text-white">{formatEmailCount(lead)} results</strong> for {cleanDomain(lead.website) || lead.company_name}
                                      </span>
                                      <span className="text-[10px] text-slate-500 font-mono">Hunter.io Verified</span>
                                    </div>

                                    <div className="border border-[#1e1e28] rounded-xl overflow-hidden divide-y divide-[#1e1e28] bg-[#0f0f14]">
                                      {lead.contacts.map((contact, cIdx) => (
                                        <div
                                          key={cIdx}
                                          className="px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#151520] transition-colors group"
                                        >
                                          <div className="flex items-center gap-2.5 min-w-0">
                                            <input
                                              type="checkbox"
                                              defaultChecked
                                              className="w-3.5 h-3.5 rounded text-[#f95721] focus:ring-0 bg-[#14141c] border-[#333346] cursor-pointer"
                                            />
                                            <div>
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="font-bold text-xs text-white">
                                                  {contact.name}
                                                </span>
                                                {contact.job_title && (
                                                  <>
                                                    <span className="text-slate-500 text-xs">|</span>
                                                    <span className="text-xs text-slate-300">
                                                      {contact.job_title}
                                                    </span>
                                                  </>
                                                )}
                                              </div>
                                              {contact.email && (
                                                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 font-mono">
                                                  <span>{contact.email}</span>
                                                  <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 font-sans">
                                                    <Check className="w-2.5 h-2.5" />
                                                    <span>{contact.confidence_score ? `${contact.confidence_score}% verified` : 'verified'}</span>
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                          </div>

                                          {contact.email && (
                                            <button
                                              type="button"
                                              onClick={() => handleCopy(`email-${lead.id}-${cIdx}`, contact.email!)}
                                              className="p-1.5 rounded-lg bg-[#181824] hover:bg-[#222230] border border-[#262638] text-slate-400 hover:text-white transition-colors self-end sm:self-center"
                                              title="Copy email address"
                                            >
                                              {copiedId === `email-${lead.id}-${cIdx}` ? (
                                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                              ) : (
                                                <Copy className="w-3.5 h-3.5" />
                                              )}
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

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

                                    {/* Explicit Approval Authorization Callout Banner */}
                                    {!isSent && !isEditing && (
                                      <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#171412] via-[#241712] to-[#171412] border border-[#f95721]/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                        <div className="flex items-center gap-2 text-white font-medium">
                                          <Sparkles className="w-4 h-4 text-[#f95721] shrink-0" />
                                          <span>👉 Please review the prepared email above. Would you like me to approve and send this email now?</span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                          {!isApproved && (
                                            <button
                                              onClick={() => handleApproveDraft(msg.id, lead.id, lead.draft!.id)}
                                              className="px-3 py-1.5 rounded-lg bg-[#222230] hover:bg-[#2c2c3e] border border-[#36364a] text-slate-200 font-semibold text-xs transition-colors flex items-center gap-1.5"
                                            >
                                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                                              <span>Approve Draft</span>
                                            </button>
                                          )}
                                          <button
                                            onClick={() => openSendModal(lead)}
                                            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#f95721] to-[#ff7438] hover:from-[#ea4710] hover:to-[#f95721] text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                                          >
                                            <Send className="w-3.5 h-3.5" />
                                            <span>Send via Gmail SMTP</span>
                                          </button>
                                        </div>
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
                                  <div className="flex items-center text-[10px] text-slate-400 pt-1">
                                    <span className="flex items-center gap-1 text-emerald-400">
                                      <CheckCircle2 className="w-3 h-3" />
                                      Activity automatically logged in database audit trail
                                    </span>
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

          {/* Minimal Thinking Indicator */}
          {isLoading && (
            <div className="flex items-center gap-2.5 justify-start animate-fade-in py-1">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-[#f95721] to-[#ff7d47] flex items-center justify-center text-white shrink-0 shadow-sm">
                <Flame className="w-3.5 h-3.5 fill-current" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#121216] border border-[#24242e] text-xs text-slate-300 shadow-sm">
                <span className="font-medium">Thinking</span>
                <span className="flex items-center gap-1 ml-0.5">
                  <span className="h-1 w-1 rounded-full bg-[#f95721] animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-1 w-1 rounded-full bg-[#f95721] animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-1 w-1 rounded-full bg-[#f95721] animate-bounce" />
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Always Sticky Chat Input Card at Bottom */}
      <div className="shrink-0 w-full z-20 pb-2 pt-1 bg-gradient-to-t from-[#080809] via-[#080809]/95 to-transparent">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-[#121216] border border-[#24242e] rounded-2xl p-2.5 sm:p-3 shadow-2xl relative flex items-end gap-2.5">
            <textarea
              ref={inputRef}
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="E.g. SaaS companies in the United States that may need AI automation..."
              className="flex-1 bg-transparent text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none leading-relaxed py-1"
            />

            <button
              type="button"
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              aria-label="Send message"
              title="Send message"
              className="h-9 w-9 rounded-xl bg-[#f95721] hover:bg-[#ea4710] disabled:bg-[#1e1e26] disabled:text-slate-600 text-white flex items-center justify-center shadow-md shadow-[#f95721]/20 transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed shrink-0"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Send className="w-4 h-4" />
              )}
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



      {/* Complete Lead Profile Detail Modal */}
      {selectedProfileLead && (
        <LeadDetailModal
          leadId={selectedProfileLead.id}
          onClose={() => setSelectedProfileLead(null)}
          onRefreshParent={loadActivityLogs}
        />
      )}
    </div>
  );
};
