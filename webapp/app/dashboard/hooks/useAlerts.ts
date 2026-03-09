import { useEffect, useMemo, useState } from 'react';

import { getNextMockAlert, initialMockAlerts } from '../services/mockAlerts';
import { SecurityAlert } from '../types';

export function useAlerts() {
  const [alerts, setAlerts] = useState<SecurityAlert[]>(initialMockAlerts);
  const [latestAlertId, setLatestAlertId] = useState<string | null>(null);

  useEffect(() => {
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
