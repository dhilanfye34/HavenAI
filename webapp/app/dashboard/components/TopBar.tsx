import { Bell, Shield, UserCircle2, LogOut } from 'lucide-react';

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
    <header className="border-b border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-cyan-400" />
          <span className="text-lg font-semibold tracking-tight text-white">
            HavenAI <span className="text-gray-500 font-normal">Command Center</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="relative rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5 text-gray-400 transition-all duration-300 hover:border-white/[0.15] hover:bg-white/[0.06] hover:text-white"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {notificationCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white animate-pulse-glow">
                {notificationCount}
              </span>
            )}
          </button>

          <div className="hidden items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 md:flex">
            <UserCircle2 className="h-4 w-4 text-cyan-400" />
            <span className="max-w-[180px] truncate text-sm text-gray-300">{userLabel}</span>
          </div>

          <button
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-gray-400 transition-all duration-300 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
