import { useMemo, useState } from 'react';

import { SecurityAlert } from '../types';
import { AlertItem } from './AlertItem';

interface AlertFeedProps {
  alerts: SecurityAlert[];
  latestAlertId: string | null;
  onSelectAlert: (alert: SecurityAlert) => void;
}

export function AlertFeed({ alerts, latestAlertId, onSelectAlert }: AlertFeedProps) {
  const [filter, setFilter] = useState<'priority' | 'all' | 'critical' | 'warning' | 'info'>('priority');
  const filteredAlerts = useMemo(() => {
    if (filter === 'all') return alerts;
    if (filter === 'priority') return alerts.filter((alert) => alert.severity !== 'info');
    return alerts.filter((alert) => alert.severity === filter);
  }, [alerts, filter]);

  return (
    <section className="rounded-2xl border border-gray-700 bg-gray-900/70 p-3">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
            Alert Feed
          </h2>
          <p className="text-xs text-gray-500">Click any alert to inject context into chat.</p>
        </div>
        <span className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-300">{filteredAlerts.length} shown</span>
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-1">
        {(['priority', 'all', 'critical', 'warning', 'info'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFilter(option)}
            className={`rounded border px-2 py-1 text-[11px] uppercase tracking-wide ${
              option === filter
                ? 'border-cyan-400/70 bg-cyan-500/10 text-cyan-200'
                : 'border-gray-700 bg-gray-800 text-gray-400 hover:text-gray-200'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      <div className="max-h-[240px] space-y-2 overflow-y-auto pr-1">
        {filteredAlerts.map((alert) => (
          <AlertItem key={alert.id} alert={alert} isNewest={latestAlertId === alert.id} onSelect={onSelectAlert} />
        ))}
        {filteredAlerts.length === 0 && (
          <p className="rounded border border-gray-700 bg-gray-800/50 p-2 text-xs text-gray-500">
            No alerts match this filter yet.
          </p>
        )}
      </div>
    </section>
  );
}
