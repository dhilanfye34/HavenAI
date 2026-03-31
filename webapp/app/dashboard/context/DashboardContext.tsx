'use client';

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useAgentStatus } from '../hooks/useAgentStatus';
import { useAlerts } from '../hooks/useAlerts';
import { useSetupPreferences } from '../hooks/useSetupPreferences';
import { useChat } from '../hooks/useChat';
import {
  AgentRuntimeStatus,
  AgentStatus,
  MonitorControlState,
  Recommendation,
  SecurityAlert,
  SetupPreferences,
  SetupPreferencesUpdate,
  ChatMessage,
  ChatConnectionStatus,
  ChatContextEvent,
} from '../types';

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

// ── Known-safe fragments (shared with apps page logic) ──
const KNOWN_SAFE_FRAGMENTS = [
  'finder', 'dock', 'systemuiserver', 'loginwindow', 'windowserver',
  'launchd', 'kernel_task', 'spotlight', 'mds',
  'coreaudiod', 'bluetoothd', 'airportd', 'configd', 'distnoted',
  'chrome', 'google chrome', 'safari', 'firefox', 'arc', 'brave',
  'slack', 'discord', 'zoom', 'microsoft teams', 'teams',
  'code', 'visual studio code', 'cursor',
  'iterm', 'terminal', 'warp', 'alacritty',
  'spotify', 'music', 'apple music',
  'notes', 'reminders', 'calendar', 'mail',
  'messages', 'facetime', 'photos',
  'preview', 'textedit', 'pages', 'numbers', 'keynote',
  'activity monitor', 'system preferences', 'system settings',
  'figma', 'notion', 'obsidian', 'linear',
  'docker', 'node', 'python', 'ruby', 'java', 'go',
  'electron', 'havenai', 'haven',
  'stocks', 'stockswidget', 'weather', 'weatherwidget',
  'notificationcenter', 'usernoted', 'coreservices',
  'cfprefsd', 'nsurlsessiond', 'trustd', 'opendirectoryd',
  'logd', 'syslogd', 'sharingd', 'rapportd',
  'bird', 'cloudd', 'assistantd', 'siri', 'suggestd',
  'backupd', 'timed', 'powerd', 'thermald',
  'amfid', 'endpointsecurity', 'syspolicyd',
  'axvisual', 'universalaccess', 'voiceover',
  'iconservices', 'lsd', 'corebrightness',
  'watchdogd', 'symptomsd', 'networkserviceproxy',
  'wifid', 'apsd', 'identityservices',
];

function isKnownSafe(name: string): boolean {
  const lower = name.toLowerCase();
  return KNOWN_SAFE_FRAGMENTS.some((frag) => lower.includes(frag));
}

const SAFE_HOST_FRAGMENTS = [
  'apple.com', 'icloud.com', 'googleapis.com', 'google.com', 'gstatic.com',
  'googleusercontent.com', 'googlevideo.com',
  'microsoft.com', 'office.com', 'office365.com', 'live.com',
  'github.com', 'githubusercontent.com',
  'cloudflare.com', 'cloudflare.net',
  'amazonaws.com', 'amazon.com',
  'slack.com', 'discord.com',
  'spotify.com', 'scdn.co',
  'akamai.net', 'akamaized.net',
  'fastly.net', 'cloudfront.net',
  'facebook.com', 'meta.com', 'whatsapp.com', 'fbcdn.net',
  'notion.so', 'figma.com', 'linear.app', 'vercel.app',
  'anthropic.com', 'openai.com',
  'docker.com', 'docker.io',
  'zoom.us', 'dropbox.com', 'adobe.com',
  'youtube.com', 'ytimg.com',
  'twitter.com', 'x.com', 'linkedin.com', 'reddit.com',
];

function isSafeHost(hostname?: string): boolean {
  if (!hostname) return false;
  const h = hostname.toLowerCase();
  return SAFE_HOST_FRAGMENTS.some((frag) => h.includes(frag));
}

export interface ProtectionArea {
  id: string;
  label: string;
  status: 'protected' | 'concerns' | 'off' | 'not-setup';
  detail: string;
  enabled: boolean;
  score: number; // 0-100
}

export interface EmailConnectionState {
  status: 'idle' | 'testing' | 'connected' | 'error';
  message: string;
  email: string;
  providerName: string;
}

export interface DashboardState {
  user: { email?: string; full_name?: string } | null;
  isDesktopRuntime: boolean;
  agents: AgentStatus[];
  runtimeStatus: AgentRuntimeStatus | null;
  monitorControl: MonitorControlState | null | undefined;
  alerts: SecurityAlert[];
  alertCounts: { critical: number; warning: number; info: number };
  latestAlertId: string | null;
  preferences: SetupPreferences | null;
  preferencesLoading: boolean;
  preferencesSaving: boolean;
  preferencesError: string | null;
  savePreferences: (payload: SetupPreferencesUpdate) => Promise<void>;
  healthScore: number;
  protectionAreas: ProtectionArea[];
  actionItems: Recommendation[];
  chatMessages: ChatMessage[];
  chatIsResponding: boolean;
  chatConnectionStatus: ChatConnectionStatus;
  chatConnectionLabel: string;
  chatContextEvents: ChatContextEvent[];
  chatSendMessage: (message: string) => Promise<void> | void;
  chatRemoveContext: (index: number) => void;
  chatClearContext: () => void;
  chatInjectAlertContext: (alert: SecurityAlert) => void;
  // Email connection
  emailConnection: EmailConnectionState;
  setEmailConnected: (email: string, providerName: string, message: string) => void;
  setEmailDisconnected: () => void;
  setEmailTesting: () => void;
  setEmailError: (message: string) => void;
  // Logout
  logout: () => void;
}

const DashboardContext = createContext<DashboardState | null>(null);

export function useDashboard(): DashboardState {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider');
  return ctx;
}

// ── Scoring functions ──

function computeFileScore(
  enabled: boolean,
  state: string | undefined,
  alerts24h: SecurityAlert[],
  details: AgentRuntimeStatus['module_details'],
): number {
  if (!enabled) return 0;
  if (state === 'blocked' || state === 'pending_permission') return 20;

  let score = 85; // Base: monitoring is on

  // Penalize for alerts
  const critical = alerts24h.filter((a) => a.severity === 'critical').length;
  const warning = alerts24h.filter((a) => a.severity === 'warning').length;
  score -= critical * 15;
  score -= warning * 5;

  // Bonus if telemetry is flowing (events being observed = healthy)
  const eventCount = details?.file.event_count || 0;
  if (eventCount > 0) score += 5;

  // Small penalty if no events at all yet (might mean permissions issue)
  if (eventCount === 0 && details) score -= 10;

  return clamp(Math.round(score), 0, 100);
}

function computeAppsScore(
  enabled: boolean,
  state: string | undefined,
  alerts24h: SecurityAlert[],
  details: AgentRuntimeStatus['module_details'],
): number {
  if (!enabled) return 0;
  if (state === 'blocked' || state === 'pending_permission') return 20;

  let score = 80; // Base

  // Penalize for alerts
  const critical = alerts24h.filter((a) => a.severity === 'critical').length;
  const warning = alerts24h.filter((a) => a.severity === 'warning').length;
  score -= critical * 15;
  score -= warning * 5;

  // Analyze running processes for unknown apps
  const topProcs = details?.process.top_processes || [];
  if (topProcs.length > 0) {
    const unknownCount = topProcs.filter((p) => p.name && !isKnownSafe(p.name)).length;
    const unknownRatio = unknownCount / topProcs.length;
    // Each unknown app costs points — more unknowns = lower score
    score -= Math.round(unknownRatio * 25);

    // High-resource unknown processes are worse
    const highResourceUnknown = topProcs.filter(
      (p) => p.name && !isKnownSafe(p.name) && ((p.cpu_percent || 0) > 30 || (p.memory_percent || 0) > 20),
    ).length;
    score -= highResourceUnknown * 8;
  }

  // Bonus for telemetry flowing
  const eventCount = details?.process.event_count || 0;
  if (eventCount > 0) score += 5;
  if (eventCount === 0 && details) score -= 10;

  return clamp(Math.round(score), 0, 100);
}

function computeNetworkScore(
  enabled: boolean,
  state: string | undefined,
  alerts24h: SecurityAlert[],
  details: AgentRuntimeStatus['module_details'],
): number {
  if (!enabled) return 0;
  if (state === 'blocked' || state === 'pending_permission') return 20;

  let score = 80; // Base

  // Penalize for alerts
  const critical = alerts24h.filter((a) => a.severity === 'critical').length;
  const warning = alerts24h.filter((a) => a.severity === 'warning').length;
  score -= critical * 15;
  score -= warning * 5;

  // Analyze active connections for unknown destinations
  const connections = details?.network.active_connections || [];
  if (connections.length > 0) {
    const unknownDests = connections.filter((c) => c.hostname && !isSafeHost(c.hostname)).length;
    const unknownRatio = unknownDests / connections.length;
    score -= Math.round(unknownRatio * 20);

    // Connections with no hostname at all (raw IPs) are slightly suspicious
    const rawIpCount = connections.filter((c) => !c.hostname && c.remote_ip).length;
    score -= Math.min(10, rawIpCount * 2);
  }

  // Bonus for telemetry flowing
  const eventCount = details?.network.event_count || 0;
  if (eventCount > 0) score += 5;
  if (eventCount === 0 && details) score -= 10;

  return clamp(Math.round(score), 0, 100);
}

function computeEmailScore(enabled: boolean): number {
  if (!enabled) return 0;
  // Email monitoring is binary for now — either set up or not
  return 85;
}

export function DashboardProvider({
  token,
  children,
}: {
  token: string | null;
  children: ReactNode;
}) {
  const [user, setUser] = useState<{ email?: string; full_name?: string } | null>(null);
  const [isDesktopRuntime, setIsDesktopRuntime] = useState(false);
  const [emailConnection, setEmailConnection] = useState<EmailConnectionState>({
    status: 'idle',
    message: '',
    email: '',
    providerName: '',
  });

  const { agents, runtimeStatus } = useAgentStatus();
  const { alerts, counts, latestAlertId } = useAlerts();
  const {
    preferences,
    monitorControl,
    loading: preferencesLoading,
    saving: preferencesSaving,
    error: preferencesError,
    save: savePreferences,
  } = useSetupPreferences(token);
  const {
    messages: chatMessages,
    isResponding: chatIsResponding,
    connectionStatus: chatConnectionStatus,
    connectionLabel: chatConnectionLabel,
    contextEvents: chatContextEvents,
    injectAlertContext: chatInjectAlertContext,
    injectRuntimeContext,
    removeContextEvent: chatRemoveContext,
    clearContextEvents: chatClearContext,
    sendMessage: chatSendMessage,
  } = useChat();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    try {
      setUser(userData ? JSON.parse(userData) : null);
    } catch {
      setUser({ email: 'Unknown user' });
    }
    setIsDesktopRuntime(Boolean((window as any).havenai));

    // Restore email connection state from localStorage
    const savedEmailState = localStorage.getItem('haven-email-connection');
    if (savedEmailState) {
      try {
        const parsed = JSON.parse(savedEmailState);
        if (parsed.status === 'connected') {
          setEmailConnection(parsed);
        }
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    injectRuntimeContext(runtimeStatus);
  }, [injectRuntimeContext, runtimeStatus]);

  // Email connection helpers
  const setEmailConnected = (email: string, providerName: string, message: string) => {
    const state: EmailConnectionState = { status: 'connected', message, email, providerName };
    setEmailConnection(state);
    localStorage.setItem('haven-email-connection', JSON.stringify(state));
  };
  const setEmailDisconnected = () => {
    setEmailConnection({ status: 'idle', message: '', email: '', providerName: '' });
    localStorage.removeItem('haven-email-connection');
  };
  const setEmailTesting = () => {
    setEmailConnection((prev) => ({ ...prev, status: 'testing', message: 'Testing connection...' }));
  };
  const setEmailError = (message: string) => {
    setEmailConnection((prev) => ({ ...prev, status: 'error', message }));
  };

  // ── Per-area scores + overall score ──
  const protectionAreas = useMemo<ProtectionArea[]>(() => {
    const fileEnabled = Boolean(preferences?.file_monitoring_enabled);
    const processEnabled = Boolean(preferences?.process_monitoring_enabled);
    const networkEnabled = Boolean(preferences?.network_monitoring_enabled);
    const emailEnabled = Boolean(preferences?.email_enabled);

    const fileState = monitorControl?.state.file;
    const processState = monitorControl?.state.process;
    const networkState = monitorControl?.state.network;

    const now = Date.now();
    const alerts24h = alerts.filter((a) => now - new Date(a.timestamp).getTime() <= 86_400_000);
    const fileAlerts24h = alerts24h.filter((a) => a.source.toLowerCase().includes('file'));
    const processAlerts24h = alerts24h.filter((a) => a.source.toLowerCase().includes('process'));
    const networkAlerts24h = alerts24h.filter((a) => a.source.toLowerCase().includes('network'));

    const details = runtimeStatus?.module_details || null;

    const fileScore = computeFileScore(fileEnabled, fileState, fileAlerts24h, details);
    const appsScore = computeAppsScore(processEnabled, processState, processAlerts24h, details);
    const networkScore = computeNetworkScore(networkEnabled, networkState, networkAlerts24h, details);
    const emailScore = computeEmailScore(emailEnabled);

    function areaStatus(enabled: boolean, state: string | undefined, score: number): ProtectionArea['status'] {
      if (!enabled) return 'off';
      if (state === 'blocked' || state === 'pending_permission') return 'not-setup';
      if (score < 60) return 'concerns';
      return 'protected';
    }

    function areaDetail(status: ProtectionArea['status'], score: number): string {
      if (status === 'off') return 'Turned off';
      if (status === 'not-setup') return 'Needs permission';
      if (status === 'concerns') return `Score: ${score}`;
      return `Score: ${score}`;
    }

    const fileStatus = areaStatus(fileEnabled, fileState, fileScore);
    const appsStatus = areaStatus(processEnabled, processState, appsScore);
    const networkStatus = areaStatus(networkEnabled, networkState, networkScore);
    const emailStatus = emailEnabled ? (emailScore < 60 ? 'concerns' : 'protected') : 'not-setup';

    return [
      {
        id: 'files',
        label: 'Files',
        enabled: fileEnabled,
        status: fileStatus,
        detail: areaDetail(fileStatus, fileScore),
        score: fileScore,
      },
      {
        id: 'apps',
        label: 'Apps',
        enabled: processEnabled,
        status: appsStatus,
        detail: areaDetail(appsStatus, appsScore),
        score: appsScore,
      },
      {
        id: 'network',
        label: 'Network',
        enabled: networkEnabled,
        status: networkStatus,
        detail: areaDetail(networkStatus, networkScore),
        score: networkScore,
      },
      {
        id: 'email',
        label: 'Email',
        enabled: emailEnabled,
        status: emailStatus,
        detail: emailEnabled ? `Score: ${emailScore}` : 'Not set up',
        score: emailScore,
      },
    ];
  }, [alerts, monitorControl, preferences, runtimeStatus]);

  // ── Overall health score = weighted average of area scores ──
  const healthScore = useMemo(() => {
    const enabledAreas = protectionAreas.filter((a) => a.enabled);
    if (enabledAreas.length === 0) return 0;

    // Weighted: apps and network matter more than files and email
    const weights: Record<string, number> = {
      files: 1,
      apps: 1.5,
      network: 1.5,
      email: 0.8,
    };

    let totalWeight = 0;
    let weightedSum = 0;
    for (const area of enabledAreas) {
      const w = weights[area.id] || 1;
      weightedSum += area.score * w;
      totalWeight += w;
    }

    const avgScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

    // Penalize if some areas are disabled (you're less protected)
    const disabledCount = protectionAreas.filter((a) => !a.enabled).length;
    const disabledPenalty = disabledCount * 8;

    // Penalize for agent errors
    const errorCount = agents.filter((a) => a.status === 'error').length;
    const errorPenalty = errorCount * 10;

    return clamp(Math.round(avgScore - disabledPenalty - errorPenalty), 0, 100);
  }, [protectionAreas, agents]);

  const actionItems = useMemo<Recommendation[]>(() => {
    const items: Recommendation[] = [];
    const hasCritical = counts.critical > 0;
    const hasErrors = agents.some((a) => a.status === 'error');

    if (hasCritical) {
      items.push({
        id: 'critical-alerts',
        title: `You have ${counts.critical} urgent alert${counts.critical === 1 ? '' : 's'} to review`,
        context: 'alerts',
      });
    }
    if (hasErrors) {
      items.push({
        id: 'agent-errors',
        title: 'Some protection features need attention',
        context: 'settings',
      });
    }

    // Flag areas with low scores
    protectionAreas.forEach((area) => {
      if (area.enabled && area.score < 60 && area.score > 0) {
        items.push({
          id: `low-score-${area.id}`,
          title: `${area.label} protection score is low (${area.score})`,
          context: area.id === 'email' ? 'email' : area.id,
        });
      }
      if (area.status === 'off') {
        items.push({
          id: `enable-${area.id}`,
          title: `${area.label} monitoring is turned off`,
          context: 'settings',
        });
      }
      if (area.status === 'not-setup') {
        items.push({
          id: `setup-${area.id}`,
          title: `${area.label === 'Email' ? 'Email monitoring isn\'t set up yet' : `${area.label} monitoring needs permission`}`,
          context: area.id === 'email' ? 'email' : 'settings',
        });
      }
    });

    if (items.length === 0) {
      items.push({
        id: 'all-good',
        title: 'Everything looks good',
        context: '',
      });
    }

    return items.slice(0, 5);
  }, [agents, counts.critical, protectionAreas]);

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('haven-email-connection');
    window.location.href = '/login';
  };

  const value: DashboardState = {
    user,
    isDesktopRuntime,
    agents,
    runtimeStatus,
    monitorControl,
    alerts,
    alertCounts: counts,
    latestAlertId,
    preferences,
    preferencesLoading,
    preferencesSaving,
    preferencesError,
    savePreferences,
    healthScore,
    protectionAreas,
    actionItems,
    chatMessages,
    chatIsResponding,
    chatConnectionStatus,
    chatConnectionLabel,
    chatContextEvents,
    chatSendMessage,
    chatRemoveContext,
    chatClearContext,
    chatInjectAlertContext,
    emailConnection,
    setEmailConnected,
    setEmailDisconnected,
    setEmailTesting,
    setEmailError,
    logout,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}
