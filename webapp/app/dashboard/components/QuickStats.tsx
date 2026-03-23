import { Activity, Clock3, Network, ShieldAlert } from 'lucide-react';
import { SecurityStats } from '../types';

interface QuickStatsProps {
  stats: SecurityStats;
}

export function QuickStats({ stats }: QuickStatsProps) {
  const trendLabel = `${stats.threatsTrend >= 0 ? '+' : ''}${stats.threatsTrend}%`;
  const trendClass = stats.threatsTrend > 0 ? 'text-red-400' : stats.threatsTrend < 0 ? 'text-emerald-400' : 'text-gray-500';
  const intensityBar = `${Math.max(8, Math.min(100, stats.threatsBlocked24h * 6))}%`;

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Quick Stats</h2>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5 text-cyan-400" />
              Alerts (24h)
            </span>
            <span className={trendClass}>{trendLabel}</span>
          </div>
          <p className="mt-1.5 text-xl font-bold text-white">{stats.threatsBlocked24h}</p>
          <div className="mt-2 h-1 rounded-full bg-white/[0.06]">
            <div className="h-1 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-700" style={{ width: intensityBar }} />
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <p className="text-xs text-gray-500">Active Connections</p>
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-xl font-bold text-white">
            <Network className="h-4 w-4 text-cyan-400" />
            {stats.activeConnections}
          </p>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <p className="text-xs text-gray-500">File Events</p>
          <p className="mt-1.5 text-xl font-bold text-white">{stats.filesMonitored.toLocaleString()}</p>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 col-span-2">
          <p className="inline-flex items-center gap-1 text-xs text-gray-500">
            <Clock3 className="h-3.5 w-3.5" />
            Last Full Scan
          </p>
          <p className="mt-1 text-sm text-gray-300">{new Date(stats.lastFullScan).toLocaleString()}</p>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 col-span-2">
          <p className="inline-flex items-center gap-1 text-xs text-gray-500">
            <Activity className="h-3.5 w-3.5" />
            Uptime
          </p>
          <p className="mt-1 text-sm font-semibold text-emerald-400">{stats.uptime}</p>
        </div>
      </div>
    </section>
  );
}
