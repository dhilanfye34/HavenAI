'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './components/Sidebar';
import { FloatingAssistant } from './components/FloatingAssistant';
import { DashboardProvider } from './context/DashboardContext';
import { NavigationProvider } from './context/NavigationContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user');

    if (!storedToken || !userData) {
      router.push('/login');
      return;
    }
    setToken(storedToken);

    // Redirect to onboarding if first time
    const onboarded = localStorage.getItem('haven-onboarded');
    if (!onboarded) {
      router.push('/onboarding');
      return;
    }

    // Apply saved theme preference
    const theme = localStorage.getItem('haven-theme');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    setIsReady(true);
  }, [router]);

  const navigate = useCallback((path: string) => {
    router.push(path);
  }, [router]);

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-haven-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <p className="text-sm text-haven-text-tertiary">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardProvider token={token}>
      <NavigationProvider navigate={navigate}>
        <div className="min-h-screen bg-haven-bg">
          <Sidebar />
          <main className="lg:pl-60">
            <div className="mx-auto max-w-5xl px-4 py-6 pb-24 lg:px-8 lg:py-8 lg:pb-8">
              {children}
            </div>
          </main>
          <FloatingAssistant />
        </div>
      </NavigationProvider>
    </DashboardProvider>
  );
}
