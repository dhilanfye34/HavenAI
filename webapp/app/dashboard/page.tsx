'use client';

import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Eye,
  FileSearch,
  Globe,
  Mail,
  MessageCircle,
  Monitor,
  Settings,
  ShieldCheck,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import { useDashboard, ProtectionArea } from './context/DashboardContext';
import { useNavigate } from './context/NavigationContext';
import { Recommendation, SecurityAlert } from './types';
import { isKnownSafe, isSafeHost } from './lib/safetyChecks';
import { timeAgo } from './lib/timeAgo';

const AREA_ICON: Record<string, typeof Eye> = {
  files: FileSearch,
  apps: Eye,
  network: Wifi,
  email: Mail,
};

const AREA_HREF: Record<string, string> = {
  files: '/dashboard/files',
  apps: '/dashboard/apps',
  network: '/dashboard/network',
  email: '/dashboard/email',
};

function scoreLabel(score: number) {
  if (score >= 80) return "You\u2019re Protected";
  if (score >= 50) return 'Action Needed';
  return 'At Risk';
}

function scoreColor(score: number) {
  if (score >= 80) return '#22C55E';
  if (score >= 50) return '#F59E0B';
  return '#EF4444';
}

function scoreTextClass(score: number) {
  if (score >= 80) return 'text-green-500';
  if (score >= 50) return 'text-amber-500';
  return 'text-red-500';
}

function scoreBarClass(score: number) {
  if (score >= 80) return 'bg-green-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

function statusDotClass(status: ProtectionArea['status']) {
  if (status === 'protected') return 'status-dot-safe';
  if (status === 'concerns') return 'status-dot-warning';
  if (status === 'off') return 'status-dot-inactive';
  return 'status-dot-danger';
}

function statusTextClass(status: ProtectionArea['status']) {
  if (status === 'protected') return 'text-green-600 dark:text-green-400';
  if (status === 'concerns') return 'text-amber-600 dark:text-amber-400';
  if (status === 'off') return 'text-haven-text-tertiary';
  return 'text-red-600 dark:text-red-400';
}

function severityIcon(severity: Recommendation['severity']) {
  if (severity === 'critical') return <AlertTriangle className="h-4 w-4 text-red-500" />;
  if (severity === 'warning') return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return <ShieldCheck className="h-4 w-4 text-blue-500" />;
}

function severityBorderClass(severity: Recommendation['severity']) {
  if (severity === 'critical') return 'border-l-red-500';
  if (severity === 'warning') return 'border-l-amber-500';
  return 'border-l-blue-500';
}

// Noisy shell/runtime process names that are useless to show a non-technical user in the feed.
// These come and go dozens of times a minute and just make the feed look spammy.
const NOISY_PROCESS_NAMES = new Set([
  'bash', 'zsh', 'sh', 'dash', 'fish', 'csh', 'tcsh',
  'node', 'python', 'python3', 'python2', 'ruby', 'perl',
  'head', 'tail', 'cat', 'grep', 'awk', 'sed', 'tr', 'wc', 'sort', 'uniq',
  'ls', 'find', 'xargs', 'echo', 'printf', 'which', 'whoami', 'pwd',
  'ps', 'kill', 'killall', 'pgrep', 'pkill',
  'git', 'make', 'cmake', 'gcc', 'cc', 'clang', 'ld',
  'env', 'sleep', 'true', 'false', 'test', 'expr',
  'launchd', 'mdworker', 'mdworker_shared', 'mds', 'mds_stores',
  'cfprefsd', 'distnoted', 'trustd', 'secd', 'nsurlsessiond',
]);

function isNoisyProcess(name?: string): boolean {
  if (!name) return true;
  const base = name.toLowerCase().split('/').pop() || '';
  return NOISY_PROCESS_NAMES.has(base);
}

function friendlyFileEventType(type?: string): string {
  if (!type) return 'Changed';
  const t = type.toLowerCase();
  if (t.includes('create') || t.includes('new')) return 'Created';
  if (t.includes('modif') || t.includes('change') || t.includes('write')) return 'Modified';
  if (t.includes('delet') || t.includes('remov')) return 'Deleted';
  if (t.includes('rename') || t.includes('move')) return 'Renamed';
  return 'Changed';
}

// ─── Action item card (expandable) ───

function ActionItemCard({ item }: { item: Recommendation }) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  return (
    <div className={`card overflow-hidden transition-all ${expanded ? `border-l-4 ${severityBorderClass(item.severity)}` : ''}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 p-4 text-left hover:bg-haven-surface-hover transition-colors"
      >
        {severityIcon(item.severity)}
        <p className="flex-1 text-sm font-medium text-haven-text">{item.title}</p>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-haven-text-tertiary" />
        ) : (
          <ChevronRight className="h-4 w-4 text-haven-text-tertiary" />
        )}
      </button>

      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-3" style={{ borderColor: 'var(--haven-border)' }}>
          <p className="text-sm text-haven-text-secondary">{item.description}</p>

          {item.relatedAlerts.length > 0 && (
            <div className="space-y-2">
              {item.relatedAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-2 rounded-lg bg-haven-surface-hover p-2.5"
                >
                  <span className={`mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                    alert.severity === 'critical' ? 'bg-red-500' : alert.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-haven-text truncate">{alert.description}</p>
                    <p className="text-[10px] text-haven-text-tertiary mt-0.5">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-sm text-haven-text-secondary italic">{item.recommendation}</p>

          {item.actionLabel && (
            <button
              onClick={() => navigate(item.targetPath)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
            >
              {item.actionLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ───

export default function HomePage() {
  const {
    healthScore,
    protectionAreas,
    actionItems,
    user,
    runtimeStatus,
    alerts,
    alertCounts,
    safelist,
    chatSendMessage,
  } = useDashboard();
  const navigate = useNavigate();

  const color = scoreColor(healthScore);
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (healthScore / 100) * circumference;

  const metrics = runtimeStatus?.metrics;
  const details = runtimeStatus?.module_details;

  // Welcome card dismissal
  const [welcomeDismissed, setWelcomeDismissed] = useState(() => {
    try { return localStorage.getItem('haven-welcome-dismissed') === 'true'; } catch { return false; }
  });
  const dismissWelcome = () => {
    setWelcomeDismissed(true);
    localStorage.setItem('haven-welcome-dismissed', 'true');
  };

  const allEnabled = protectionAreas.every((a) => a.enabled);

  // ─── Today's Summary stats ───
  const todayStats = useMemo(() => {
    const now = Date.now();
    const dayMs = 86_400_000;
    const alerts24h = alerts.filter((a) => now - new Date(a.timestamp).getTime() <= dayMs);
    const resolvedCount = alerts.filter((a) => safelist.isSafe('alerts', a.id)).length;
    return [
      { icon: Eye, label: 'Apps', value: metrics?.process_count ?? 0 },
      { icon: Wifi, label: 'Connections', value: metrics?.network_connection_count ?? 0 },
      { icon: FileSearch, label: 'File events', value: metrics?.file_events_seen ?? 0 },
      { icon: Mail, label: 'Emails scanned', value: details?.email?.total_scanned ?? 0 },
      { icon: Bell, label: 'Alerts 24h', value: alerts24h.length },
      { icon: CheckCircle2, label: 'Resolved', value: resolvedCount },
    ];
  }, [metrics, details, alerts, safelist]);

  // ─── Threat Highlights (top 3 flagged items) ───
  const threatHighlights = useMemo(() => {
    const highlights: Array<{
      id: string;
      icon: typeof Eye;
      category: 'processes' | 'hosts' | 'emails';
      title: string;
      reason: string;
      safelistId: string;
      targetPath: string;
    }> = [];

    // Top flagged process
    const topProcs = details?.process?.top_processes || [];
    const flaggedProcs = topProcs
      .filter((p) => p.name && !isKnownSafe(p.name) && !safelist.isSafe('processes', p.name))
      .sort((a, b) => (b.cpu_percent || 0) - (a.cpu_percent || 0));
    if (flaggedProcs[0]) {
      const p = flaggedProcs[0];
      highlights.push({
        id: `proc-${p.pid}`,
        icon: Eye,
        category: 'processes',
        title: p.name || 'Unknown app',
        reason: `Unrecognized app${p.cpu_percent ? `, using ${p.cpu_percent.toFixed(1)}% CPU` : ''}`,
        safelistId: p.name || '',
        targetPath: '/dashboard/apps',
      });
    }

    // Top suspicious email
    const findings = details?.email?.findings || [];
    const flaggedEmails = findings
      .filter((f) => !safelist.isSafe('emails', f.email?.subject || ''))
      .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
    if (flaggedEmails[0]) {
      const f = flaggedEmails[0];
      const subject = f.email?.subject || 'Unknown subject';
      const risk = f.risk_score != null ? `${Math.round(f.risk_score * 100)}% risk` : 'Suspicious';
      highlights.push({
        id: `email-${subject}`,
        icon: Mail,
        category: 'emails',
        title: subject,
        reason: `${risk}${f.email?.from_email ? ` — from ${f.email.from_email}` : ''}`,
        safelistId: subject,
        targetPath: '/dashboard/email',
      });
    }

    // Top flagged network connection
    const conns = details?.network?.active_connections || [];
    const flaggedConns = conns.filter(
      (c) => c.hostname && !isSafeHost(c.hostname) && !safelist.isSafe('hosts', c.hostname),
    );
    if (flaggedConns[0]) {
      const c = flaggedConns[0];
      const dest = c.hostname || c.remote_ip || 'Unknown';
      highlights.push({
        id: `conn-${dest}`,
        icon: Wifi,
        category: 'hosts',
        title: dest,
        reason: `Unrecognized destination${c.process_name ? ` — from ${c.process_name}` : ''}`,
        safelistId: dest,
        targetPath: '/dashboard/network',
      });
    }

    return highlights;
  }, [details, safelist]);

  // ─── Protection Area "top example" text ───
  const areaExamples = useMemo(() => {
    const map: Record<string, string> = {};

    // Files: latest file event
    const fileEvents = details?.file?.recent_events || [];
    const lastFile = fileEvents[fileEvents.length - 1];
    if (lastFile) {
      const name = lastFile.filename || lastFile.path?.split('/').pop() || 'unknown';
      map.files = `${friendlyFileEventType(lastFile.type)}: ${name}`;
    }

    // Apps: top CPU process
    const topProcs = details?.process?.top_processes || [];
    const topByCpu = [...topProcs].sort((a, b) => (b.cpu_percent || 0) - (a.cpu_percent || 0))[0];
    if (topByCpu?.name) {
      map.apps = `Top: ${topByCpu.name}${topByCpu.cpu_percent ? ` (${topByCpu.cpu_percent.toFixed(0)}%)` : ''}`;
    }

    // Network: top connection destination
    const conns = details?.network?.active_connections || [];
    const topConn = conns[0];
    if (topConn) {
      map.network = `Latest: ${topConn.hostname || topConn.remote_ip || 'Unknown'}`;
    }

    // Email: latest flagged or clean
    const findings = details?.email?.findings || [];
    if (findings.length > 0 && findings[0].email?.subject) {
      map.email = `Flagged: ${findings[0].email.subject}`;
    } else if (details?.email?.enabled) {
      map.email = 'Inbox looks clean';
    }

    return map;
  }, [details]);

  // ─── Live Activity Feed (merged timeline) ───
  const activityFeed = useMemo(() => {
    type Event = {
      id: string;
      type: 'file' | 'process' | 'network';
      icon: typeof FileSearch;
      action: string;
      name: string;
      timestamp: number;
      targetPath: string;
    };

    const events: Event[] = [];

    // File events (timestamps are unix seconds)
    const fileEvents = details?.file?.recent_events || [];
    for (const ev of fileEvents) {
      if (!ev.timestamp) continue;
      const name = ev.filename || ev.path?.split('/').pop() || 'unknown file';
      events.push({
        id: `file-${ev.timestamp}-${name}`,
        type: 'file',
        icon: FileSearch,
        action: friendlyFileEventType(ev.type),
        name,
        timestamp: ev.timestamp * 1000,
        targetPath: '/dashboard/files',
      });
    }

    // Process events (create_time is unix seconds) — filter out shell/runtime noise
    const procEvents = details?.process?.recent_events || [];
    for (const ev of procEvents) {
      if (!ev.create_time || !ev.name) continue;
      if (isNoisyProcess(ev.name)) continue;
      events.push({
        id: `proc-${ev.pid}-${ev.create_time}`,
        type: 'process',
        icon: Eye,
        action: 'Started',
        name: ev.name,
        timestamp: ev.create_time * 1000,
        targetPath: '/dashboard/apps',
      });
    }

    // Network events (timestamps are unix seconds)
    const netEvents = details?.network?.recent_events || [];
    for (const ev of netEvents) {
      if (!ev.timestamp) continue;
      const dest = ev.hostname || ev.remote_ip || 'unknown';
      events.push({
        id: `net-${ev.timestamp}-${dest}`,
        type: 'network',
        icon: Globe,
        action: 'Connected',
        name: `${ev.process_name || 'process'} → ${dest}`,
        timestamp: ev.timestamp * 1000,
        targetPath: '/dashboard/network',
      });
    }

    return events.sort((a, b) => b.timestamp - a.timestamp).slice(0, 15);
  }, [details]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-semibold text-haven-text">
          {user?.full_name ? `Hi, ${user.full_name.split(' ')[0]}` : 'Welcome back'}
        </h1>
        <p className="mt-1 text-sm text-haven-text-secondary">
          Here&apos;s your security overview.
        </p>
      </div>

      {/* Quick Actions Row */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => navigate('/dashboard/chat')}
          className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium text-haven-text hover:bg-haven-surface-hover transition-colors"
          style={{ borderColor: 'var(--haven-border)' }}
        >
          <MessageCircle className="h-4 w-4 text-blue-500" />
          Open Chat
        </button>
        <button
          onClick={() => navigate('/dashboard/alerts')}
          className="relative inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium text-haven-text hover:bg-haven-surface-hover transition-colors"
          style={{ borderColor: 'var(--haven-border)' }}
        >
          <Bell className="h-4 w-4 text-amber-500" />
          Review Alerts
          {alertCounts.critical + alertCounts.warning > 0 && (
            <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
              {alertCounts.critical + alertCounts.warning}
            </span>
          )}
        </button>
        <button
          onClick={() => navigate('/dashboard/email')}
          className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium text-haven-text hover:bg-haven-surface-hover transition-colors"
          style={{ borderColor: 'var(--haven-border)' }}
        >
          <Mail className="h-4 w-4 text-blue-500" />
          Check Email
        </button>
        <button
          onClick={() => navigate('/dashboard/settings')}
          className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium text-haven-text hover:bg-haven-surface-hover transition-colors"
          style={{ borderColor: 'var(--haven-border)' }}
        >
          <Settings className="h-4 w-4 text-haven-text-secondary" />
          Settings
        </button>
      </div>

      {/* Welcome / Onboarding Card */}
      {!welcomeDismissed && (
        <div className="card p-5 relative">
          <button
            onClick={dismissWelcome}
            className="absolute top-3 right-3 text-haven-text-tertiary hover:text-haven-text transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
              <Monitor className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-haven-text">Haven monitors your device for security threats</h3>
              <ul className="mt-2 space-y-1 text-xs text-haven-text-secondary">
                <li className="flex items-center gap-2">
                  <Eye className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                  Watches running apps for suspicious behavior
                </li>
                <li className="flex items-center gap-2">
                  <Wifi className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                  Monitors network connections to unknown servers
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                  Scans your email for phishing attempts
                </li>
              </ul>
              {!allEnabled && (
                <button
                  onClick={() => navigate('/dashboard/settings')}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600 transition-colors"
                >
                  Get started
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Score + Today's Summary — side by side */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Protection Score */}
        <div className="card p-8 flex flex-col items-center text-center">
          <div className="relative h-36 w-36">
            <svg className="h-36 w-36 -rotate-90" viewBox="0 0 128 128">
              <circle
                cx="64" cy="64" r="54"
                stroke="var(--haven-border)"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="64" cy="64" r="54"
                stroke={color}
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 1s ease-out' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className={`text-4xl font-bold ${scoreTextClass(healthScore)}`}>
                {healthScore}
              </p>
            </div>
          </div>
          <p className={`mt-4 text-lg font-semibold ${scoreTextClass(healthScore)}`}>
            {scoreLabel(healthScore)}
          </p>
          <p className="mt-1 text-sm text-haven-text-secondary">Your security score</p>
        </div>

        {/* Today's Summary */}
        <div className="card p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-haven-text">
            <Activity className="h-4 w-4 text-blue-500" />
            Today&apos;s activity
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {todayStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="flex items-center gap-3 rounded-xl bg-haven-surface-hover p-3"
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                    <Icon className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-haven-text leading-none">
                      {stat.value.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-haven-text-tertiary mt-0.5">{stat.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Threat Highlights */}
      {threatHighlights.length > 0 && (
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-haven-text">
            <Zap className="h-4 w-4 text-amber-500" />
            Threat highlights
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {threatHighlights.map((threat) => {
              const Icon = threat.icon;
              return (
                <div
                  key={threat.id}
                  className="card border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/5 p-4 flex flex-col gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                      <Icon className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-haven-text truncate">{threat.title}</p>
                      <p className="text-xs text-haven-text-secondary mt-0.5 line-clamp-2">{threat.reason}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(threat.targetPath)}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600 transition-colors"
                    >
                      Review
                      <ArrowRight className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => {
                        // Build targeted context for this specific threat, then send + navigate
                        const kind =
                          threat.category === 'processes' ? 'app'
                          : threat.category === 'hosts' ? 'network connection'
                          : 'email';
                        const description = [
                          `Threat the user is asking about: "${threat.title}"`,
                          `Kind: ${kind}`,
                          `Category: ${threat.category}`,
                          `Reason flagged: ${threat.reason}`,
                        ].join('\n');
                        chatSendMessage(
                          `Tell me about the flagged ${kind} "${threat.title}". Why is it flagged and is it safe?`,
                          [
                            {
                              source: 'Threat Lookup',
                              severity: 'warning',
                              timestamp: new Date().toISOString(),
                              description,
                            },
                          ],
                        );
                        navigate('/dashboard/chat');
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium text-haven-text-secondary hover:text-blue-500 hover:border-blue-500 transition-colors"
                      style={{ borderColor: 'var(--haven-border)' }}
                      title="Ask in chat"
                    >
                      <MessageCircle className="h-3 w-3" />
                      Ask
                    </button>
                    <button
                      onClick={() => safelist.markSafe(threat.category, threat.safelistId)}
                      className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium text-haven-text-secondary hover:text-green-500 hover:border-green-500 transition-colors"
                      style={{ borderColor: 'var(--haven-border)' }}
                      title="Mark as safe"
                    >
                      <ShieldCheck className="h-3 w-3" />
                      Safe
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Items — Expandable */}
      {actionItems.length > 0 && actionItems[0].id !== 'all-good' && (
        <div>
          <h2 className="mb-4 text-base font-semibold text-haven-text">
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              {actionItems.length} thing{actionItems.length === 1 ? '' : 's'} need{actionItems.length === 1 ? 's' : ''} your attention
            </span>
          </h2>
          <div className="space-y-2">
            {actionItems.map((item) => (
              <ActionItemCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Protection Areas — enriched cards */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-haven-text">Protection areas</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {protectionAreas.map((area) => {
            const Icon = AREA_ICON[area.id] || ShieldCheck;
            const example = areaExamples[area.id];
            return (
              <button
                key={area.id}
                onClick={() => navigate(AREA_HREF[area.id] || '/dashboard')}
                className="card-hover p-5 flex flex-col gap-3 text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                    <Icon className="h-5 w-5 text-blue-500" />
                  </div>
                  {area.enabled && area.score > 0 ? (
                    <span className={`text-xl font-bold ${scoreTextClass(area.score)}`}>
                      {area.score}
                    </span>
                  ) : (
                    <span className={statusDotClass(area.status)} />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-haven-text">{area.label}</p>
                  <p className={`mt-0.5 text-xs font-medium ${statusTextClass(area.status)}`}>
                    {area.detail}
                  </p>
                  {example && (
                    <p className="mt-1 text-xs text-haven-text-tertiary truncate">
                      {example}
                    </p>
                  )}
                </div>
                {/* Progress bar */}
                {area.enabled && area.score > 0 && (
                  <div className="h-1.5 w-full rounded-full bg-haven-surface-hover overflow-hidden">
                    <div
                      className={`h-full ${scoreBarClass(area.score)} transition-all`}
                      style={{ width: `${area.score}%` }}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Activity Feed */}
      {activityFeed.length > 0 && (
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-haven-text">
            <Activity className="h-4 w-4 text-blue-500" />
            Live activity
          </h2>
          <div className="card divide-y max-h-96 overflow-y-auto" style={{ borderColor: 'var(--haven-border)' }}>
            {activityFeed.map((event) => {
              const Icon = event.icon;
              const iconColor =
                event.type === 'file'
                  ? 'text-blue-500 bg-blue-500/10'
                  : event.type === 'process'
                  ? 'text-purple-500 bg-purple-500/10'
                  : 'text-green-500 bg-green-500/10';
              return (
                <button
                  key={event.id}
                  onClick={() => navigate(event.targetPath)}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-haven-surface-hover transition-colors"
                >
                  <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${iconColor}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-haven-text-tertiary">{event.action}</p>
                    <p className="text-sm text-haven-text truncate">{event.name}</p>
                  </div>
                  <span className="text-xs text-haven-text-tertiary flex-shrink-0">
                    {timeAgo(event.timestamp)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* All Good state */}
      {actionItems.length === 1 && actionItems[0].id === 'all-good' && threatHighlights.length === 0 && (
        <div className="card p-6 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-green-500" />
          <p className="mt-3 text-sm font-semibold text-haven-text">Everything looks good</p>
          <p className="mt-1 text-xs text-haven-text-secondary">
            All protection areas are active. We&apos;ll let you know if anything needs attention.
          </p>
        </div>
      )}
    </div>
  );
}
