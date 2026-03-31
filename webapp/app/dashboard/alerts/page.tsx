'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Bell, CheckCircle2, Info } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import { SecurityAlert } from '../types';

type Filter = 'all' | 'urgent' | 'info';

function severityConfig(severity: SecurityAlert['severity']) {
  if (severity === 'critical')
    return {
      border: 'border-red-200 dark:border-red-500/20',
      bg: 'bg-red-50 dark:bg-red-500/5',
      icon: AlertTriangle,
      iconColor: 'text-red-500',
      label: 'Urgent',
    };
  if (severity === 'warning')
    return {
      border: 'border-amber-200 dark:border-amber-500/20',
      bg: 'bg-amber-50 dark:bg-amber-500/5',
      icon: Bell,
      iconColor: 'text-amber-500',
      label: 'Warning',
    };
  return {
    border: 'border-blue-200 dark:border-blue-500/20',
    bg: 'bg-blue-50 dark:bg-blue-500/5',
    icon: Info,
    iconColor: 'text-blue-500',
    label: 'Info',
  };
}

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function AlertCard({
  alert,
}: {
  alert: SecurityAlert;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = severityConfig(alert.severity);
  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={() => setExpanded(!expanded)}
      className={`w-full rounded-2xl border ${config.border} ${config.bg} p-4 text-left transition-all`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${config.iconColor}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-haven-text">{alert.description}</p>
            <span className="shrink-0 text-xs text-haven-text-tertiary">
              {timeAgo(alert.timestamp)}
            </span>
          </div>
          {expanded && alert.details && (
            <p className="mt-2 text-xs text-haven-text-secondary leading-relaxed">
              {alert.details}
            </p>
          )}
          {!expanded && (
            <p className="mt-1 text-xs text-haven-text-tertiary">Tap for details</p>
          )}
        </div>
      </div>
    </button>
  );
}

export default function AlertsPage() {
  const { alerts, alertCounts } = useDashboard();
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return alerts;
    if (filter === 'urgent') return alerts.filter((a) => a.severity !== 'info');
    return alerts.filter((a) => a.severity === 'info');
  }, [alerts, filter]);

  const totalUrgent = alertCounts.critical + alertCounts.warning;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-haven-text">Alerts</h1>
        <p className="mt-1 text-sm text-haven-text-secondary">
          Everything HavenAI has noticed on your device.
        </p>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2">
        {([
          { id: 'all', label: `All (${alerts.length})` },
          { id: 'urgent', label: `Needs attention (${totalUrgent})` },
          { id: 'info', label: `Info (${alertCounts.info})` },
        ] as { id: Filter; label: string }[]).map((opt) => (
          <button
            key={opt.id}
            onClick={() => setFilter(opt.id)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
              filter === opt.id
                ? 'bg-blue-500 text-white'
                : 'bg-haven-surface text-haven-text-secondary hover:text-haven-text'
            }`}
            style={filter !== opt.id ? { border: '1px solid var(--haven-border)' } : undefined}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Alert list */}
      <div className="space-y-3">
        {filtered.map((alert) => (
          <AlertCard key={alert.id} alert={alert} />
        ))}
        {filtered.length === 0 && (
          <div className="card p-8 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-green-500" />
            <p className="mt-3 text-sm font-medium text-haven-text">No alerts</p>
            <p className="mt-1 text-xs text-haven-text-secondary">
              {filter === 'urgent'
                ? "Nothing needs your attention right now."
                : "We haven't detected anything yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
