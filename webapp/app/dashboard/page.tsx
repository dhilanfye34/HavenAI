'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { AgentPanel } from './components/AgentPanel';
import { AlertFeed } from './components/AlertFeed';
import { ChatPanel } from './components/ChatPanel';
import { HealthScore } from './components/HealthScore';
import { QuickStats } from './components/QuickStats';
import { Recommendations } from './components/Recommendations';
import { ResourceMonitor } from './components/ResourceMonitor';
import { SetupPanel } from './components/SetupPanel';
import { TopBar } from './components/TopBar';
import { useAgentStatus } from './hooks/useAgentStatus';
import { useAlerts } from './hooks/useAlerts';
import { useChat } from './hooks/useChat';
import { useSetupPreferences } from './hooks/useSetupPreferences';
import { mockRecommendations, mockSecurityStats } from './services/mockAgents';

type LocalUser = {
  email?: string;
  full_name?: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<LocalUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  const { agents } = useAgentStatus();
  const { alerts, counts, latestAlertId } = useAlerts();
  const {
    preferences,
    protectionStatus,
    loading: setupLoading,
    saving: setupSaving,
    error: setupError,
    saveError: setupSaveError,
    saveSuccess: setupSaveSuccess,
    save: saveSetupPreferences,
  } = useSetupPreferences(token);
  const {
    messages,
    isResponding,
    connectionStatus,
    connectionLabel,
    contextEvents,
    injectAlertContext,
    injectRecommendationContext,
    sendMessage,
  } = useChat();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }
    setToken(token);

    try {
      setUser(JSON.parse(userData));
    } catch {
      setUser({ email: 'Unknown user' });
    }

    const isWide = window.innerWidth >= 1280;
    setLeftOpen(isWide);
    setRightOpen(isWide);
    setIsReady(true);
  }, [router]);

  const notificationCount = useMemo(
    () => counts.critical + counts.warning,
    [counts.critical, counts.warning],
  );

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <p className="text-sm text-gray-400">Loading command center...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <TopBar
        userLabel={user?.full_name || user?.email || 'Security Operator'}
        notificationCount={notificationCount}
        leftOpen={leftOpen}
        rightOpen={rightOpen}
        onToggleLeft={() => setLeftOpen((value) => !value)}
        onToggleRight={() => setRightOpen((value) => !value)}
        onLogout={handleLogout}
      />

      <main className="mx-auto max-w-[1600px] px-4 py-4 md:px-6">
        <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_320px]">
          <aside className={`${leftOpen ? 'block' : 'hidden'} xl:block`}>
            <SetupPanel
              preferences={preferences}
              loading={setupLoading}
              saving={setupSaving}
              error={setupError}
              saveError={setupSaveError}
              saveSuccess={
                setupSaveSuccess ||
                (protectionStatus?.has_devices
                  ? 'Desktop connected. Monitoring modules available.'
                  : null)
              }
              recentAlerts={alerts}
              onSave={saveSetupPreferences}
            />
            <AgentPanel agents={agents} />
            <AlertFeed
              alerts={alerts}
              latestAlertId={latestAlertId}
              onSelectAlert={(alert) => injectAlertContext(alert)}
            />
          </aside>

          <section className="min-w-0">
            <ChatPanel
              messages={messages}
              isResponding={isResponding}
              connectionStatus={connectionStatus}
              connectionLabel={connectionLabel}
              contextEvents={contextEvents}
              onSendMessage={sendMessage}
            />
          </section>

          <aside className={`${rightOpen ? 'block' : 'hidden'} space-y-4 xl:block`}>
            <HealthScore score={mockSecurityStats.healthScore} />
            <QuickStats stats={mockSecurityStats} />
            <ResourceMonitor stats={mockSecurityStats} />
            <Recommendations
              recommendations={mockRecommendations}
              onSelect={(recommendation) => injectRecommendationContext(recommendation)}
            />
          </aside>
        </div>
      </main>
    </div>
  );
}
