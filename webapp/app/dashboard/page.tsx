'use client';

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Eye,
  FileSearch,
  Mail,
  ShieldCheck,
  Wifi,
} from 'lucide-react';
import { useDashboard, ProtectionArea } from './context/DashboardContext';
import { useNavigate } from './context/NavigationContext';

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

export default function HomePage() {
  const { healthScore, protectionAreas, actionItems, user } = useDashboard();
  const navigate = useNavigate();

  const color = scoreColor(healthScore);
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (healthScore / 100) * circumference;

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
                    {area.enabled ? area.detail : area.detail}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Items */}
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
              <button
                key={item.id}
                onClick={() => navigate(
                  item.context === 'alerts' ? '/dashboard/alerts'
                    : item.context === 'email' ? '/dashboard/email'
                    : item.context === 'settings' ? '/dashboard/settings'
                    : '/dashboard'
                )}
                className="card-hover flex w-full items-center justify-between p-4 text-left"
              >
                <p className="text-sm text-haven-text">{item.title}</p>
                <ArrowRight className="h-4 w-4 text-haven-text-tertiary" />
              </button>
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
