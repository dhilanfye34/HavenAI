'use client';

import { useEffect, useState } from 'react';
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
import ShieldLock from '../components/ShieldLock';
import { DashboardProvider, useDashboard } from '../../../../../webapp/app/dashboard/context/DashboardContext';
import { NavigationProvider } from '../../../../../webapp/app/dashboard/context/NavigationContext';

// Import all page components directly
import SharedHomePage from '../../../../../webapp/app/dashboard/page';
import SharedAppsPage from '../../../../../webapp/app/dashboard/apps/page';
import SharedFilesPage from '../../../../../webapp/app/dashboard/files/page';
import SharedNetworkPage from '../../../../../webapp/app/dashboard/network/page';
import SharedEmailPage from '../../../../../webapp/app/dashboard/email/page';
import SharedAlertsPage from '../../../../../webapp/app/dashboard/alerts/page';
import SharedChatPage from '../../../../../webapp/app/dashboard/chat/page';
import SharedSettingsPage from '../../../../../webapp/app/dashboard/settings/page';
import { FloatingAssistant } from '../../../../../webapp/app/dashboard/components/FloatingAssistant';

type Tab = 'home' | 'apps' | 'files' | 'network' | 'email' | 'alerts' | 'chat' | 'settings';

const NAV_ITEMS: { id: Tab; label: string; icon: typeof Home; statusArea: string | null }[] = [
  { id: 'home', label: 'Home', icon: Home, statusArea: null },
  { id: 'apps', label: 'Apps & Privacy', icon: Eye, statusArea: 'apps' },
  { id: 'files', label: 'Files', icon: FileSearch, statusArea: 'files' },
  { id: 'network', label: 'Network', icon: Wifi, statusArea: 'network' },
  { id: 'email', label: 'Email', icon: Mail, statusArea: 'email' },
  { id: 'alerts', label: 'Alerts', icon: Bell, statusArea: null },
  { id: 'chat', label: 'Chat', icon: MessageCircle, statusArea: null },
  { id: 'settings', label: 'Settings', icon: Settings, statusArea: 'settings' },
];

function statusDotColor(status: string | undefined): string | null {
  if (status === 'protected') return 'bg-green-500';
  if (status === 'concerns') return 'bg-amber-500';
  if (status === 'off') return 'bg-gray-400 dark:bg-gray-600';
  if (status === 'not-setup') return 'bg-red-500';
  if (status === 'error') return 'bg-amber-500';
  return null;
}

function ElectronSidebar({ tab, onTabChange }: { tab: Tab; onTabChange: (t: Tab) => void }) {
  const { alertCounts, protectionAreas, agents } = useDashboard();
  const urgentCount = alertCounts.critical + alertCounts.warning;

  const getStatusDot = (statusArea: string | null): string | null => {
    if (!statusArea) return null;
    if (statusArea === 'settings') {
      return agents.some((a) => a.status === 'error') ? 'bg-amber-500' : null;
    }
    const area = protectionAreas.find((a) => a.id === statusArea);
    return area ? statusDotColor(area.status) : null;
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:inset-y-0 lg:z-30 border-r bg-haven-surface" style={{ borderColor: 'var(--haven-border)' }}>
        <div className="flex h-16 items-center gap-2.5 px-6 drag-region">
          <ShieldLock className="h-7 w-7 text-blue-500 no-drag" />
          <span className="text-lg font-bold tracking-tight text-haven-text no-drag">HavenAI</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map(({ id, label, icon: Icon, statusArea }) => {
            const dotColor = getStatusDot(statusArea);
            return (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  tab === id
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    : 'text-haven-text-secondary hover:bg-haven-surface-hover hover:text-haven-text'
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span className="flex-1 text-left">{label}</span>
                {dotColor && (
                  <span className={`h-2 w-2 rounded-full ${dotColor}`} />
                )}
                {id === 'alerts' && urgentCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                    {urgentCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-30 flex lg:hidden border-t bg-haven-surface" style={{ borderColor: 'var(--haven-border)' }}>
        {NAV_ITEMS.filter((_, i) => i < 5).map(({ id, label, icon: Icon, statusArea }) => {
          const dotColor = getStatusDot(statusArea);
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-all ${
                tab === id
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-haven-text-tertiary'
              }`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {dotColor && (
                  <span className={`absolute -right-1 -top-0.5 h-1.5 w-1.5 rounded-full ${dotColor}`} />
                )}
              </div>
              {label}
            </button>
          );
        })}
        <button
          onClick={() => onTabChange('alerts')}
          className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-all ${
            tab === 'alerts'
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
        </button>
      </nav>
    </>
  );
}

const PATH_TO_TAB: Record<string, Tab> = {
  '/dashboard': 'home',
  '/dashboard/apps': 'apps',
  '/dashboard/files': 'files',
  '/dashboard/network': 'network',
  '/dashboard/email': 'email',
  '/dashboard/alerts': 'alerts',
  '/dashboard/chat': 'chat',
  '/dashboard/settings': 'settings',
};

function DashboardContent() {
  const [tab, setTab] = useState<Tab>('home');

  // Navigation handler: maps URL paths to tab switches for Electron
  const navigate = (path: string) => {
    const mapped = PATH_TO_TAB[path];
    if (mapped) {
      setTab(mapped);
    }
  };

  return (
    <NavigationProvider navigate={navigate}>
      <div className="min-h-screen bg-haven-bg">
        <ElectronSidebar tab={tab} onTabChange={setTab} />
        <main className="lg:pl-60">
          <div className="mx-auto max-w-5xl px-4 py-6 pb-24 lg:px-8 lg:py-8 lg:pb-8">
            {tab === 'home' && <SharedHomePage />}
            {tab === 'apps' && <SharedAppsPage />}
            {tab === 'files' && <SharedFilesPage />}
            {tab === 'network' && <SharedNetworkPage />}
            {tab === 'email' && <SharedEmailPage />}
            {tab === 'alerts' && <SharedAlertsPage />}
            {tab === 'chat' && <SharedChatPage />}
            {tab === 'settings' && <SharedSettingsPage />}
          </div>
        </main>
        <FloatingAssistant />
      </div>
    </NavigationProvider>
  );
}

export default function DashboardPage() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = localStorage.getItem('access_token');
    setToken(accessToken);

    const havenai = (window as any).havenai;

    const syncRuntime = async () => {
      if (!accessToken) return;
      const refreshToken = localStorage.getItem('refresh_token') || undefined;
      const userRaw = localStorage.getItem('user');
      const user = userRaw ? JSON.parse(userRaw) : undefined;

      if (havenai?.syncAgentAuth) {
        await havenai.syncAgentAuth({ accessToken, refreshToken, user });
      }
      havenai?.sendToAgent?.({ type: 'get_status' });
    };

    // Apply saved theme
    const theme = localStorage.getItem('haven-theme');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    syncRuntime().catch(() => undefined);
    const timer = window.setInterval(() => {
      syncRuntime().catch(() => undefined);
    }, 2000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <DashboardProvider token={token}>
      <DashboardContent />
    </DashboardProvider>
  );
}
