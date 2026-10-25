import React, { useState, useEffect } from 'react';
import { Sidebar, type ActiveTab } from './components/Sidebar';
import { ChatbotUI } from './components/ChatbotUI';
import { DashboardView } from './components/DashboardView';
import { SearchLeadsView } from './components/SearchLeadsView';
import { ManageLeadsView } from './components/ManageLeadsView';
import { OutreachReviewView } from './components/OutreachReviewView';
import { ActivityFeedView } from './components/ActivityFeedView';
import { LeadDetailModal } from './components/LeadDetailModal';
import { DiscoveryModal } from './components/DiscoveryModal';
import type { DashboardStats, TargetProfile, ChatSession, ChatMessage } from './types';
import { api } from './services/api';
import { KeyRound, Send, CheckCircle2, AlertCircle, Menu, Flame } from 'lucide-react';

const createNewSession = (): ChatSession => {
  const id = `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  return {
    id,
    title: 'New Chat',
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    try {
      const saved = localStorage.getItem('leadflow_active_tab');
      if (saved && ['agent', 'dashboard', 'search-leads', 'manage-leads', 'outreach', 'activity'].includes(saved)) {
        return saved as ActiveTab;
      }
    } catch {
      // ignore
    }
    return 'agent';
  });

  // Chat sessions state
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem('leadflow_chat_sessions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return [createNewSession()];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('leadflow_active_session_id');
      if (saved) return saved;
    } catch {
      // ignore
    }
    return '';
  });

  // Ensure activeSessionId points to an existing session
  useEffect(() => {
    if (chatSessions.length > 0) {
      const exists = chatSessions.some((s) => s.id === activeSessionId);
      if (!exists) {
        setActiveSessionId(chatSessions[0].id);
      }
    }
  }, [chatSessions, activeSessionId]);

  // Persist sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('leadflow_chat_sessions', JSON.stringify(chatSessions));
    } catch {
      // ignore
    }
  }, [chatSessions]);

  // Persist activeSessionId to localStorage
  useEffect(() => {
    try {
      if (activeSessionId) {
        localStorage.setItem('leadflow_active_session_id', activeSessionId);
      }
    } catch {
      // ignore
    }
  }, [activeSessionId]);

  const handleNewChat = () => {
    const active = chatSessions.find((s) => s.id === activeSessionId);
    if (active && active.messages.length === 0) {
      setActiveTab('agent');
      return;
    }

    const fresh = createNewSession();
    setChatSessions((prev) => [fresh, ...prev]);
    setActiveSessionId(fresh.id);
    setActiveTab('agent');
  };

  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setActiveTab('agent');
  };

  const handleDeleteSession = (sessionId: string) => {
    setChatSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== sessionId);
      if (filtered.length === 0) {
        const fresh = createNewSession();
        setActiveSessionId(fresh.id);
        return [fresh];
      }
      if (activeSessionId === sessionId) {
        setActiveSessionId(filtered[0].id);
      }
      return filtered;
    });
  };

  const handleUpdateSessionMessages = (
    sessionId: string,
    newMessages: ChatMessage[],
    customTitle?: string
  ) => {
    setChatSessions((prev) =>
      prev.map((session) => {
        if (session.id !== sessionId) return session;

        let title = session.title;
        if (customTitle) {
          title = customTitle;
        } else if ((session.title === 'New Chat' || !session.title) && newMessages.length > 0) {
          const firstUserMsg = newMessages.find((m) => m.role === 'user');
          if (firstUserMsg && firstUserMsg.content) {
            const clean = firstUserMsg.content.trim().replace(/^["']|["']$/g, '');
            title = clean.length > 36 ? `${clean.substring(0, 36)}...` : clean;
          }
        }

        return {
          ...session,
          title,
          messages: newMessages,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const activeSession = chatSessions.find((s) => s.id === activeSessionId) || chatSessions[0] || null;
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
    try {
      localStorage.setItem('leadflow_active_tab', activeTab);
    } catch {
      // ignore
    }
  }, [activeTab]);

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
        chatSessions={chatSessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
      />

      {/* Main Content Area */}
      <div className={`flex-1 md:ml-64 flex flex-col min-w-0 bg-[#09090b] ${activeTab === 'agent' ? 'h-screen max-h-screen overflow-hidden' : 'min-h-screen'}`}>
        
        {/* Mobile Header Bar */}
        <header className="md:hidden flex items-center justify-between p-3.5 bg-[#0a0a0d] border-b border-[#1c1c24] sticky top-0 z-30 shrink-0">
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
        <main className={`flex-1 flex flex-col ${activeTab === 'agent' ? 'min-h-0 overflow-hidden' : ''}`}>
          {activeTab === 'agent' && (
            <ChatbotUI
              session={activeSession || undefined}
              onUpdateSessionMessages={handleUpdateSessionMessages}
              onNewChat={handleNewChat}
            />
          )}

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

          <div className={activeTab === 'search-leads' ? 'flex-1 flex flex-col' : 'hidden'}>
            <SearchLeadsView
              onSelectLead={(id) => setSelectedLeadId(id)}
              onNavigateToManage={() => setActiveTab('manage-leads')}
              onNavigateToOutreach={() => setActiveTab('outreach')}
              onRefreshParentStats={loadStatsSilently}
            />
          </div>

          {activeTab === 'manage-leads' && (
            <ManageLeadsView
              onSelectLead={(id) => setSelectedLeadId(id)}
              onNavigateToSearch={() => setActiveTab('search-leads')}
              onRefreshParentStats={loadStatsSilently}
            />
          )}

          {activeTab === 'outreach' && (
            <OutreachReviewView onRefreshStats={loadStatsSilently} />
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
