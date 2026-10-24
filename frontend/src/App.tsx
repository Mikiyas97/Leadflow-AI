import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { LeadExplorerView } from './components/LeadExplorerView';
import { LeadDetailModal } from './components/LeadDetailModal';
import { OutreachReviewView } from './components/OutreachReviewView';
import { ActivityFeedView } from './components/ActivityFeedView';
import { DiscoveryModal } from './components/DiscoveryModal';
import type { DashboardStats } from './types';
import { api } from './services/api';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'leads' | 'outreach' | 'activity'>('dashboard');
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState<boolean>(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);

  const [systemHealth, setSystemHealth] = useState({
    online: true,
    gemini: false,
    hunter: false,
    firecrawl: false,
  });

  const loadStats = async () => {
    try {
      setLoadingStats(true);
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadHealth = async () => {
    try {
      const res = await api.checkHealth();
      setSystemHealth({
        online: res.status === 'healthy',
        gemini: res.gemini_configured,
        hunter: res.hunter_configured,
        firecrawl: res.firecrawl_configured,
      });
    } catch {
      setSystemHealth((prev) => ({ ...prev, online: false }));
    }
  };

  useEffect(() => {
    loadStats();
    loadHealth();
  }, []);

  const handleRunFinished = () => {
    loadStats();
    loadHealth();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenDiscovery={() => setIsDiscoveryOpen(true)}
        systemHealth={systemHealth}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            stats={stats}
            loading={loadingStats}
            onOpenDiscovery={() => setIsDiscoveryOpen(true)}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'leads' && (
          <LeadExplorerView
            onSelectLead={(id) => setSelectedLeadId(id)}
            onOpenDiscovery={() => setIsDiscoveryOpen(true)}
          />
        )}

        {activeTab === 'outreach' && (
          <OutreachReviewView />
        )}

        {activeTab === 'activity' && (
          <ActivityFeedView />
        )}
      </main>

      {/* Lead Detail Modal */}
      <LeadDetailModal
        leadId={selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
        onRefreshList={loadStats}
      />

      {/* Discovery Modal */}
      <DiscoveryModal
        isOpen={isDiscoveryOpen}
        onClose={() => setIsDiscoveryOpen(false)}
        onRunFinished={handleRunFinished}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">LeadFlow AI Agent</span>
            <span>•</span>
            <span>Mikiyas Hulualem — Full-Stack AI Web Developer</span>
          </div>
          <div>
            Built with React, TypeScript, FastAPI, Gemini API, Hunter.io, and Firecrawl
          </div>
        </div>
      </footer>

    </div>
  );
};

export default App;
