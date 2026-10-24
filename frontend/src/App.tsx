import React, { useState, useEffect } from 'react';
import { Sidebar, type ActiveTab } from './components/Sidebar';
import { ChatbotUI } from './components/ChatbotUI';
import { DashboardView } from './components/DashboardView';
import { LeadExplorerView } from './components/LeadExplorerView';
import { OutreachReviewView } from './components/OutreachReviewView';
import { CriteriaAndSchedulesView } from './components/CriteriaAndSchedulesView';
import { ActivityFeedView } from './components/ActivityFeedView';
import { LeadDetailModal } from './components/LeadDetailModal';
import { DiscoveryModal } from './components/DiscoveryModal';
import type { DashboardStats, TargetProfile } from './types';
import { api } from './services/api';
import { KeyRound, Send, CheckCircle2, AlertCircle, Menu, Flame } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('agent');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean>(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Modals
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState<boolean>(false);
  const [discoveryProfile, setDiscoveryProfile] = useState<TargetProfile | null>(null);

  // Test SMTP Modal
  const [isTestSmtpOpen, setIsTestSmtpOpen] = useState<boolean>(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState<string>('');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState<boolean>(false);
  const [testEmailFeedback, setTestEmailFeedback] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    checkHealthAndLoadStats();
    const interval = setInterval(loadStatsSilently, 15000);
    return () => clearInterval(interval);
  }, []);

  const checkHealthAndLoadStats = async () => {
    try {
      setLoadingStats(true);
      const health = await api.checkHealth();
      setIsBackendHealthy(health.status === 'healthy');
      const statsData = await api.getDashboardStats();
      setStats(statsData);
    } catch {
      setIsBackendHealthy(false);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadStatsSilently = async () => {
    try {
      const statsData = await api.getDashboardStats();
      setStats(statsData);
      setIsBackendHealthy(true);
    } catch {
      setIsBackendHealthy(false);
    }
  };

  const handleRunTestEmail = async () => {
    if (!testEmailRecipient.trim()) {
      setTestEmailFeedback({ success: false, message: 'Please enter a valid recipient address.' });
      return;
    }

    try {
      setIsSendingTestEmail(true);
      setTestEmailFeedback(null);
      const res = await api.sendTestEmail(testEmailRecipient.trim());
      setTestEmailFeedback({ success: true, message: res.message });
      setTimeout(() => {
        setIsTestSmtpOpen(false);
        setTestEmailFeedback(null);
      }, 3500);
    } catch (err: any) {
      setTestEmailFeedback({
        success: false,
        message: err.message || 'SMTP test failed. Please verify GMAIL_USER and GMAIL_APP_PASSWORD in backend .env',
      });
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-slate-100 flex font-sans selection:bg-[#f95721] selection:text-white">
      
      {/* Side Navigation Bar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenDiscovery={() => {
          setDiscoveryProfile(null);
          setIsDiscoveryOpen(true);
        }}
        onOpenTestSmtp={() => setIsTestSmtpOpen(true)}
        isBackendHealthy={isBackendHealthy}
        overdueCount={stats?.overdue_followups_count || 0}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 flex flex-col min-w-0 min-h-screen bg-[#09090b]">
        
        {/* Mobile Header Bar */}
        <header className="md:hidden flex items-center justify-between p-3.5 bg-[#0a0a0d] border-b border-[#1c1c24] sticky top-0 z-30">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-2 rounded-xl bg-[#14141c] border border-[#22222e] text-slate-300 hover:text-white"
            aria-label="Open Navigation Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-[#f95721] flex items-center justify-center text-white">
              <Flame className="w-4 h-4 fill-current" />
            </div>
            <span className="font-bold text-sm text-white">LeadFlow AI</span>
          </div>

          <div
            className={`h-2.5 w-2.5 rounded-full ${
              isBackendHealthy ? 'bg-emerald-400' : 'bg-red-500 animate-pulse'
            }`}
          />
        </header>

        {/* View Content */}
        <main className="flex-1 flex flex-col">
          {activeTab === 'agent' && <ChatbotUI />}

          {activeTab === 'dashboard' && (
            <DashboardView
              stats={stats}
              loading={loadingStats}
              onRefresh={checkHealthAndLoadStats}
              onNavigateTab={setActiveTab}
              onOpenDiscovery={() => {
                setDiscoveryProfile(null);
                setIsDiscoveryOpen(true);
              }}
              onSelectLead={(id) => setSelectedLeadId(id)}
            />
          )}

          {activeTab === 'leads' && (
            <LeadExplorerView
              onSelectLead={(id) => setSelectedLeadId(id)}
              onOpenDiscovery={() => {
                setDiscoveryProfile(null);
                setIsDiscoveryOpen(true);
              }}
            />
          )}

          {activeTab === 'outreach' && (
            <OutreachReviewView onRefreshStats={loadStatsSilently} />
          )}

          {activeTab === 'criteria' && (
            <CriteriaAndSchedulesView
              onOpenDiscoveryWithProfile={(p) => {
                setDiscoveryProfile(p);
                setIsDiscoveryOpen(true);
              }}
              onRefreshDashboard={loadStatsSilently}
            />
          )}

          {activeTab === 'activity' && <ActivityFeedView />}
        </main>
      </div>

      {/* Global Lead Detail Modal */}
      {selectedLeadId && (
        <LeadDetailModal
          leadId={selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
          onRefreshParent={loadStatsSilently}
        />
      )}

      {/* Global Discovery Trigger Modal */}
      <DiscoveryModal
        isOpen={isDiscoveryOpen}
        onClose={() => {
          setIsDiscoveryOpen(false);
          setDiscoveryProfile(null);
        }}
        onRunStarted={() => {
          loadStatsSilently();
          setActiveTab('dashboard');
        }}
        initialProfile={discoveryProfile}
      />

      {/* Test SMTP Modal */}
      {isTestSmtpOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121217] border border-[#282836] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-2 border-b border-[#1e1e28]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#f95721]" />
                <span>Verify Gmail SMTP Dispatch Connection</span>
              </h3>
              <button
                onClick={() => {
                  setIsTestSmtpOpen(false);
                  setTestEmailFeedback(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Sends an immediate test email to verify that your configured Gmail App Password, host, and port are ready for authorized human-approved campaigns.
            </p>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Recipient Email Address
              </label>
              <input
                type="email"
                value={testEmailRecipient}
                onChange={(e) => setTestEmailRecipient(e.target.value)}
                placeholder="your-email@example.com"
                className="w-full mt-1.5 px-3 py-2 rounded-xl bg-[#0c0c10] border border-[#22222e] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#f95721]"
              />
            </div>

            {testEmailFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                  testEmailFeedback.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}
              >
                {testEmailFeedback.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span>{testEmailFeedback.message}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1e1e28]">
              <button
                type="button"
                onClick={() => {
                  setIsTestSmtpOpen(false);
                  setTestEmailFeedback(null);
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRunTestEmail}
                disabled={isSendingTestEmail}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f95721] hover:bg-[#ea4710] text-white font-bold text-xs shadow transition-all disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingTestEmail ? 'Sending Test...' : 'Send Test Email'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;
