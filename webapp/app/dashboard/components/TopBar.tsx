import { Bell, Shield, UserCircle2 } from 'lucide-react';

interface TopBarProps {
  userLabel: string;
  notificationCount: number;
  onLogout: () => void;
}

export function TopBar({
  userLabel,
  notificationCount,
  onLogout,
}: TopBarProps) {
  return (
    <header className="border-b border-gray-700 bg-gray-900/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-cyan-400" />
          <span className="text-lg font-semibold tracking-tight text-white">
            HavenAI Command Center
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="relative rounded-lg border border-gray-700 bg-gray-800 p-2 text-gray-300 transition hover:text-white"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {notificationCount}
            </span>
          </button>

          <div className="hidden items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 md:flex">
            <UserCircle2 className="h-4 w-4 text-cyan-300" />
            <span className="max-w-[220px] truncate text-sm text-gray-200">{userLabel}</span>
          </div>

          <button
            onClick={onLogout}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-medium text-gray-200 transition hover:bg-gray-700"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
