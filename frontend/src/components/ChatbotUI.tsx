import React, { useState, useRef, useEffect } from 'react';
import {
  Flame,
  Globe,
  Newspaper,
  Image as ImageIcon,
  Code2,
  GraduationCap,
  Sparkles,
  SlidersHorizontal,
  FileText,
  Send,
  RotateCcw,
  User,
  Copy,
  Check
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
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: "Hello! I am **LeadFlow AI**, your autonomous B2B Sales Operations Agent. How can I help you discover leads, research companies, or draft personalized outreach today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<string>('Web');
  const [activeMode, setActiveMode] = useState<'search' | 'scrape' | 'map' | 'crawl'>('search');
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
      // Connect to existing agent backend
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
        content: `I encountered an issue connecting to the agent backend: ${err.message || 'Server unavailable'}. Please verify that the backend is running.`,
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
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: "Chat cleared. What company research, ICP criteria, or outreach draft would you like to work on?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="relative min-h-screen bg-[#080809] bg-grid-lines text-slate-100 flex flex-col font-sans selection:bg-[#f95721] selection:text-white">
      
      {/* Top Header matching Firecrawl reference */}
      <header className="border-b border-[#1c1c1f] bg-[#0c0c0e]/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          
          {/* Logo & Team */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-[#f95721] flex items-center justify-center text-white shadow-md shadow-[#f95721]/20">
                <Flame className="w-4 h-4 fill-current" />
              </div>
              <span className="font-bold text-sm tracking-tight text-white">LeadFlow AI</span>
            </div>

            <div className="h-4 w-[1px] bg-[#27272a] hidden sm:block" />

            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#161618] border border-[#27272a] text-xs text-slate-300">
              <span className="h-4 w-4 rounded bg-[#f95721]/20 text-[#f95721] font-bold text-[10px] flex items-center justify-center">
                P
              </span>
              <span>Personal Team</span>
              <span className="text-slate-500 text-[10px]">▾</span>
            </div>
          </div>

          {/* Right Header Navigation matching reference */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleResetChat}
              title="Clear conversation"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#18181b] transition-colors text-xs flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Reset</span>
            </button>

            <div className="hidden md:flex items-center gap-3 text-xs text-slate-400 border-l border-[#27272a] pl-3">
              <span className="hover:text-white cursor-pointer transition-colors">Help</span>
              <span className="hover:text-white cursor-pointer transition-colors">Docs</span>
            </div>

            <button
              className="px-3 py-1.5 rounded-lg bg-[#f95721] hover:bg-[#ea4710] text-white text-xs font-semibold shadow-sm transition-all"
            >
              Upgrade
            </button>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 flex flex-col justify-between">
        
        {/* Top Segment Mode Selector matching reference */}
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center gap-8 text-[10px] tracking-wider font-semibold text-slate-500 uppercase mb-2">
            <span>Discover</span>
            <span>Extract</span>
            <span>Crawl</span>
          </div>

          <div className="inline-flex items-center p-1 rounded-xl bg-[#121214] border border-[#242428] text-xs">
            <button
              onClick={() => setActiveMode('search')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-medium transition-all ${
                activeMode === 'search'
                  ? 'bg-[#1e1e24] text-white border border-[#33333d] shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-[#f95721]" />
              <span>Search</span>
            </button>

            <button
              onClick={() => setActiveMode('scrape')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-medium transition-all ${
                activeMode === 'scrape'
                  ? 'bg-[#1e1e24] text-white border border-[#33333d] shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-400" />
              <span>Scrape</span>
            </button>

            <button
              onClick={() => setActiveMode('map')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-medium transition-all ${
                activeMode === 'map'
                  ? 'bg-[#1e1e24] text-white border border-[#33333d] shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Map</span>
            </button>

            <button
              onClick={() => setActiveMode('crawl')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-medium transition-all ${
                activeMode === 'crawl'
                  ? 'bg-[#1e1e24] text-white border border-[#33333d] shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Crawl</span>
            </button>
          </div>
        </div>

        {/* Message Area */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-1 max-h-[50vh]">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
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
                  {/* Markdown or plain text content */}
                  <div className="whitespace-pre-wrap font-sans space-y-2">
                    {msg.content}
                  </div>

                  {/* Message footer with timestamp and copy button */}
                  <div className="mt-2 pt-1 border-t border-[#22222a]/50 flex items-center justify-between text-[10px] text-slate-500">
                    <span>{msg.timestamp}</span>
                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="hover:text-slate-300 transition-colors flex items-center gap-1"
                      title="Copy response"
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
          })}

          {/* Agent Loading Indicator */}
          {isLoading && (
            <div className="flex items-start gap-3 justify-start animate-fade-in">
              <div className="h-7 w-7 rounded-lg bg-[#f95721] flex items-center justify-center text-white shrink-0 shadow-sm mt-0.5 animate-pulse">
                <Flame className="w-3.5 h-3.5 fill-current" />
              </div>
              <div className="px-4 py-3 rounded-2xl bg-[#121215] border border-[#24242c] rounded-tl-sm text-xs text-slate-400 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#f95721] animate-ping" />
                <span>Agent is analyzing and synthesizing...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts Suggestions (if only welcome message) */}
        {messages.length === 1 && !isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            {QUICK_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSend(prompt)}
                className="text-left p-2.5 rounded-xl bg-[#121214] hover:bg-[#18181c] border border-[#222226] hover:border-[#33333d] text-xs text-slate-300 hover:text-white transition-all flex items-center justify-between group"
              >
                <span className="truncate">{prompt}</span>
                <span className="text-slate-500 group-hover:text-[#f95721] transition-colors ml-2">➔</span>
              </button>
            ))}
          </div>
        )}

        {/* Central Chat Input Card matching the Firecrawl reference */}
        <div className="bg-[#121215] border border-[#24242b] rounded-2xl p-3.5 shadow-2xl relative">
          
          {/* Top Category Sub-Pills inside the card */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 border-b border-[#1c1c24] text-[11px]">
            {[
              { id: 'Web', icon: Globe },
              { id: 'News', icon: Newspaper },
              { id: 'Images', icon: ImageIcon },
              { id: 'Developer', icon: Code2 },
              { id: 'Research Free', icon: GraduationCap, badge: 'Free' },
              { id: 'Alexandria', icon: Sparkles },
            ].map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 ${
                    isActive
                      ? 'bg-[#22222b] text-white border border-[#383848]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#181820]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 text-slate-400" />
                  <span>{cat.id.replace(' Free', '')}</span>
                  {cat.badge && (
                    <span className="text-[10px] text-[#f95721] font-semibold">Free</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Message Text Input */}
          <div className="relative">
            <textarea
              ref={inputRef}
              rows={3}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask LeadFlow AI to find leads, research a company, or draft cold outreach emails..."
              className="w-full bg-transparent text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Bottom Toolbar row inside the card */}
          <div className="flex items-center justify-between pt-2 border-t border-[#1c1c24] mt-1">
            
            {/* Left Icons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#1a1a20] transition-colors"
                title="Search filters"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#1a1a20] transition-colors"
                title="Attach context or file"
              >
                <FileText className="w-4 h-4" />
              </button>
            </div>

            {/* Right Buttons: Get Code & Vibrant Orange Send button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSend("Show me the API curl request for this agent")}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18181f] hover:bg-[#20202a] text-slate-300 text-xs font-medium border border-[#2b2b38] transition-colors"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Get code</span>
              </button>

              <button
                type="button"
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#f95721] hover:bg-[#ea4710] disabled:bg-[#f95721]/50 text-white text-xs font-semibold shadow-md shadow-[#f95721]/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed"
              >
                <span>{isLoading ? 'Searching...' : 'Start searching'}</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </div>

        {/* Footer subtle link matching the reference */}
        <div className="text-center mt-4">
          <button
            onClick={() => handleSend("Show me the latest activity logs and recent runs")}
            className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-4 transition-colors"
          >
            See all in Activity Logs
          </button>
        </div>

      </div>

    </div>
  );
};
