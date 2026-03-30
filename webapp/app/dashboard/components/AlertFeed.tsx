import { useCallback, useMemo, useState } from 'react';
import { SecurityAlert } from '../types';
import { AlertItem } from './AlertItem';

interface AlertFeedProps {
  alerts: SecurityAlert[];
  latestAlertId: string | null;
  onSelectAlert: (alert: SecurityAlert) => void;
}

export function AlertFeed({ alerts, latestAlertId, onSelectAlert }: AlertFeedProps) {
  const [filter, setFilter] = useState<'priority' | 'all' | 'critical' | 'warning' | 'info'>('priority');
  const [injectedId, setInjectedId] = useState<string | null>(null);
  const filteredAlerts = useMemo(() => {
    if (filter === 'all') return alerts;
    if (filter === 'priority') return alerts.filter((alert) => alert.severity !== 'info');
    return alerts.filter((alert) => alert.severity === filter);
  }, [alerts, filter]);

  const handleSelect = useCallback((alert: SecurityAlert) => {
    onSelectAlert(alert);
    setInjectedId(alert.id);
    setTimeout(() => setInjectedId(null), 1500);
  }, [onSelectAlert]);

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Alert Feed
          </h2>
          <p className="mt-0.5 text-[11px] text-gray-600">Click any alert to inject context into chat.</p>
        </div>
        <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] text-gray-400">{filteredAlerts.length} shown</span>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-1">
        {(['priority', 'all', 'critical', 'warning', 'info'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFilter(option)}
            className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide transition-all duration-300 ${
              option === filter
                ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.1)]'
                : 'border-white/[0.06] bg-white/[0.02] text-gray-500 hover:text-gray-300'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      <div className="max-h-[240px] space-y-2 overflow-y-auto pr-1">
        {filteredAlerts.map((alert) => (
          <div key={alert.id} className="relative">
            <AlertItem alert={alert} isNewest={latestAlertId === alert.id} onSelect={handleSelect} />
            {injectedId === alert.id && (
              <div className="absolute inset-x-0 -bottom-1 flex justify-center">
                <span className="animate-fade-in rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-[10px] font-medium text-cyan-300 backdrop-blur">
                  Added to chat context
                </span>
              </div>
            )}
          </div>
        ))}
        {filteredAlerts.length === 0 && (
          <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-center text-xs text-gray-600">
            No alerts match this filter yet.
          </p>
        )}
      </div>
    </section>
  );
}
