'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  Eye,
  FileSearch,
  Home,
  Mail,
  MessageCircle,
  Settings,
  Wifi,
} from 'lucide-react';
import ShieldLock from '../../components/ShieldLock';
import { useDashboard } from '../context/DashboardContext';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: Home, badgeKey: null },
  { href: '/dashboard/apps', label: 'Apps & Privacy', icon: Eye, badgeKey: null },
  { href: '/dashboard/files', label: 'Files', icon: FileSearch, badgeKey: null },
  { href: '/dashboard/network', label: 'Network', icon: Wifi, badgeKey: null },
  { href: '/dashboard/email', label: 'Email', icon: Mail, badgeKey: null },
  { href: '/dashboard/alerts', label: 'Alerts', icon: Bell, badgeKey: 'alerts' as const },
  { href: '/dashboard/chat', label: 'Chat', icon: MessageCircle, badgeKey: null },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, badgeKey: null },
];

export function Sidebar() {
  const pathname = usePathname();
  const { alertCounts } = useDashboard();
  const urgentCount = alertCounts.critical + alertCounts.warning;

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const getBadge = (badgeKey: string | null) => {
    if (badgeKey === 'alerts' && urgentCount > 0) return urgentCount;
    return 0;
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:inset-y-0 lg:z-30 border-r bg-haven-surface" style={{ borderColor: 'var(--haven-border)' }}>
        <div className="flex h-16 items-center gap-2.5 px-6">
          <ShieldLock className="h-7 w-7 text-blue-500" />
          <span className="text-lg font-bold tracking-tight text-haven-text">HavenAI</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map(({ href, label, icon: Icon, badgeKey }) => {
            const active = isActive(href);
            const badge = getBadge(badgeKey);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    : 'text-haven-text-secondary hover:bg-haven-surface-hover hover:text-haven-text'
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span className="flex-1">{label}</span>
                {badge > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-30 flex lg:hidden border-t bg-haven-surface" style={{ borderColor: 'var(--haven-border)' }}>
        {NAV_ITEMS.filter((_, i) => i < 5).map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-all ${
                active
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-haven-text-tertiary'
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
        <Link
          href="/dashboard/alerts"
          className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-all ${
            pathname.startsWith('/dashboard/alerts')
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-haven-text-tertiary'
          }`}
        >
          <div className="relative">
            <Bell className="h-5 w-5" />
            {urgentCount > 0 && (
              <span className="absolute -right-1.5 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white">
                {urgentCount}
              </span>
            )}
          </div>
          Alerts
        </Link>
      </nav>
    </>
  );
}
