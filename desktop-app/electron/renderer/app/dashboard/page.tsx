'use client';

import { useEffect } from 'react';
import SharedDashboardPage from '../../../../../webapp/app/dashboard/page';

export default function DashboardPage() {
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

      // Request fresh runtime status from the local desktop agent.
      havenai?.sendToAgent?.({ type: 'get_status' });
    };

    syncRuntime().catch(() => undefined);
    const timer = window.setInterval(() => {
      syncRuntime().catch(() => undefined);
    }, 2000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return <SharedDashboardPage />;
}
