import { Activity, Clock3, Network, ShieldAlert } from 'lucide-react';

import { SecurityStats } from '../types';

interface QuickStatsProps {
  stats: SecurityStats;
}

export function QuickStats({ stats }: QuickStatsProps) {
  const trendLabel = `${stats.threatsTrend >= 0 ? '+' : ''}${stats.threatsTrend}%`;
  const trendClass = stats.threatsTrend > 0 ? 'text-red-400' : stats.threatsTrend < 0 ? 'text-green-400' : 'text-gray-400';
  const intensityBar = `${Math.max(8, Math.min(100, stats.threatsBlocked24h * 6))}%`;

  return (
    <section className="rounded-2xl border border-gray-700 bg-gray-900/70 p-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">Quick Stats</h2>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="inline-flex items-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5" />
              Alerts Flagged (24h)
            </span>
            <span className={trendClass}>{trendLabel}</span>
          </div>
          <p className="mt-1 text-lg font-semibold text-white">{stats.threatsBlocked24h}</p>
          <div className="mt-2 h-1.5 rounded bg-gray-700">
            <div className="h-1.5 rounded bg-cyan-400" style={{ width: intensityBar }} />
          </div>
        </div>

        <div className="rounded-lg border border-gray-700 bg-gray-800 p-2">
          <p className="text-xs text-gray-400">Active Connections</p>
          <p className="mt-1 inline-flex items-center gap-1 text-lg font-semibold text-white">
            <Network className="h-4 w-4 text-cyan-300" />
            {stats.activeConnections}
          </p>
        </div>

        <div className="rounded-lg border border-gray-700 bg-gray-800 p-2">
          <p className="text-xs text-gray-400">File Events Seen</p>
          <p className="mt-1 text-lg font-semibold text-white">
            {stats.filesMonitored.toLocaleString()}
          </p>
        </div>

        <div className="rounded-lg border border-gray-700 bg-gray-800 p-2 col-span-2">
          <p className="inline-flex items-center gap-1 text-xs text-gray-400">
            <Clock3 className="h-3.5 w-3.5" />
            Last Full Scan
          </p>
          <p className="mt-1 text-sm text-white">
            {new Date(stats.lastFullScan).toLocaleString()}
          </p>
        </div>

        <div className="rounded-lg border border-gray-700 bg-gray-800 p-2 col-span-2">
          <p className="inline-flex items-center gap-1 text-xs text-gray-400">
            <Activity className="h-3.5 w-3.5" />
            Uptime
          </p>
          <p className="mt-1 text-sm font-semibold text-green-300">{stats.uptime}</p>
        </div>
      </div>
    </section>
  );
}
