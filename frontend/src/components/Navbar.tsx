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
  MessageSquareCode
} from 'lucide-react';

export type ActiveTab = 'agent' | 'dashboard' | 'leads' | 'outreach' | 'criteria' | 'activity';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenDiscovery: () => void;
  onOpenTestSmtp: () => void;
  isBackendHealthy: boolean;
  overdueCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onOpenDiscovery,
  onOpenTestSmtp,
  isBackendHealthy,
  overdueCount = 0,
}) => {
  const navItems = [
    { id: 'agent' as ActiveTab, label: 'AI Agent', icon: MessageSquareCode },
    { id: 'dashboard' as ActiveTab, label: 'Dashboard', icon: LayoutDashboard, badge: overdueCount > 0 ? `${overdueCount} due` : undefined },
    { id: 'leads' as ActiveTab, label: 'Lead Explorer', icon: Users },
    { id: 'outreach' as ActiveTab, label: 'Outreach Review', icon: MailCheck },
    { id: 'criteria' as ActiveTab, label: 'Criteria & Schedules', icon: Sliders },
    { id: 'activity' as ActiveTab, label: 'Audit Log', icon: History },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#0c0c10]/95 backdrop-blur-md border-b border-[#202028] px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onTabChange('agent')}
            className="flex items-center gap-2 group text-left"
          >
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-[#f95721] to-[#ff7d47] flex items-center justify-center text-white shadow-md shadow-[#f95721]/20 group-hover:scale-105 transition-transform">
              <Flame className="w-4 h-4 fill-current" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                <span>LeadFlow AI</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#20202a] text-[#f95721] border border-[#2e2e3a]">
                  v2.0
                </span>
              </div>
              <div className="text-[10px] text-slate-400 -mt-0.5 hidden sm:block">
                Autonomous B2B Sales Operations Agent
              </div>
            </div>
          </button>
        </div>

        {/* View Switcher Tabs */}
        <nav className="flex items-center gap-1 bg-[#121217] p-1 rounded-xl border border-[#202028] overflow-x-auto max-w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                  isActive
                    ? 'bg-[#f95721] text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#181820]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          
          {/* Test SMTP button */}
          <button
            onClick={onOpenTestSmtp}
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#14141a] hover:bg-[#1a1a24] text-slate-300 hover:text-white border border-[#242430] text-xs font-medium transition-colors"
            title="Verify Gmail SMTP configuration"
          >
            <KeyRound className="w-3.5 h-3.5 text-[#f95721]" />
            <span>Test SMTP</span>
          </button>

          {/* New Run Modal */}
          <button
            onClick={onOpenDiscovery}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#f95721] to-[#ea4710] hover:brightness-110 text-white text-xs font-semibold shadow-md shadow-[#f95721]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Discovery Run</span>
            <span className="sm:hidden">New Run</span>
          </button>

          {/* Health Dot */}
          <div
            className={`h-2.5 w-2.5 rounded-full shrink-0 ${
              isBackendHealthy ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-red-500 animate-pulse'
            }`}
            title={isBackendHealthy ? 'Backend API connected' : 'Backend offline'}
          />
        </div>

      </div>
    </header>
  );
};
