import React from 'react';
import {
  Sparkles,
  LayoutDashboard,
  Users,
  Mail,
  Activity,
  PlusCircle,
  CheckCircle2
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'dashboard' | 'leads' | 'outreach' | 'activity';
  setActiveTab: (tab: 'dashboard' | 'leads' | 'outreach' | 'activity') => void;
  onOpenDiscovery: () => void;
  systemHealth: {
    online: boolean;
    gemini: boolean;
    hunter: boolean;
    firecrawl: boolean;
  };
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenDiscovery,
  systemHealth,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-tight">LeadFlow</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
                AI Agent
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Autonomous B2B Prospecting & Outreach</p>
          </div>
        </div>

        {/* Navigation tabs */}
        <nav className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden md:inline">Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('leads')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'leads'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="hidden md:inline">Lead Explorer</span>
          </button>

          <button
            onClick={() => setActiveTab('outreach')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'outreach'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span className="hidden md:inline">Outreach Review</span>
          </button>

          <button
            onClick={() => setActiveTab('activity')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'activity'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span className="hidden md:inline">Activity Logs</span>
          </button>
        </nav>

        {/* CTA & System Status */}
        <div className="flex items-center gap-3">
          {/* Status Tooltip Pill */}
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300">
            <span className={`h-2 w-2 rounded-full ${systemHealth.online ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
            <span>AI Ops</span>
            <span className="text-slate-500">|</span>
            <span className="text-[11px] text-slate-400">Gemini</span>
            {systemHealth.gemini ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <span className="text-[10px] text-amber-400">demo</span>
            )}
            <span className="text-[11px] text-slate-400">Hunter</span>
            {systemHealth.hunter ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <span className="text-[10px] text-amber-400">demo</span>
            )}
          </div>

          <button
            onClick={onOpenDiscovery}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 text-white font-medium text-xs shadow-lg shadow-brand-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Discover Leads</span>
          </button>
        </div>

      </div>
    </header>
  );
};
