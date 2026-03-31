import { useEffect, useMemo, useState } from 'react';

import { getNextMockAlert, initialMockAlerts } from '../services/mockAlerts';
import { SecurityAlert } from '../types';

function mapSeverity(level?: string): SecurityAlert['severity'] {
  const normalized = (level || '').toLowerCase();
  if (normalized === 'critical' || normalized === 'high') return 'critical';
  if (normalized === 'medium' || normalized === 'warning') return 'warning';
  return 'info';
}

function toSecurityAlert(alert: any): SecurityAlert {
  // Use the DB id if present, otherwise fall back to timestamp + random suffix for uniqueness.
  const ts = alert?.timestamp || alert?.created_at || Date.now() / 1000;
  const id = alert?.id || `${ts}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id: String(id),
    severity: mapSeverity(alert?.severity),
    timestamp: new Date(ts * 1000).toISOString(),
    source: alert?.agent || alert?.type || 'Desktop Agent',
    description: alert?.title || alert?.description || 'Security event detected.',
    details:
      alert?.details?.recommendation ||
      alert?.description ||
      'Review this event for more details.',
  };
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<SecurityAlert[]>(initialMockAlerts);
  const [latestAlertId, setLatestAlertId] = useState<string | null>(null);

  useEffect(() => {
    const havenai = (window as any).havenai;
    if (havenai?.onNewAlert) {
      setAlerts([]);

      havenai.onNewAlert((rawAlert: any) => {
        const next = toSecurityAlert(rawAlert);
        setAlerts((current) => [next, ...current].slice(0, 100));
        setLatestAlertId(next.id);
      });

      if (havenai.queryLocalAlerts && havenai.onLocalAlerts) {
        havenai.onLocalAlerts((data: any) => {
          if (Array.isArray(data)) {
            const historical = data.map(toSecurityAlert);
            setAlerts((current) => {
              const existingIds = new Set(current.map((a) => a.id));
              const unique = historical.filter((a) => !existingIds.has(a.id));
              // Merge and sort newest-first so the feed is always chronological.
              return [...current, ...unique]
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 100);
            });
          }
        });
        const sevenDaysAgo = Date.now() / 1000 - 7 * 86400;
        havenai.queryLocalAlerts({ since: sevenDaysAgo, limit: 50 });
      }

      return () => {
        havenai.removeAllListeners?.('new-alert');
        havenai.removeAllListeners?.('local-alerts');
      };
    }

    const interval = setInterval(() => {
      const next = getNextMockAlert();
      setAlerts((current) => [next, ...current].slice(0, 20));
      setLatestAlertId(next.id);
    }, 45_000);

    return () => clearInterval(interval);
  }, []);

  const counts = useMemo(
    () => ({
      critical: alerts.filter((a) => a.severity === 'critical').length,
      warning: alerts.filter((a) => a.severity === 'warning').length,
      info: alerts.filter((a) => a.severity === 'info').length,
    }),
    [alerts],
  );

  return { alerts, counts, latestAlertId };
}
