import React from 'react';
import {
  Flame,
  LayoutDashboard,
  Users,
  MailCheck,
  Sliders,
  History,
  Sparkles,
  KeyRound,
  MessageSquareCode,
  Compass,
  ChevronRight,
  X
} from 'lucide-react';

export type ActiveTab = 'agent' | 'dashboard' | 'search-leads' | 'manage-leads' | 'outreach' | 'criteria' | 'activity';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenDiscovery: () => void;
  onOpenTestSmtp: () => void;
  isBackendHealthy: boolean;
  overdueCount?: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onOpenDiscovery,
  onOpenTestSmtp,
  isBackendHealthy,
  overdueCount = 0,
  isOpenMobile,
  onCloseMobile,
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

  const secondaryNavItems = [
    {
      id: 'criteria' as ActiveTab,
      label: 'Criteria & Schedules',
      desc: 'ICP Profiles & FR-10 Cron',
      icon: Sliders,
    },
    {
      id: 'activity' as ActiveTab,
      label: 'Activity Audit Log',
      desc: 'Runs, Deduplication & Errors',
      icon: History,
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
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0a0a0d] border-r border-[#1e1e26] flex flex-col justify-between transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
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
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#1c1c28] text-[#f95721] border border-[#2a2a3c]">
                    v2.0
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
            <button
              onClick={() => {
                onOpenDiscovery();
                onCloseMobile();
              }}
              className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-[#f95721] via-[#ea4710] to-[#f95721] hover:brightness-110 text-white text-xs font-bold shadow-md shadow-[#f95721]/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] group"
            >
              <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              <span>Launch Discovery Run</span>
            </button>
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
                  <button
                    key={item.id}
                    onClick={() => {
                      onTabChange(item.id);
                      onCloseMobile();
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all group ${
                      isActive
                        ? 'bg-[#181824] text-white border border-[#2c2c3e] shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#121218]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-1.5 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-[#f95721] text-white shadow-sm'
                            : 'bg-[#14141c] text-slate-400 group-hover:text-[#f95721]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div
                          className={`text-xs font-semibold ${
                            isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'
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
                        className={`w-3.5 h-3.5 text-slate-600 transition-transform ${
                          isActive ? 'text-[#f95721] translate-x-0.5' : 'opacity-0 group-hover:opacity-100'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Section 2: Operations & Audit */}
            <div className="space-y-1 pt-2 border-t border-[#1a1a24]">
              <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Control & Compliance
              </div>

              {secondaryNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onTabChange(item.id);
                      onCloseMobile();
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all group ${
                      isActive
                        ? 'bg-[#181824] text-white border border-[#2c2c3e] shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#121218]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-1.5 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-[#f95721] text-white shadow-sm'
                            : 'bg-[#14141c] text-slate-400 group-hover:text-[#f95721]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div
                          className={`text-xs font-semibold ${
                            isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'
                          }`}
                        >
                          {item.label}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.desc}
                        </div>
                      </div>
                    </div>

                    <ChevronRight
                      className={`w-3.5 h-3.5 text-slate-600 transition-transform ${
                        isActive ? 'text-[#f95721] translate-x-0.5' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

          </nav>
        </div>

        {/* Bottom Status & Utilities */}
        <div className="p-3 border-t border-[#1c1c24] space-y-2.5 bg-[#08080b]">
          
          {/* Test SMTP Trigger Button */}
          <button
            onClick={() => {
              onOpenTestSmtp();
              onCloseMobile();
            }}
            className="w-full p-2 rounded-xl bg-[#121218] hover:bg-[#1a1a22] border border-[#22222e] hover:border-[#303040] text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-between transition-colors group"
          >
            <div className="flex items-center gap-2">
              <KeyRound className="w-3.5 h-3.5 text-blue-400 group-hover:rotate-12 transition-transform" />
              <span>Test Gmail SMTP</span>
            </div>
            <span className="text-[10px] text-slate-400">Port 587</span>
          </button>

          {/* Backend Health Card */}
          <div className="p-2.5 rounded-xl bg-[#0e0e13] border border-[#1e1e28] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`h-2.5 w-2.5 rounded-full ${
                  isBackendHealthy
                    ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                    : 'bg-red-500 animate-pulse shadow-sm shadow-red-500/50'
                }`}
              />
              <span className="text-[11px] font-semibold text-slate-300">
                {isBackendHealthy ? 'Backend Connected' : 'Offline / Reconnecting'}
              </span>
            </div>

            <span className="text-[9px] font-mono text-slate-400 uppercase">
              FastAPI
            </span>
          </div>

        </div>

      </aside>
    </>
  );
};
