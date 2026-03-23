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
import { RuntimeInspector } from './components/RuntimeInspector';
import { SetupPanel } from './components/SetupPanel';
import { TopBar } from './components/TopBar';
import { useAgentStatus } from './hooks/useAgentStatus';
import { useAlerts } from './hooks/useAlerts';
import { useChat } from './hooks/useChat';
import { useSetupPreferences } from './hooks/useSetupPreferences';
import { mockRecommendations } from './services/mockAgents';
import { Recommendation, SecurityStats } from './types';

type LocalUser = {
  email?: string;
  full_name?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function formatUptime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const days = Math.floor(safe / 86400);
  const hours = Math.floor((safe % 86400) / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<LocalUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [isDesktopRuntime, setIsDesktopRuntime] = useState(false);

  const { agents, runtimeStatus } = useAgentStatus();
  const { alerts, counts, latestAlertId } = useAlerts();
  const {
    preferences,
    protectionStatus,
    monitorControl,
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
    injectRuntimeContext,
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
    setIsDesktopRuntime(Boolean((window as any).havenai));
    setIsReady(true);
  }, [router]);

  const notificationCount = useMemo(
    () => counts.critical + counts.warning,
    [counts.critical, counts.warning],
  );

  useEffect(() => {
    injectRuntimeContext(runtimeStatus);
  }, [injectRuntimeContext, runtimeStatus]);

  useEffect(() => {
    if (!latestAlertId || alerts.length === 0) return;
    injectAlertContext(alerts[0]);
  }, [alerts, injectAlertContext, latestAlertId]);

  const recommendations = useMemo<Recommendation[]>(() => {
    const hasErrors = agents.some((agent) => agent.status === 'error');
    const hasCritical = counts.critical > 0;
    const cloudDisconnected = isDesktopRuntime && runtimeStatus && !runtimeStatus.cloud_connected;
    const recs: Recommendation[] = [];

    if (hasCritical) {
      recs.push({
        id: 'critical-alert-review',
        title: `Review ${counts.critical} critical alert${counts.critical === 1 ? '' : 's'} now`,
        context: 'Critical events were detected in your live alert stream.',
      });
    }
    if (hasErrors) {
      recs.push({
        id: 'agent-error-check',
        title: 'Restart or inspect agent modules with errors',
        context: 'One or more monitor modules reported an error state.',
      });
    }
    if (cloudDisconnected) {
      recs.push({
        id: 'cloud-reconnect',
        title: 'Re-authenticate device cloud sync',
        context: 'Desktop monitors are running locally, but cloud sync is currently offline.',
      });
    }
    if (recs.length === 0) {
      recs.push({
        id: 'baseline-review',
        title: 'Review baseline monitor coverage',
        context: 'All modules look healthy. Confirm your monitor and alert channels match your needs.',
      });
    }
    return recs;
  }, [agents, counts.critical, isDesktopRuntime, runtimeStatus]);

  const liveStats = useMemo<SecurityStats>(() => {
    const now = Date.now();
    const last24h = alerts.filter((alert) => now - new Date(alert.timestamp).getTime() <= 86_400_000);
    const previous24h = alerts.filter((alert) => {
      const age = now - new Date(alert.timestamp).getTime();
      return age > 86_400_000 && age <= 172_800_000;
    });
    const currentThreats = last24h.filter((alert) => alert.severity !== 'info').length;
    const previousThreats = previous24h.filter((alert) => alert.severity !== 'info').length;
    const trend =
      previousThreats === 0
        ? currentThreats > 0
          ? 100
          : 0
        : Math.round(((currentThreats - previousThreats) / previousThreats) * 100);

    const enabledModules = monitorControl
      ? {
          file_monitoring_enabled: monitorControl.desired.file,
          process_monitoring_enabled: monitorControl.desired.process,
          network_monitoring_enabled: monitorControl.desired.network,
        }
      : runtimeStatus?.enabled_modules || {
          file_monitoring_enabled: Boolean(preferences?.file_monitoring_enabled),
          process_monitoring_enabled: Boolean(preferences?.process_monitoring_enabled),
          network_monitoring_enabled: Boolean(preferences?.network_monitoring_enabled),
        };
    const enabledCount = Object.values(enabledModules).filter(Boolean).length;
    const blockedCount = monitorControl
      ? (['file', 'process', 'network'] as const).filter((m) => monitorControl.state[m] === 'blocked').length
      : 0;
    const errorCount = agents.filter((agent) => agent.status === 'error').length;
    const critical24h = last24h.filter((alert) => alert.severity === 'critical').length;
    const warning24h = last24h.filter((alert) => alert.severity === 'warning').length;

    const coverageScore = (enabledCount / 3) * 35;
    const cloudBonus = runtimeStatus?.cloud_connected ? 12 : 0;
    const stabilityScore = Math.max(0, 35 - errorCount * 15);
    const threatPenalty = Math.min(45, critical24h * 8 + warning24h * 3);
    const blockedPenalty = blockedCount * 12;
    const healthScore = Math.round(
      clamp(30 + coverageScore + cloudBonus + stabilityScore - threatPenalty - blockedPenalty, 0, 100),
    );

    const metrics = runtimeStatus?.metrics;
    const lowTelemetryPenalty =
      metrics && metrics.uptime_seconds > 60 && enabledCount > 0
        ? metrics.file_events_seen + metrics.process_events_seen + metrics.network_events_seen === 0
          ? 20
          : 0
        : 0;
    const lastFullScan =
      runtimeStatus?.last_heartbeat_at ||
      alerts[0]?.timestamp ||
      new Date().toISOString();

    return {
      threatsBlocked24h: currentThreats,
      threatsTrend: trend,
      activeConnections: metrics?.network_connection_count || 0,
      filesMonitored: metrics?.file_events_seen || 0,
      lastFullScan,
      uptime: formatUptime(metrics?.uptime_seconds || 0),
      healthScore: Math.max(0, healthScore - lowTelemetryPenalty),
      diskUsage: Math.round(metrics?.disk_usage_percent || 0),
      memoryUsage: Math.round(metrics?.memory_usage_percent || 0),
      cpuUsage: Math.round(metrics?.cpu_usage_percent || 0),
      logStorageUsage: Math.round(metrics?.log_storage_usage_percent || 0),
    };
  }, [agents, alerts, monitorControl, preferences, runtimeStatus]);

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
              runtimeStatus={runtimeStatus}
              monitorControl={monitorControl}
              onSave={saveSetupPreferences}
              isDesktopRuntime={isDesktopRuntime}
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
            <RuntimeInspector
              runtimeStatus={runtimeStatus}
              isDesktopRuntime={isDesktopRuntime}
              monitorControl={monitorControl}
            />
          </section>

          <aside className={`${rightOpen ? 'block' : 'hidden'} space-y-4 xl:block`}>
            <HealthScore score={liveStats.healthScore} />
            <QuickStats stats={liveStats} />
            <ResourceMonitor stats={liveStats} />
            <Recommendations
              recommendations={isDesktopRuntime ? recommendations : mockRecommendations}
              onSelect={(recommendation) => injectRecommendationContext(recommendation)}
            />
          </aside>
        </div>
      </main>
    </div>
  );
}
