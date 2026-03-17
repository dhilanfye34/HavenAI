'use client';

import { useEffect, useRef } from 'react';
import SharedLoginPage from '../../../../../webapp/app/login/page';

export default function LoginPage() {
  const lastTokenRef = useRef<string | null>(null);

  useEffect(() => {
    const havenai = (window as any).havenai;

    const syncAuth = async () => {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken || accessToken === lastTokenRef.current) {
        return;
      }

      lastTokenRef.current = accessToken;
      const refreshToken = localStorage.getItem('refresh_token') || undefined;
      const userRaw = localStorage.getItem('user');
      const user = userRaw ? JSON.parse(userRaw) : undefined;

      if (havenai?.saveCredentials) {
        await havenai.saveCredentials({
          accessToken,
          refreshToken,
          user,
        });
      }
      if (havenai?.syncAgentAuth) {
        await havenai.syncAgentAuth({ accessToken, refreshToken, user });
      }
    };

    // Immediate run + lightweight polling to pick up login success.
    syncAuth().catch(() => undefined);
    const timer = window.setInterval(() => {
      syncAuth().catch(() => undefined);
    }, 1500);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return <SharedLoginPage />;
}
