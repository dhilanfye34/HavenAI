import { SecurityAlert } from '../types';
import { AlertItem } from './AlertItem';

interface AlertFeedProps {
  alerts: SecurityAlert[];
  latestAlertId: string | null;
  onSelectAlert: (alert: SecurityAlert) => void;
}

export function AlertFeed({ alerts, latestAlertId, onSelectAlert }: AlertFeedProps) {
  return (
    <section className="mt-4 rounded-2xl border border-gray-700 bg-gray-900/70 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
            Alert Feed
          </h2>
          <p className="text-xs text-gray-500">Click any alert to inject context into chat.</p>
        </div>
        <span className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-300">
          {alerts.length} events
        </span>
      </div>
      <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
        {alerts.map((alert) => (
          <AlertItem
            key={alert.id}
            alert={alert}
            isNewest={latestAlertId === alert.id}
            onSelect={onSelectAlert}
          />
        ))}
      </div>
    </section>
  );
}
