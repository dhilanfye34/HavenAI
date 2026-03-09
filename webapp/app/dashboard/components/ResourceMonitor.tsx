import { SecurityStats } from '../types';

interface ResourceMonitorProps {
  stats: SecurityStats;
}

function UsageBar({ label, value }: { label: string; value: number }) {
  const color = value > 80 ? 'bg-red-500' : value > 65 ? 'bg-amber-500' : 'bg-cyan-400';

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-gray-300">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 rounded bg-gray-700">
        <div className={`h-2 rounded transition-all ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function ResourceMonitor({ stats }: ResourceMonitorProps) {
  return (
    <section className="rounded-2xl border border-gray-700 bg-gray-900/70 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
        Storage & Resources
      </h2>
      <div className="mt-3 space-y-3">
        <UsageBar label="Disk Usage" value={stats.diskUsage} />
        <UsageBar label="Memory Usage" value={stats.memoryUsage} />
        <UsageBar label="CPU Usage" value={stats.cpuUsage} />
        <UsageBar label="Log Storage" value={stats.logStorageUsage} />
      </div>
    </section>
  );
}
