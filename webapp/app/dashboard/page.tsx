'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Eye,
  FileSearch,
  Mail,
  Monitor,
  ShieldCheck,
  Wifi,
  X,
} from 'lucide-react';
import { useDashboard, ProtectionArea } from './context/DashboardContext';
import { useNavigate } from './context/NavigationContext';
import { Recommendation } from './types';

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

          {/* Related alerts */}
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

          {/* Recommendation */}
          <p className="text-sm text-haven-text-secondary italic">{item.recommendation}</p>

          {/* Action button */}
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

export default function HomePage() {
  const { healthScore, protectionAreas, actionItems, user, runtimeStatus } = useDashboard();
  const navigate = useNavigate();

  const color = scoreColor(healthScore);
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (healthScore / 100) * circumference;

  // Quick stats from runtime metrics
  const metrics = runtimeStatus?.metrics;
  const details = runtimeStatus?.module_details;
  const quickStats = [
    { label: 'Apps', value: metrics?.process_count ?? 0 },
    { label: 'Connections', value: metrics?.network_connection_count ?? 0 },
    { label: 'File events', value: metrics?.file_events_seen ?? 0 },
    { label: 'Emails scanned', value: details?.email?.total_scanned ?? 0 },
  ].filter((s) => s.value > 0);

  // Welcome card dismissal
  const [welcomeDismissed, setWelcomeDismissed] = useState(() => {
    try { return localStorage.getItem('haven-welcome-dismissed') === 'true'; } catch { return false; }
  });
  const dismissWelcome = () => {
    setWelcomeDismissed(true);
    localStorage.setItem('haven-welcome-dismissed', 'true');
  };

  const allEnabled = protectionAreas.every((a) => a.enabled);

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
        <p className="mt-1 text-sm text-haven-text-secondary">
          Your security score
        </p>

        {/* Quick Stats */}
        {quickStats.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {quickStats.map((stat) => (
              <span
                key={stat.label}
                className="inline-flex items-center rounded-full bg-haven-surface-hover px-3 py-1 text-xs font-medium text-haven-text-secondary"
              >
                {stat.value} {stat.label.toLowerCase()}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Protection Areas */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-haven-text">Protection areas</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {protectionAreas.map((area) => {
            const Icon = AREA_ICON[area.id] || ShieldCheck;
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
                    <span className={`text-lg font-bold ${scoreTextClass(area.score)}`}>
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
                </div>
              </button>
            );
          })}
        </div>
      </div>

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

      {/* All Good state */}
      {actionItems.length === 1 && actionItems[0].id === 'all-good' && (
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
