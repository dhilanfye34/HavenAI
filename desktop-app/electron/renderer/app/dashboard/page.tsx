'use client';

import { useEffect, useRef } from 'react';
import SharedDashboardPage from '../../../../../webapp/app/dashboard/page';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function DashboardPage() {
  const lastSyncKeyRef = useRef<string>('');

  useEffect(() => {
    const havenai = (window as any).havenai;

    const syncRuntime = async () => {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) return;

      const refreshToken = localStorage.getItem('refresh_token') || undefined;
      const userRaw = localStorage.getItem('user');
      const user = userRaw ? JSON.parse(userRaw) : undefined;

      if (havenai?.syncAgentAuth) {
        await havenai.syncAgentAuth({ accessToken, refreshToken, user });
      }

      const response = await fetch(`${API_URL}/setup/preferences`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) return;

      const prefs = await response.json();
      const payload = {
        file_monitoring_enabled: Boolean(prefs.file_monitoring_enabled),
        process_monitoring_enabled: Boolean(prefs.process_monitoring_enabled),
        network_monitoring_enabled: Boolean(prefs.network_monitoring_enabled),
      };

      const syncKey = JSON.stringify(payload);
      if (syncKey === lastSyncKeyRef.current) return;
      lastSyncKeyRef.current = syncKey;

      if (havenai?.updateAgentPreferences) {
        await havenai.updateAgentPreferences(payload);
      }
    };

    syncRuntime().catch(() => undefined);
    const timer = window.setInterval(() => {
      syncRuntime().catch(() => undefined);
    }, 5000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return <SharedDashboardPage />;
}
