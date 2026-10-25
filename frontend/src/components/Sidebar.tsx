import React from 'react';
import {
  Flame,
  LayoutDashboard,
  Users,
  MailCheck,
  Sparkles,
  MessageSquareCode,
  Compass,
  ChevronRight,
  X,
  Plus,
  MessageSquare,
  Trash2,
  Edit3
} from 'lucide-react';
import type { ChatSession } from '../types';

export type ActiveTab = 'agent' | 'dashboard' | 'search-leads' | 'manage-leads' | 'outreach' | 'activity';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenDiscovery: () => void;
  onOpenTestSmtp?: () => void;
  isBackendHealthy?: boolean;
  overdueCount?: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  chatSessions?: ChatSession[];
  activeSessionId?: string;
  onSelectSession?: (sessionId: string) => void;
  onNewChat?: () => void;
  onDeleteSession?: (sessionId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onOpenDiscovery,
  overdueCount = 0,
  isOpenMobile,
  onCloseMobile,
  chatSessions = [],
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
}) => {
  const mainNavItems = [
    {
      id: 'agent' as ActiveTab,
      label: 'AI Sales Agent',
      desc: 'Interactive Prospecting',
      icon: MessageSquareCode,
    },
    {
      id: 'dashboard' as ActiveTab,
      label: 'Dashboard & Metrics',
      desc: 'Performance & Overdue',
      icon: LayoutDashboard,
      badge: overdueCount > 0 ? `${overdueCount} overdue` : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    {
      id: 'search-leads' as ActiveTab,
      label: 'Search Leads',
      desc: 'AI Discovery & Hunting',
      icon: Compass,
    },
    {
      id: 'manage-leads' as ActiveTab,
      label: 'Manage Leads',
      desc: 'Saved Pipeline & Status',
      icon: Users,
    },
    {
      id: 'outreach' as ActiveTab,
      label: 'Outreach Review',
      desc: 'Edit, Approve & SMTP Send',
      icon: MailCheck,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden transition-opacity"
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0a0a0d] border-r border-[#1e1e26] flex flex-col justify-between transition-transform duration-300 ease-in-out md:translate-x-0 ${isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
          }`}
      >
        {/* Top Header & Navigation */}
        <div className="flex flex-col flex-1 overflow-y-auto">

          {/* Brand Header */}
          <div className="p-4 border-b border-[#1c1c24] flex items-center justify-between">
            <button
              onClick={() => {
                onTabChange('agent');
                onCloseMobile();
              }}
              className="flex items-center gap-2.5 group text-left"
            >
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#f95721] to-[#ff7d47] flex items-center justify-center text-white shadow-lg shadow-[#f95721]/20 group-hover:scale-105 transition-transform">
                <Flame className="w-5 h-5 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm tracking-tight text-white group-hover:text-[#f95721] transition-colors">
                    LeadFlow AI
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  Sales Operations Agent
                </div>
              </div>
            </button>

            {/* Mobile Close Button */}
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white md:hidden hover:bg-[#181822]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* New Run Primary CTA */}
          <div className="p-3">

          </div>

          {/* Navigation Links */}
          <nav className="px-3 py-2 space-y-4">

            {/* Section 1: Main Pipeline */}
            <div className="space-y-1">
              <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Prospecting Pipeline
              </div>

              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <div key={item.id} className="space-y-1">
                    <button
                      onClick={() => {
                        onTabChange(item.id);
                        onCloseMobile();
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all group ${isActive
                        ? 'bg-[#181824] text-white border border-[#2c2c3e] shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#121218]'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-1.5 rounded-lg transition-colors ${isActive
                            ? 'bg-[#f95721] text-white shadow-sm'
                            : 'bg-[#14141c] text-slate-400 group-hover:text-[#f95721]'
                            }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div
                            className={`text-xs font-semibold ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'
                              }`}
                          >
                            {item.label}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {item.desc}
                          </div>
                        </div>
                      </div>

                      {item.badge ? (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${item.badgeColor}`}
                        >
                          {item.badge}
                        </span>
                      ) : (
                        <ChevronRight
                          className={`w-3.5 h-3.5 text-slate-600 transition-transform ${isActive ? 'text-[#f95721] translate-x-0.5' : 'opacity-0 group-hover:opacity-100'
                            }`}
                        />
                      )}
                    </button>

                    {/* Chat History & New Chat section under AI Sales Agent */}
                    {item.id === 'agent' && (
                      <div className="ml-3 pl-3 border-l border-[#1f1f2c] space-y-1.5 pt-1 pb-1">
                        {/* New Chat Button */}
                        {onNewChat && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onTabChange('agent');
                              onNewChat();
                              onCloseMobile();
                            }}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#121218] hover:bg-[#1c1c26] border border-[#22222e] hover:border-[#f95721]/40 text-xs font-semibold text-slate-300 hover:text-white transition-all group/new shadow-sm"
                            title="Start a new conversation"
                          >
                            <span className="flex items-center gap-2">
                              <Plus className="w-3.5 h-3.5 text-[#f95721] group-hover/new:rotate-90 transition-transform" />
                              <span>New Chat</span>
                            </span>
                            <span className="text-[9px] text-slate-500 font-mono px-1 py-0.2 rounded bg-[#181822] border border-[#242432]">
                              +
                            </span>
                          </button>
                        )}

                        {/* Recent Chat Sessions List */}
                        {chatSessions && chatSessions.length > 0 && (
                          <div className="space-y-0.5 pt-1 max-h-52 overflow-y-auto no-scrollbar">
                            <div className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                              <span>Chat History</span>
                              <span className="font-mono text-[9px] text-slate-400">({chatSessions.length})</span>
                            </div>

                            {chatSessions.map((sess) => {
                              const isCurrent = activeTab === 'agent' && activeSessionId === sess.id;
                              return (
                                <div
                                  key={sess.id}
                                  onClick={() => {
                                    onSelectSession?.(sess.id);
                                    onTabChange('agent');
                                    onCloseMobile();
                                  }}
                                  className={`group/sess w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-all ${isCurrent
                                    ? 'bg-[#1b1b28] text-white font-medium border border-[#2f2f44] shadow-sm'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#13131a]'
                                    }`}
                                  title={sess.title}
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <MessageSquare className={`w-3 h-3 shrink-0 ${isCurrent ? 'text-[#f95721]' : 'text-slate-500 group-hover/sess:text-slate-400'}`} />
                                    <span className="truncate text-[11px] leading-tight">{sess.title || 'Conversation'}</span>
                                  </div>

                                  {onDeleteSession && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteSession(sess.id);
                                      }}
                                      className="opacity-0 group-hover/sess:opacity-100 p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all shrink-0 ml-1"
                                      title="Delete conversation"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </nav>
        </div>

      </aside>
    </>
  );
};
