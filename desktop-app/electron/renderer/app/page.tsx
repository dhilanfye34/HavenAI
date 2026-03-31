'use client';

import { useEffect, useState } from 'react';

import LoginPage from './login/page';
import DashboardPage from './dashboard/page';

export default function HomePage() {
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  useEffect(() => {
    const updateAuthState = () => {
      setHasToken(Boolean(localStorage.getItem('access_token')));
    };

    updateAuthState();

    const timer = window.setInterval(updateAuthState, 1000);
    window.addEventListener('storage', updateAuthState);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('storage', updateAuthState);
    };
  }, []);

  if (hasToken === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-haven-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <p className="text-sm text-haven-text-tertiary">Loading...</p>
        </div>
      </div>
    );
  }

  return hasToken ? <DashboardPage /> : <LoginPage />;
}
