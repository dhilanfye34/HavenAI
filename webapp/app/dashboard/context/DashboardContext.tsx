'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { useAgentStatus } from '../hooks/useAgentStatus';
import { useAlerts } from '../hooks/useAlerts';
import { useSetupPreferences } from '../hooks/useSetupPreferences';
import { useChat } from '../hooks/useChat';
import { useSafelist, SafelistState } from '../hooks/useSafelist';
import { isKnownSafe, isSafeHost } from '../lib/safetyChecks';
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

// Safety check helpers are imported from lib/safetyChecks.ts

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
  chatSendMessage: (message: string, extraContext?: ChatContextEvent[]) => Promise<void> | void;
  chatRemoveContext: (index: number) => void;
  chatClearContext: () => void;
  chatInjectAlertContext: (alert: SecurityAlert) => void;
  // Email connection
  emailConnection: EmailConnectionState;
  setEmailConnected: (email: string, providerName: string, message: string) => void;
  setEmailDisconnected: () => void;
  setEmailTesting: () => void;
  setEmailError: (message: string) => void;
  // Safelist
  safelist: SafelistState;
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
  safelistFn?: (id: string) => boolean,
): number {
  if (!enabled) return 0;
  if (state === 'blocked' || state === 'pending_permission') return 20;

  let score = 98; // Base: clean system with monitoring on = near perfect

  // Penalize for unresolved alerts only
  const unresolvedAlerts = safelistFn
    ? alerts24h.filter((a) => !safelistFn(a.id))
    : alerts24h;
  const critical = unresolvedAlerts.filter((a) => a.severity === 'critical').length;
  const warning = unresolvedAlerts.filter((a) => a.severity === 'warning').length;
  score -= critical * 15;
  score -= warning * 5;

  return clamp(Math.round(score), 0, 100);
}

function computeAppsScore(
  enabled: boolean,
  state: string | undefined,
  alerts24h: SecurityAlert[],
  details: AgentRuntimeStatus['module_details'],
  safelistFn?: (id: string) => boolean,
  processSafelistFn?: (name: string) => boolean,
): number {
  if (!enabled) return 0;
  if (state === 'blocked' || state === 'pending_permission') return 20;

  let score = 96; // Base: clean system = high 90s

  // Penalize for unresolved alerts only
  const unresolvedAlerts = safelistFn
    ? alerts24h.filter((a) => !safelistFn(a.id))
    : alerts24h;
  const critical = unresolvedAlerts.filter((a) => a.severity === 'critical').length;
  const warning = unresolvedAlerts.filter((a) => a.severity === 'warning').length;
  score -= critical * 15;
  score -= warning * 5;

  // Analyze running processes for unknown apps (exclude safelisted)
  const topProcs = details?.process.top_processes || [];
  if (topProcs.length > 0) {
    const unknownCount = topProcs.filter(
      (p) => p.name && !isKnownSafe(p.name) && !(processSafelistFn && processSafelistFn(p.name)),
    ).length;
    const unknownRatio = unknownCount / topProcs.length;
    score -= Math.round(unknownRatio * 25);

    // High-resource unknown processes are worse
    const highResourceUnknown = topProcs.filter(
      (p) =>
        p.name &&
        !isKnownSafe(p.name) &&
        !(processSafelistFn && processSafelistFn(p.name)) &&
        ((p.cpu_percent || 0) > 30 || (p.memory_percent || 0) > 20),
    ).length;
    score -= highResourceUnknown * 8;
  }

  return clamp(Math.round(score), 0, 100);
}

function computeNetworkScore(
  enabled: boolean,
  state: string | undefined,
  alerts24h: SecurityAlert[],
  details: AgentRuntimeStatus['module_details'],
  safelistFn?: (id: string) => boolean,
  hostSafelistFn?: (hostname: string) => boolean,
): number {
  if (!enabled) return 0;
  if (state === 'blocked' || state === 'pending_permission') return 20;

  let score = 96; // Base: clean system = high 90s

  // Penalize for unresolved alerts only
  const unresolvedAlerts = safelistFn
    ? alerts24h.filter((a) => !safelistFn(a.id))
    : alerts24h;
  const critical = unresolvedAlerts.filter((a) => a.severity === 'critical').length;
  const warning = unresolvedAlerts.filter((a) => a.severity === 'warning').length;
  score -= critical * 15;
  score -= warning * 5;

  // Analyze active connections for unknown destinations (exclude safelisted hosts)
  const connections = details?.network.active_connections || [];
  if (connections.length > 0) {
    const unknownDests = connections.filter(
      (c) => c.hostname && !isSafeHost(c.hostname) && !(hostSafelistFn && hostSafelistFn(c.hostname)),
    ).length;
    const unknownRatio = unknownDests / connections.length;
    score -= Math.round(unknownRatio * 20);

    // Connections with no hostname at all (raw IPs) are slightly suspicious
    const rawIpCount = connections.filter((c) => !c.hostname && c.remote_ip).length;
    score -= Math.min(10, rawIpCount * 2);
  }

  return clamp(Math.round(score), 0, 100);
}

function computeEmailScore(
  enabled: boolean,
  alerts24h: SecurityAlert[],
  details: AgentRuntimeStatus['module_details'],
  safelistFn?: (id: string) => boolean,
): number {
  if (!enabled) return 0;

  let score = 98; // Clean inbox = near perfect

  // Penalize for unresolved email alerts
  const unresolvedAlerts = safelistFn
    ? alerts24h.filter((a) => !safelistFn(a.id))
    : alerts24h;
  const critical = unresolvedAlerts.filter((a) => a.severity === 'critical').length;
  const warning = unresolvedAlerts.filter((a) => a.severity === 'warning').length;
  score -= critical * 12;
  score -= warning * 4;

  // Penalize for unresolved findings with high risk scores
  const findings = details?.email?.findings || [];
  const unsafeFindings = safelistFn
    ? findings.filter((f) => !safelistFn(f.email?.subject || ''))
    : findings;
  const highRisk = unsafeFindings.filter((f) => (f.risk_score || 0) >= 0.6).length;
  const medRisk = unsafeFindings.filter((f) => (f.risk_score || 0) >= 0.3 && (f.risk_score || 0) < 0.6).length;
  score -= highRisk * 10;
  score -= medRisk * 4;

  return clamp(Math.round(score), 0, 100);
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
  const safelist = useSafelist();
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

  // Auto-inject alerts into chat context so the assistant always knows about them
  const lastAlertInjectRef = useRef<string>('');
  useEffect(() => {
    if (alerts.length === 0) return;
    // Build a digest to avoid re-injecting the same set
    const digest = alerts.map((a) => a.id).join(',');
    if (digest === lastAlertInjectRef.current) return;
    lastAlertInjectRef.current = digest;

    // Inject all non-info alerts as context
    const significantAlerts = alerts.filter((a) => a.severity !== 'info').slice(0, 20);
    if (significantAlerts.length === 0) return;

    const alertLines = significantAlerts.map((a) => {
      const detail = typeof a.details === 'string' ? a.details : '';
      return `  - [${a.severity.toUpperCase()}] ${a.description}${detail ? ` — ${detail}` : ''} (${new Date(a.timestamp).toLocaleString()})`;
    });

    // Replace previous alert context
    chatClearContext();
    // Re-inject runtime context since we just cleared
    injectRuntimeContext(runtimeStatus);

    // Add alerts as a single context event
    chatInjectAlertContext({
      id: 'auto-alerts',
      severity: significantAlerts.some((a) => a.severity === 'critical') ? 'critical' : 'warning',
      timestamp: new Date().toISOString(),
      source: 'Alert History',
      description: `CURRENT ALERTS (${significantAlerts.length}):\n${alertLines.join('\n')}`,
      details: '',
    });
  }, [alerts]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-detect email connection from agent status
  // If EmailInboxAgent is active but UI doesn't know, sync the state
  useEffect(() => {
    if (emailConnection.status === 'connected') return; // already know
    const emailAgent = agents.find((a) => a.id === 'EmailInboxAgent');
    if (emailAgent && emailAgent.status === 'active') {
      setEmailConnection({
        status: 'connected',
        message: 'Connected (restored from previous session)',
        email: '',
        providerName: '',
      });
      // Also persist so it survives tab switches
      localStorage.setItem('haven-email-connection', JSON.stringify({
        status: 'connected',
        message: 'Connected (restored from previous session)',
        email: '',
        providerName: '',
      }));
    }
  }, [agents, emailConnection.status]);

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
    const emailAlerts24h = alerts24h.filter((a) => a.source.toLowerCase().includes('email'));

    const details = runtimeStatus?.module_details || null;

    // Safelist-aware scoring
    const alertSafe = (id: string) => safelist.isSafe('alerts', id);
    const procSafe = (name: string) => safelist.isSafe('processes', name);
    const hostSafe = (hostname: string) => safelist.isSafe('hosts', hostname);

    const fileScore = computeFileScore(fileEnabled, fileState, fileAlerts24h, details, alertSafe);
    const appsScore = computeAppsScore(processEnabled, processState, processAlerts24h, details, alertSafe, procSafe);
    const networkScore = computeNetworkScore(networkEnabled, networkState, networkAlerts24h, details, alertSafe, hostSafe);
    const emailScore = computeEmailScore(emailEnabled, emailAlerts24h, details, alertSafe);

    function areaStatus(enabled: boolean, state: string | undefined, score: number): ProtectionArea['status'] {
      if (!enabled) return 'off';
      if (state === 'blocked' || state === 'pending_permission') return 'not-setup';
      if (score < 60) return 'concerns';
      return 'protected';
    }

    // Enriched detail text with real data instead of just "Score: XX"
    const fileEventCount = details?.file.event_count || 0;
    const unresolvedFileAlerts = fileAlerts24h.filter((a) => !alertSafe(a.id));
    const fileDetail = !fileEnabled
      ? 'Turned off'
      : fileState === 'blocked' || fileState === 'pending_permission'
      ? 'Needs permission'
      : unresolvedFileAlerts.length > 0
      ? `${unresolvedFileAlerts.length} suspicious change${unresolvedFileAlerts.length === 1 ? '' : 's'}`
      : fileEventCount > 0
      ? `${fileEventCount} changes detected`
      : 'No suspicious changes';

    const topProcs = details?.process.top_processes || [];
    const unknownApps = topProcs.filter(
      (p) => p.name && !isKnownSafe(p.name) && !procSafe(p.name),
    ).length;
    const appsDetail = !processEnabled
      ? 'Turned off'
      : processState === 'blocked' || processState === 'pending_permission'
      ? 'Needs permission'
      : unknownApps > 0
      ? `${topProcs.length} apps running, ${unknownApps} unrecognized`
      : topProcs.length > 0
      ? `${topProcs.length} apps running`
      : 'Monitoring active';

    const connections = details?.network.active_connections || [];
    const unknownConns = connections.filter(
      (c) => c.hostname && !isSafeHost(c.hostname) && !hostSafe(c.hostname),
    ).length;
    const networkDetail = !networkEnabled
      ? 'Turned off'
      : networkState === 'blocked' || networkState === 'pending_permission'
      ? 'Needs permission'
      : unknownConns > 0
      ? `${connections.length} connections, ${unknownConns} unrecognized`
      : connections.length > 0
      ? `${connections.length} connections`
      : 'Monitoring active';

    const emailFindings = details?.email?.findings || [];
    const unresolvedEmailFindings = emailFindings.filter((f) => !safelist.isSafe('emails', f.email?.subject || ''));
    const emailDetail = !emailEnabled
      ? 'Not set up'
      : unresolvedEmailFindings.length > 0
      ? `${unresolvedEmailFindings.length} suspicious email${unresolvedEmailFindings.length === 1 ? '' : 's'}`
      : 'Inbox looks clean';

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
        detail: fileDetail,
        score: fileScore,
      },
      {
        id: 'apps',
        label: 'Apps',
        enabled: processEnabled,
        status: appsStatus,
        detail: appsDetail,
        score: appsScore,
      },
      {
        id: 'network',
        label: 'Network',
        enabled: networkEnabled,
        status: networkStatus,
        detail: networkDetail,
        score: networkScore,
      },
      {
        id: 'email',
        label: 'Email',
        enabled: emailEnabled,
        status: emailStatus,
        detail: emailDetail,
        score: emailScore,
      },
    ];
  }, [alerts, monitorControl, preferences, runtimeStatus, safelist.isSafe]);

  // ── Overall health score = weighted average of enabled area scores ──
  const healthScore = useMemo(() => {
    const enabledAreas = protectionAreas.filter((a) => a.enabled);
    if (enabledAreas.length === 0) return 0;

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

    // Small penalty for agent errors (but don't punish disabled areas)
    const errorCount = agents.filter((a) => a.status === 'error').length;
    const errorPenalty = errorCount * 5;

    return clamp(Math.round(avgScore - errorPenalty), 0, 100);
  }, [protectionAreas, agents]);

  // ── Alert counts excluding resolved ──
  const alertCounts = useMemo(() => {
    const unresolved = alerts.filter((a) => !safelist.isSafe('alerts', a.id));
    return {
      critical: unresolved.filter((a) => a.severity === 'critical').length,
      warning: unresolved.filter((a) => a.severity === 'warning').length,
      info: unresolved.filter((a) => a.severity === 'info').length,
    };
  }, [alerts, safelist.isSafe]);

  const actionItems = useMemo<Recommendation[]>(() => {
    const items: Recommendation[] = [];

    // Unresolved critical alerts
    const unresolvedCritical = alerts.filter(
      (a) => a.severity === 'critical' && !safelist.isSafe('alerts', a.id),
    );
    if (unresolvedCritical.length > 0) {
      const topAlerts = unresolvedCritical.slice(0, 3);
      items.push({
        id: 'critical-alerts',
        title: `You have ${unresolvedCritical.length} urgent alert${unresolvedCritical.length === 1 ? '' : 's'} to review`,
        context: 'alerts',
        severity: 'critical',
        description: topAlerts.map((a) => a.description).join('. '),
        recommendation: 'Review these alerts and take action. Mark them as resolved once addressed.',
        relatedAlerts: topAlerts,
        targetPath: '/dashboard/alerts',
        actionLabel: 'Review alerts',
      });
    }

    // Agent errors
    const errorAgents = agents.filter((a) => a.status === 'error');
    if (errorAgents.length > 0) {
      items.push({
        id: 'agent-errors',
        title: 'Some protection features need attention',
        context: 'settings',
        severity: 'warning',
        description: `${errorAgents.map((a) => a.name).join(', ')} ${errorAgents.length === 1 ? 'is' : 'are'} not running properly.`,
        recommendation: 'Check your settings to restart protection features.',
        relatedAlerts: [],
        targetPath: '/dashboard/settings',
        actionLabel: 'Open settings',
      });
    }

    // Unresolved warning alerts
    const unresolvedWarning = alerts.filter(
      (a) => a.severity === 'warning' && !safelist.isSafe('alerts', a.id),
    );
    if (unresolvedWarning.length > 0) {
      const topAlerts = unresolvedWarning.slice(0, 3);
      items.push({
        id: 'warning-alerts',
        title: `${unresolvedWarning.length} warning${unresolvedWarning.length === 1 ? '' : 's'} to check`,
        context: 'alerts',
        severity: 'warning',
        description: topAlerts.map((a) => a.description).join('. '),
        recommendation: 'Review these warnings. Mark as safe if they look normal.',
        relatedAlerts: topAlerts,
        targetPath: '/dashboard/alerts',
        actionLabel: 'Review warnings',
      });
    }

    // Flag areas with low scores
    protectionAreas.forEach((area) => {
      if (area.enabled && area.score < 60 && area.score > 0) {
        const areaAlerts = alerts
          .filter((a) => a.source.toLowerCase().includes(area.id === 'apps' ? 'process' : area.id) && !safelist.isSafe('alerts', a.id))
          .slice(0, 3);
        const targetMap: Record<string, string> = {
          files: '/dashboard/files',
          apps: '/dashboard/apps',
          network: '/dashboard/network',
          email: '/dashboard/email',
        };
        items.push({
          id: `low-score-${area.id}`,
          title: `${area.label} protection needs attention`,
          context: area.id,
          severity: 'warning',
          description: area.detail,
          recommendation: `Go to ${area.label} to review and address any issues.`,
          relatedAlerts: areaAlerts,
          targetPath: targetMap[area.id] || '/dashboard',
          actionLabel: `Go to ${area.label}`,
        });
      }
      if (area.status === 'off') {
        items.push({
          id: `enable-${area.id}`,
          title: `${area.label} monitoring is turned off`,
          context: 'settings',
          severity: 'info',
          description: `${area.label} protection is disabled. Your device isn't being monitored in this area.`,
          recommendation: `Turn on ${area.label} monitoring to protect this area.`,
          relatedAlerts: [],
          targetPath: '/dashboard/settings',
          actionLabel: 'Open settings',
        });
      }
      if (area.status === 'not-setup') {
        items.push({
          id: `setup-${area.id}`,
          title: area.label === 'Email' ? 'Email monitoring isn\'t set up yet' : `${area.label} monitoring needs permission`,
          context: area.id === 'email' ? 'email' : 'settings',
          severity: 'info',
          description: area.label === 'Email'
            ? 'Connect your email to scan for phishing and suspicious messages.'
            : `${area.label} monitoring needs your permission to start protecting.`,
          recommendation: area.label === 'Email'
            ? 'Set up email monitoring to protect your inbox.'
            : `Grant permission for ${area.label} monitoring in settings.`,
          relatedAlerts: [],
          targetPath: area.id === 'email' ? '/dashboard/email' : '/dashboard/settings',
          actionLabel: area.label === 'Email' ? 'Set up email' : 'Open settings',
        });
      }
    });

    if (items.length === 0) {
      items.push({
        id: 'all-good',
        title: 'Everything looks good',
        context: '',
        severity: 'info',
        description: 'All protection areas are active and no issues detected.',
        recommendation: 'Keep Haven running to stay protected.',
        relatedAlerts: [],
        targetPath: '/dashboard',
        actionLabel: '',
      });
    }

    return items.slice(0, 5);
  }, [agents, alerts, protectionAreas, safelist.isSafe]);

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
    alertCounts,
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
    safelist,
    logout,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}
