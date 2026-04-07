'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';

export type SafelistCategory = 'processes' | 'hosts' | 'files' | 'emails' | 'alerts';

const STORAGE_KEY = 'haven-safelist';
const MAX_PER_CATEGORY = 500;

type SafelistData = Record<SafelistCategory, string[]>;

const EMPTY_SAFELIST: SafelistData = { processes: [], hosts: [], files: [], emails: [], alerts: [] };

function readSafelist(): SafelistData {
  if (typeof window === 'undefined') return EMPTY_SAFELIST;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return EMPTY_SAFELIST;
}

function persistSafelist(data: SafelistData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* ignore in SSR or if storage is full */ }
}

export interface SafelistState {
  isSafe: (category: SafelistCategory, id: string) => boolean;
  markSafe: (category: SafelistCategory, id: string) => void;
  unmarkSafe: (category: SafelistCategory, id: string) => void;
  getSafeList: (category: SafelistCategory) => string[];
}

export function useSafelist(): SafelistState {
  // Start with empty to avoid SSR/hydration mismatch, load on mount
  const [data, setData] = useState<SafelistData>(EMPTY_SAFELIST);

  // Load from localStorage on mount (client-only)
  useEffect(() => {
    setData(readSafelist());
  }, []);

  // Sync across tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setData(readSafelist());
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const isSafe = useCallback(
    (category: SafelistCategory, id: string) =>
      data[category].includes(id.toLowerCase()),
    [data],
  );

  const markSafe = useCallback((category: SafelistCategory, id: string) => {
    setData((prev) => {
      const normalized = id.toLowerCase();
      if (prev[category].includes(normalized)) return prev;
      const updated = {
        ...prev,
        [category]: [...prev[category], normalized].slice(-MAX_PER_CATEGORY),
      };
      persistSafelist(updated);
      return updated;
    });
  }, []);

  const unmarkSafe = useCallback((category: SafelistCategory, id: string) => {
    setData((prev) => {
      const normalized = id.toLowerCase();
      const updated = {
        ...prev,
        [category]: prev[category].filter((x) => x !== normalized),
      };
      persistSafelist(updated);
      return updated;
    });
  }, []);

  const getSafeList = useCallback(
    (category: SafelistCategory) => data[category],
    [data],
  );

  return useMemo(
    () => ({ isSafe, markSafe, unmarkSafe, getSafeList }),
    [isSafe, markSafe, unmarkSafe, getSafeList],
  );
}
