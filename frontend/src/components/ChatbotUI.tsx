import React, { useState, useRef, useEffect } from 'react';
import {
  Flame,
  Send,
  RotateCcw,
  User,
  Copy,
  Check,
  Paperclip,
  Sparkles
} from 'lucide-react';
import type { ChatMessage } from '../types';
import { api } from '../services/api';

const QUICK_PROMPTS = [
  "Find B2B SaaS startups in the US with 20-100 employees",
  "Research Stripe's value proposition and target customer fit",
  "Find executive contacts and emails for Linear.app",
  "Draft a consultative cold email for a Head of Sales",
];

export const ChatbotUI: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
      };

      setMessages((prev) => [...prev, agentMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Connection error: ${err.message || 'Agent backend unavailable'}. Please check that the server is running.`,
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
        <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-1 min-h-[50vh]">
          {messages.length === 0 ? (
            /* Empty State: Focused on Starting */
            <div className="h-full flex flex-col items-center justify-center text-center py-12 animate-fade-in">
              <div className="h-12 w-12 rounded-2xl bg-[#f95721]/15 border border-[#f95721]/30 flex items-center justify-center text-[#f95721] mb-4 shadow-lg shadow-[#f95721]/10">
                <Flame className="w-6 h-6 fill-current" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                How can LeadFlow AI help you today?
              </h1>
              <p className="text-xs text-slate-400 mt-1.5 max-w-md">
                Ask about B2B company research, discovering target prospects, verifying contacts, or crafting consultative outreach emails.
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
                    className={`relative max-w-2xl px-4 py-3 rounded-2xl text-xs leading-relaxed ${
                      isUser
                        ? 'bg-[#1e1e24] text-slate-100 border border-[#2d2d38] rounded-tr-sm shadow-sm'
                        : 'bg-[#121215] text-slate-200 border border-[#24242c] rounded-tl-sm shadow-sm'
                    }`}
                  >
                    <div className="whitespace-pre-wrap font-sans space-y-2">
                      {msg.content}
                    </div>

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
                <span>Agent is generating response...</span>
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
            placeholder="Ask LeadFlow AI to find leads, research a company, or draft an email..."
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
              <span>{isLoading ? 'Thinking...' : 'Send'}</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
