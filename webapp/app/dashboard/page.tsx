'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Eye, Server } from 'lucide-react';

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

type DashboardTab = 'overview' | 'runtime' | 'agents';

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

const TAB_META: { id: DashboardTab; label: string; icon: typeof Eye }[] = [
  { id: 'overview', label: 'Overview', icon: Eye },
  { id: 'runtime', label: 'Runtime', icon: Activity },
  { id: 'agents', label: 'Agents', icon: Server },
];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<LocalUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isDesktopRuntime, setIsDesktopRuntime] = useState(false);
  const [tab, setTab] = useState<DashboardTab>('overview');

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
    removeContextEvent,
    clearContextEvents,
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

    setIsDesktopRuntime(Boolean((window as any).havenai));
    setIsReady(true);
  }, [router]);

  const notificationCount = useMemo(
    () => counts.critical + counts.warning,
    [counts.critical, counts.warning],
  );
  const latestAlert = alerts[0] || null;

  useEffect(() => {
    injectRuntimeContext(runtimeStatus);
  }, [injectRuntimeContext, runtimeStatus]);

  // Alerts are only injected into chat context when the user explicitly clicks
  // one in the AlertFeed. Auto-injection was flooding the context window.

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
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          <p className="text-sm text-gray-500">Loading command center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <TopBar
        userLabel={user?.full_name || user?.email || 'Security Operator'}
        notificationCount={notificationCount}
        onLogout={handleLogout}
      />

      <nav className="border-b border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center gap-1 px-4 py-1.5 md:px-6">
          {TAB_META.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`relative inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-300 ${
                tab === id
                  ? 'text-cyan-300'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {tab === id && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" />
              )}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-[1600px] px-4 py-3 md:px-6">
        {tab === 'overview' && (
          <div className="space-y-3">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,1fr)]">
              <div className="space-y-3">
                <section className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                  <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Live Triage
                        </h2>
                        <p className="mt-0.5 text-[11px] text-gray-600">
                          Prioritized alerts and runtime signal.
                        </p>
                      </div>
                      <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] text-gray-400">
                        {alerts.length} events
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] p-3">
                        <p className="text-[11px] text-red-300">Critical</p>
                        <p className="mt-1 text-xl font-bold text-red-200">{counts.critical}</p>
                      </div>
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3">
                        <p className="text-[11px] text-amber-300">Warning</p>
                        <p className="mt-1 text-xl font-bold text-amber-200">{counts.warning}</p>
                      </div>
                      <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.06] p-3">
                        <p className="text-[11px] text-blue-300">Info</p>
                        <p className="mt-1 text-xl font-bold text-blue-200">{counts.info}</p>
                      </div>
                    </div>
                    <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                      <p className="text-[11px] text-gray-600">Latest event</p>
                      <p className="mt-1 line-clamp-1 text-sm text-gray-200">
                        {latestAlert ? latestAlert.description : 'No incoming alerts yet.'}
                      </p>
                      {latestAlert && (
                        <p className="mt-1 text-[11px] text-gray-600">
                          {latestAlert.source} &bull; {new Date(latestAlert.timestamp).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </section>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <HealthScore score={liveStats.healthScore} />
                    <QuickStats stats={liveStats} />
                  </div>
                </section>

                <AlertFeed
                  alerts={alerts}
                  latestAlertId={latestAlertId}
                  onSelectAlert={(alert) => injectAlertContext(alert)}
                />
              </div>

              <ChatPanel
                messages={messages}
                isResponding={isResponding}
                connectionStatus={connectionStatus}
                connectionLabel={connectionLabel}
                contextEvents={contextEvents}
                onSendMessage={sendMessage}
                onRemoveContext={removeContextEvent}
                onClearContext={clearContextEvents}
              />
            </div>
          </div>
        )}

        {tab === 'runtime' && (
          <RuntimeInspector
            runtimeStatus={runtimeStatus}
            isDesktopRuntime={isDesktopRuntime}
            monitorControl={monitorControl}
          />
        )}

        {tab === 'agents' && (
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <AgentPanel agents={agents.map((agent) => {
              if (agent.id === 'EmailInboxAgent') {
                const on = Boolean(preferences?.email_enabled);
                return {
                  ...agent,
                  status: on ? agent.status : 'idle',
                  summary: on ? agent.summary : 'Email alerts are disabled. Enable in Monitor Controls.',
                };
              }
              if (agent.id === 'MessageAgent') {
                const on = Boolean(preferences?.sms_enabled || preferences?.voice_call_enabled);
                return {
                  ...agent,
                  status: on ? agent.status : 'idle',
                  summary: on ? agent.summary : 'SMS and voice alerts are disabled. Enable in Monitor Controls.',
                };
              }
              return agent;
            })} />
            <div className="space-y-3">
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
              <ResourceMonitor stats={liveStats} />
              <Recommendations
                recommendations={isDesktopRuntime ? recommendations : mockRecommendations}
                onSelect={(recommendation) => injectRecommendationContext(recommendation)}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
