'use client';

import { createContext, useContext, ReactNode } from 'react';

export type NavigateFn = (path: string) => void;

const NavigationContext = createContext<NavigateFn | null>(null);

export function useNavigate(): NavigateFn {
  const nav = useContext(NavigationContext);
  if (!nav) {
    // Fallback: use window.location for environments without the provider
    return (path: string) => { window.location.href = path; };
  }
  return nav;
}

export function NavigationProvider({
  navigate,
  children,
}: {
  navigate: NavigateFn;
  children: ReactNode;
}) {
  return (
    <NavigationContext.Provider value={navigate}>
      {children}
    </NavigationContext.Provider>
  );
}
