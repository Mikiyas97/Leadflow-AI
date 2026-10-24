import React, { useState, useRef, useEffect } from 'react';
import {
  Flame,
  Send,
  RotateCcw,
  User,
  Copy,
  Check,
  Paperclip,
  Sparkles,
  ExternalLink,
  Mail,
  CheckCircle2,
  Calendar,
  ShieldCheck
} from 'lucide-react';
import type { ChatMessage, PipelineLead } from '../types';
import { api } from '../services/api';

const QUICK_PROMPTS = [
  "SaaS companies in the United States that may need AI automation",
  "Research Stripe's value proposition and target customer fit",
  "Find executive contacts and emails for Linear.app",
  "Draft a consultative cold email for a Head of Sales",
];

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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

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
        pipeline_leads: response.pipeline_leads as PipelineLead[] | undefined,
      };

      setMessages((prev) => [...prev, agentMessage]);
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

  const handleResetChat = () => {
    setMessages([]);
    setInput('');
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
    } catch (err: any) {
      alert(`Could not approve draft: ${err.message}`);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#080809] bg-grid-lines text-slate-100 flex flex-col font-sans selection:bg-[#f95721] selection:text-white">
      
      {/* Top Header */}
      <header className="border-b border-[#1c1c1f] bg-[#0c0c0e]/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-[#f95721] flex items-center justify-center text-white shadow-md shadow-[#f95721]/20">
              <Flame className="w-4 h-4 fill-current" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-white">LeadFlow AI</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#f95721]/15 text-[#f95721] border border-[#f95721]/30">
                Agent
              </span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={handleResetChat}
                title="Clear conversation"
                className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#18181b] transition-colors text-xs flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>New Chat</span>
              </button>
            )}
          </div>

        </div>
      </header>

      {/* Main Chat Interface */}
      <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 flex flex-col justify-between">
        
        {/* Messages Feed or Empty State */}
        <div className="flex-1 overflow-y-auto space-y-5 mb-6 pr-1 min-h-[50vh]">
          {messages.length === 0 ? (
            /* Empty State */
            <div className="h-full flex flex-col items-center justify-center text-center py-12 animate-fade-in">
              <div className="h-12 w-12 rounded-2xl bg-[#f95721]/15 border border-[#f95721]/30 flex items-center justify-center text-[#f95721] mb-4 shadow-lg shadow-[#f95721]/10">
                <Flame className="w-6 h-6 fill-current" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                How can LeadFlow AI help you today?
              </h1>
              <p className="text-xs text-slate-400 mt-1.5 max-w-md">
                Enter your target market criteria to autonomously discover companies, scrape websites via Firecrawl, score customer fit with Gemini, and draft personalized outreach.
              </p>

              {/* Starter Prompt Suggestions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-8 w-full max-w-xl text-left">
                {QUICK_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(prompt)}
                    className="p-3 rounded-xl bg-[#121215] hover:bg-[#18181e] border border-[#22222a] hover:border-[#383848] text-xs text-slate-300 hover:text-white transition-all flex items-center justify-between group"
                  >
                    <span className="line-clamp-2">{prompt}</span>
                    <Sparkles className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#f95721] transition-colors shrink-0 ml-2" />
                  </button>
                ))}
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
                    <div className="h-7 w-7 rounded-lg bg-[#f95721] flex items-center justify-center text-white shrink-0 shadow-sm mt-0.5">
                      <Flame className="w-3.5 h-3.5 fill-current" />
                    </div>
                  )}

                  <div
                    className={`relative w-full max-w-2xl px-4 py-3.5 rounded-2xl text-xs leading-relaxed ${
                      isUser
                        ? 'bg-[#1e1e24] text-slate-100 border border-[#2d2d38] rounded-tr-sm shadow-sm'
                        : 'bg-[#121215] text-slate-200 border border-[#24242c] rounded-tl-sm shadow-sm'
                    }`}
                  >
                    {/* Content text */}
                    <div className="whitespace-pre-wrap font-sans space-y-2">
                      {msg.content}
                    </div>

                    {/* Step 2-8: In-Chat Pipeline Lead Cards */}
                    {msg.pipeline_leads && msg.pipeline_leads.length > 0 && (
                      <div className="mt-4 space-y-4 pt-3 border-t border-[#22222a]">
                        {msg.pipeline_leads.map((lead, idx) => {
                          const isApproved = lead.draft?.status === 'APPROVED';
                          const isEditing = editingDraftId === lead.draft?.id;

                          return (
                            <div
                              key={lead.id}
                              className="rounded-xl bg-[#16161b] border border-[#292934] p-4 space-y-3 shadow-md"
                            >
                              {/* Step 2: Company Discovery Header */}
                              <div className="flex items-start justify-between gap-2 border-b border-[#252530] pb-2.5">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#f95721]/20 text-[#f95721]">
                                      PROSPECT #{idx + 1}
                                    </span>
                                    <h3 className="text-sm font-bold text-white">
                                      {lead.company_name}
                                    </h3>
                                  </div>
                                  <a
                                    href={`https://${lead.website}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] text-[#f95721] hover:underline mt-0.5"
                                  >
                                    <span>{lead.website}</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>

                                {/* Step 4: Gemini Fit Score Badge */}
                                <div className="text-right">
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                                    <Sparkles className="w-3 h-3" />
                                    {lead.fit_score}/100 QUALIFIED
                                  </span>
                                  <div className="text-[10px] text-slate-500 mt-0.5">
                                    {lead.location || 'United States'}
                                  </div>
                                </div>
                              </div>

                              {/* Step 3: Firecrawl Research Profile */}
                              <div className="bg-[#101013] rounded-lg p-2.5 border border-[#202028] text-[11px] text-slate-300 space-y-1">
                                <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                                  <Flame className="w-3 h-3 text-[#f95721]" />
                                  <span>Step 3 • Firecrawl Website Research</span>
                                </div>
                                <p className="line-clamp-2 text-slate-300">
                                  {lead.research_summary}
                                </p>
                              </div>

                              {/* Step 4: Gemini Suitability Reasoning */}
                              {lead.fit_reason && (
                                <div className="text-[11px] text-slate-300">
                                  <span className="font-semibold text-slate-200">Gemini Fit Assessment: </span>
                                  {lead.fit_reason}
                                </div>
                              )}

                              {/* Step 5: Hunter.io Contacts */}
                              {lead.contacts && lead.contacts.length > 0 && (
                                <div className="bg-[#101013] rounded-lg p-2.5 border border-[#202028] space-y-1 text-[11px]">
                                  <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                                    <User className="w-3 h-3 text-brand-orange" />
                                    <span>Step 5 • Hunter.io Discovered Decision-Maker</span>
                                  </div>
                                  <div className="flex flex-wrap items-center justify-between gap-1 text-slate-200">
                                    <div>
                                      <strong>{lead.contacts[0].name}</strong>
                                      <span className="text-slate-400"> — {lead.contacts[0].job_title || 'Executive'}</span>
                                    </div>
                                    <span className="text-[10px] font-mono bg-[#1a1a22] px-2 py-0.5 rounded text-emerald-400 border border-emerald-500/20">
                                      {lead.contacts[0].email} ({lead.contacts[0].confidence_score || 90}% confidence)
                                    </span>
                                  </div>
                                </div>
                              )}

                              {/* Step 6: Gemini Outreach Email Draft */}
                              {lead.draft && (
                                <div className="bg-[#0e0e11] rounded-xl p-3 border border-[#22222a] space-y-2">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <div className="font-bold text-slate-300 flex items-center gap-1.5">
                                      <Mail className="w-3.5 h-3.5 text-[#f95721]" />
                                      <span>Step 6 • Gemini Personalized Introduction Email</span>
                                    </div>
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                        isApproved
                                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                                      }`}
                                    >
                                      {lead.draft.status}
                                    </span>
                                  </div>

                                  {isEditing ? (
                                    <div className="space-y-2 mt-2">
                                      <input
                                        type="text"
                                        value={editSubject}
                                        onChange={(e) => setEditSubject(e.target.value)}
                                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#181820] border border-[#2b2b36] text-xs text-white"
                                      />
                                      <textarea
                                        rows={4}
                                        value={editBody}
                                        onChange={(e) => setEditBody(e.target.value)}
                                        className="w-full p-2.5 rounded-lg bg-[#181820] border border-[#2b2b36] text-xs text-white font-mono leading-relaxed"
                                      />
                                      <div className="flex justify-end gap-2">
                                        <button
                                          onClick={() => setEditingDraftId(null)}
                                          className="px-2.5 py-1 rounded text-[11px] text-slate-400 hover:text-white"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          onClick={() => handleSaveDraftEdit(msg.id, lead.id, lead.draft!.id)}
                                          disabled={isSavingDraft}
                                          className="px-3 py-1 rounded bg-[#f95721] text-white text-[11px] font-semibold"
                                        >
                                          Save
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-1.5">
                                      <div className="text-xs font-semibold text-white">
                                        Subject: {lead.draft.subject}
                                      </div>
                                      <div className="p-2.5 rounded-lg bg-[#141418] border border-[#1e1e24] text-[11px] text-slate-300 font-sans whitespace-pre-wrap leading-relaxed">
                                        {lead.draft.body}
                                      </div>
                                    </div>
                                  )}

                                  {/* Step 7 & 8: Human Approval and Follow-Up Management */}
                                  <div className="mt-2.5 pt-2 border-t border-[#1e1e26] flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                      <span>Step 8 • Next follow-up: <strong className="text-slate-200">{lead.follow_up_date || 'Oct 27, 2026'}</strong></span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      {!isApproved ? (
                                        <>
                                          <button
                                            onClick={() => handleStartEditDraft(lead.draft!)}
                                            className="px-2.5 py-1 rounded-lg bg-[#1e1e26] hover:bg-[#252530] text-slate-300 text-[11px] border border-[#2a2a38] transition-colors"
                                          >
                                            Edit
                                          </button>
                                          <button
                                            onClick={() => handleApproveDraft(msg.id, lead.id, lead.draft!.id)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] shadow-sm transition-all"
                                          >
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            <span>Approve Outreach</span>
                                          </button>
                                        </>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/25">
                                          <ShieldCheck className="w-3.5 h-3.5" />
                                          Approved for Outreach (Follow-up: {lead.follow_up_date})
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                </div>
                              )}

                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Timestamp & Copy */}
                    <div className="mt-2 pt-1 border-t border-[#22222a]/50 flex items-center justify-between text-[10px] text-slate-500">
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
                    <div className="h-7 w-7 rounded-lg bg-[#27272a] border border-[#3f3f46] flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-start gap-3 justify-start animate-fade-in">
              <div className="h-7 w-7 rounded-lg bg-[#f95721] flex items-center justify-center text-white shrink-0 shadow-sm mt-0.5 animate-pulse">
                <Flame className="w-3.5 h-3.5 fill-current" />
              </div>
              <div className="px-4 py-3 rounded-2xl bg-[#121215] border border-[#24242c] rounded-tl-sm text-xs text-slate-400 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#f95721] animate-ping" />
                <span>Executing 8-step prospecting & qualification pipeline...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Card */}
        <div className="bg-[#121215] border border-[#24242b] rounded-2xl p-3.5 shadow-2xl relative">
          
          {/* Text Area */}
          <textarea
            ref={inputRef}
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="E.g. SaaS companies in the United States that may need AI automation..."
            className="w-full bg-transparent text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
          />

          {/* Toolbar */}
          <div className="flex items-center justify-between pt-2 border-t border-[#1c1c24] mt-1">
            <div className="flex items-center gap-1 text-slate-500">
              <button
                type="button"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#1a1a20] transition-colors"
                title="Attach context"
              >
                <Paperclip className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#f95721] hover:bg-[#ea4710] disabled:bg-[#f95721]/40 text-white text-xs font-semibold shadow-md shadow-[#f95721]/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed"
            >
              <span>{isLoading ? 'Processing Pipeline...' : 'Send'}</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
