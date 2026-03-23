import { SecurityStats } from '../types';

interface ResourceMonitorProps {
  stats: SecurityStats;
}

function UsageBar({ label, value }: { label: string; value: number }) {
  const gradient = value > 80
    ? 'from-red-500 to-amber-500'
    : value > 65
    ? 'from-amber-500 to-yellow-500'
    : 'from-cyan-400 to-blue-500';

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className={value > 80 ? 'text-red-400' : value > 65 ? 'text-amber-400' : 'text-gray-400'}>{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06]">
        <div className={`h-1.5 rounded-full bg-gradient-to-r ${gradient} transition-all duration-700`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function ResourceMonitor({ stats }: ResourceMonitorProps) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
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
