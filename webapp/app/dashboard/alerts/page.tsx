'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Bell, CheckCircle2, Clock, Info, MessageCircle, ShieldCheck } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import { SecurityAlert } from '../types';
import { timeAgo } from '../lib/timeAgo';

function severityConfig(severity: SecurityAlert['severity']) {
  if (severity === 'critical')
    return {
      border: 'border-red-200 dark:border-red-500/20',
      bg: 'bg-red-50 dark:bg-red-500/5',
      icon: AlertTriangle,
      iconColor: 'text-red-500',
    };
  if (severity === 'warning')
    return {
      border: 'border-amber-200 dark:border-amber-500/20',
      bg: 'bg-amber-50 dark:bg-amber-500/5',
      icon: Bell,
      iconColor: 'text-amber-500',
    };
  return {
    border: 'border-blue-200 dark:border-blue-500/20',
    bg: 'bg-blue-50 dark:bg-blue-500/5',
    icon: Info,
    iconColor: 'text-blue-500',
  };
}

function getAlertDetail(alert: SecurityAlert): string {
  if (typeof alert.details === 'string') return alert.details;
  const d = alert.details as any;
  if (d?.recommendation) return d.recommendation;
  if (d?.description) return d.description;
  // Build a summary from email alert details
  const parts: string[] = [];
  if (d?.from_email) parts.push(`From: ${d.from_name ? `${d.from_name} <${d.from_email}>` : d.from_email}`);
  if (d?.reasons?.length) parts.push(d.reasons.slice(0, 2).join('. '));
  if (d?.recommendation) parts.push(d.recommendation);
  return parts.join(' — ') || '';
}

// Filter out noise — alerts with no useful info
function isUsefulAlert(alert: SecurityAlert): boolean {
  const desc = alert.description.toLowerCase();
  // "New file: None" is meaningless
  if (desc === 'new file: none' || desc === 'new file: null') return false;
  return true;
}

// Deduplicate by description
function deduplicateAlerts(alerts: SecurityAlert[]): SecurityAlert[] {
  const seen = new Set<string>();
  return alerts.filter((a) => {
    const key = a.description;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function AlertCard({
  alert,
  onAskChat,
  onResolve,
}: {
  alert: SecurityAlert;
  onAskChat: (alert: SecurityAlert) => void;
  onResolve?: (alert: SecurityAlert) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = severityConfig(alert.severity);
  const Icon = config.icon;
  const detail = getAlertDetail(alert);

  return (
    <div className={`rounded-2xl border ${config.border} ${config.bg} p-4`}>
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${config.iconColor}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-left"
            >
              <p className="text-sm font-medium text-haven-text">{alert.description}</p>
            </button>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => onAskChat(alert)}
                className="p-1 text-haven-text-tertiary transition hover:text-blue-500"
                title="Ask about this"
              >
                <MessageCircle className="h-3.5 w-3.5" />
              </button>
              {onResolve && (
                <button
                  onClick={() => onResolve(alert)}
                  className="p-1 text-haven-text-tertiary transition hover:text-green-500"
                  title="Mark as resolved"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                </button>
              )}
              <span className="text-xs text-haven-text-tertiary">
                {timeAgo(alert.timestamp)}
              </span>
            </div>
          </div>
          {expanded && detail && (
            <p className="mt-2 text-xs text-haven-text-secondary leading-relaxed">
              {detail}
            </p>
          )}
          {!expanded && detail && (
            <p className="mt-1 text-xs text-haven-text-tertiary truncate">{detail}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AlertsPage() {
  const { alerts, chatSendMessage, safelist } = useDashboard();

  // Clean up alerts: remove noise, deduplicate
  const cleanAlerts = useMemo(() => {
    return deduplicateAlerts(alerts.filter(isUsefulAlert));
  }, [alerts]);

  // Split into unresolved and resolved
  const unresolvedAlerts = cleanAlerts.filter((a) => !safelist.isSafe('alerts', a.id));
  const resolvedAlerts = cleanAlerts.filter((a) => safelist.isSafe('alerts', a.id));

  const now = Date.now();
  const DAY_MS = 86_400_000;

  // Split unresolved into today (last 24h) and older
  const todayAlerts = useMemo(() => {
    return unresolvedAlerts.filter((a) => now - new Date(a.timestamp).getTime() <= DAY_MS);
  }, [unresolvedAlerts, now]);

  const olderAlerts = useMemo(() => {
    return unresolvedAlerts.filter((a) => now - new Date(a.timestamp).getTime() > DAY_MS);
  }, [unresolvedAlerts, now]);

  const todayUrgent = todayAlerts.filter((a) => a.severity !== 'info');
  const todayInfo = todayAlerts.filter((a) => a.severity === 'info');

  const askAboutAlert = (alert: SecurityAlert) => {
    chatSendMessage(`Tell me about this alert: "${alert.description}". What does it mean and what should I do?`);
  };

  const resolveAlert = (alert: SecurityAlert) => {
    safelist.markSafe('alerts', alert.id);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-haven-text">Alerts</h1>
        <p className="mt-1 text-sm text-haven-text-secondary">
          Everything HavenAI has noticed on your device.
        </p>
      </div>

      {/* Today — Needs attention */}
      {todayUrgent.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-haven-text">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Needs attention ({todayUrgent.length})
          </h2>
          <div className="max-h-[20rem] overflow-y-auto space-y-2 pr-1">
            {todayUrgent.map((alert) => (
              <AlertCard key={alert.id} alert={alert} onAskChat={askAboutAlert} onResolve={resolveAlert} />
            ))}
          </div>
        </div>
      )}

      {/* Today — Info */}
      {todayInfo.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-haven-text">
            <Info className="h-4 w-4 text-blue-500" />
            Today ({todayInfo.length})
          </h2>
          <div className="max-h-[20rem] overflow-y-auto space-y-2 pr-1">
            {todayInfo.map((alert) => (
              <AlertCard key={alert.id} alert={alert} onAskChat={askAboutAlert} onResolve={resolveAlert} />
            ))}
          </div>
        </div>
      )}

      {/* All clear for today */}
      {todayAlerts.length === 0 && (
        <div className="card p-6 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-green-500" />
          <p className="mt-3 text-sm font-semibold text-haven-text">All clear today</p>
          <p className="mt-1 text-xs text-haven-text-secondary">
            Nothing needs your attention right now.
          </p>
        </div>
      )}

      {/* Older alerts — collapsed history */}
      {olderAlerts.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-haven-text">
            <Clock className="h-4 w-4 text-haven-text-tertiary" />
            Recent history ({olderAlerts.length})
          </h2>
          <div className="max-h-[16rem] overflow-y-auto space-y-2 pr-1">
            {olderAlerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} onAskChat={askAboutAlert} onResolve={resolveAlert} />
            ))}
          </div>
        </div>
      )}

      {/* Resolved alerts */}
      {resolvedAlerts.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-haven-text">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Resolved ({resolvedAlerts.length})
          </h2>
          <div className="max-h-[16rem] overflow-y-auto space-y-2 pr-1 opacity-60">
            {resolvedAlerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} onAskChat={askAboutAlert} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
