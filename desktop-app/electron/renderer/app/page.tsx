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

    // storage event does not fire in the same window for local updates,
    // so keep a lightweight poll for desktop route swaps.
    const timer = window.setInterval(updateAuthState, 1000);
    window.addEventListener('storage', updateAuthState);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('storage', updateAuthState);
    };
  }, []);

  if (hasToken === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-300">
        Loading...
      </div>
    );
  }

  return hasToken ? <DashboardPage /> : <LoginPage />;
}