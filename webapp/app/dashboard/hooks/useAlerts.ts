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
  return {
    id: String(alert?.timestamp || Date.now()),
    severity: mapSeverity(alert?.severity),
    timestamp: new Date((alert?.timestamp || Date.now()) * 1000).toISOString(),
    source: alert?.agent || alert?.type || 'Desktop Agent',
    description: alert?.title || alert?.description || 'Security event detected.',
    details:
      alert?.details?.recommendation ||
      alert?.description ||
      'Review this event in the command center.',
  };
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<SecurityAlert[]>(initialMockAlerts);
  const [latestAlertId, setLatestAlertId] = useState<string | null>(null);

  useEffect(() => {
    const havenai = (window as any).havenai;
    if (havenai?.onNewAlert) {
      // Desktop runtime mode: consume real alerts from Python bridge.
      setAlerts([]);
      havenai.onNewAlert((rawAlert: any) => {
        const next = toSecurityAlert(rawAlert);
        setAlerts((current) => [next, ...current].slice(0, 50));
        setLatestAlertId(next.id);
      });
      return () => {
        havenai.removeAllListeners?.('new-alert');
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
