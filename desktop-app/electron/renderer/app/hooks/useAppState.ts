'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Root state machine for the HavenAI desktop app. See
 * /Users/dhilanfye/.claude/plans/warm-dancing-engelbart.md for the transition
 * table. Every screen in the renderer is a projection of this single state.
 */

export type AppState =
  | 'booting'
  | 'login'
  | 'login-device-conflict'
  | 'onboarding'
  | 'setup'
  | 'dashboard'
  | 'offline-authenticated';

export interface AppUser {
  id: string;
  email: string;
  full_name?: string;
  [k: string]: any;
}

export interface AppStateValue {
  state: AppState;
  user: AppUser | null;
  deviceConflictMessage: string | null;
  isOffline: boolean;
  // Action dispatchers — the renderer uses these to move between states.
  onLoginSuccess: () => void;
  onOnboardingComplete: () => void;
  onSetupFinished: () => void;
  onSetupSkipped: () => void;
  onLogout: () => void;
  replayOnboarding: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type Flags = {
  onboardedUsers: string[];
  setupCompleted: boolean;
  setupSkipped: boolean;
};

// Mirror authoritative electron-store credentials into localStorage so the
// shared webapp dashboard code (which reads localStorage directly) keeps
// working. electron-store is the only place we WRITE to; localStorage is a
// read-through cache that gets re-hydrated on every boot + token refresh.
function mirrorCredsToLocalStorage(creds: {
  accessToken?: string | null;
  refreshToken?: string | null;
  user?: any;
}): void {
  try {
    if (creds?.accessToken) localStorage.setItem('access_token', creds.accessToken);
    else localStorage.removeItem('access_token');
    if (creds?.refreshToken) localStorage.setItem('refresh_token', creds.refreshToken);
    else localStorage.removeItem('refresh_token');
    if (creds?.user) localStorage.setItem('user', JSON.stringify(creds.user));
    else localStorage.removeItem('user');
  } catch {
    /* ignore quota/serialization errors */
  }
}

// One-time migration: legacy pre-0.1.3 installs had tokens in localStorage
// only. Fold them into electron-store, then keep the localStorage mirror up
// to date from there.
async function migrateLegacyLocalStorage(): Promise<void> {
  const havenai = (window as any).havenai;
  if (!havenai?.getCredentials || !havenai?.saveCredentials) return;
  try {
    const existing = await havenai.getCredentials();
    if (existing?.accessToken) return; // already migrated
    const accessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    const userStr = localStorage.getItem('user');
    if (!accessToken) return;
    const user = userStr
      ? (() => { try { return JSON.parse(userStr); } catch { return null; } })()
      : null;
    await havenai.saveCredentials({ accessToken, refreshToken, user });
  } catch {
    /* best-effort migration */
  }
}

async function fetchMe(accessToken: string): Promise<{ ok: true; user: AppUser } | { ok: false; status: number | 'network' }> {
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 4_000);
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    });
    clearTimeout(tid);
    if (res.ok) {
      const user = (await res.json()) as AppUser;
      return { ok: true, user };
    }
    return { ok: false, status: res.status };
  } catch {
    return { ok: false, status: 'network' };
  }
}

async function tryRefresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.access_token) return null;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
    };
  } catch {
    return null;
  }
}

export function useAppState(): AppStateValue {
  const [state, setState] = useState<AppState>('booting');
  const [user, setUser] = useState<AppUser | null>(null);
  const [deviceConflictMessage, setDeviceConflictMessage] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const flagsRef = useRef<Flags>({ onboardedUsers: [], setupCompleted: false, setupSkipped: false });
  const bootingRef = useRef(false);

  const loadFlags = useCallback(async (): Promise<Flags> => {
    const havenai = (window as any).havenai;
    const flags = await havenai?.getAppFlags?.();
    const resolved: Flags = {
      onboardedUsers: Array.isArray(flags?.onboardedUsers) ? flags.onboardedUsers : [],
      setupCompleted: Boolean(flags?.setupCompleted),
      setupSkipped: Boolean(flags?.setupSkipped),
    };
    flagsRef.current = resolved;
    return resolved;
  }, []);

  const resolveState = useCallback(
    (u: AppUser | null, flags: Flags, { offline }: { offline: boolean }): AppState => {
      if (!u) return 'login';
      if (offline) return 'offline-authenticated';
      if (!flags.onboardedUsers.includes(u.id)) return 'onboarding';
      if (!flags.setupCompleted && !flags.setupSkipped) return 'setup';
      return 'dashboard';
    },
    [],
  );

  const boot = useCallback(async () => {
    if (bootingRef.current) return;
    bootingRef.current = true;
    try {
      setState('booting');
      setIsOffline(false);
      await migrateLegacyLocalStorage();
      const havenai = (window as any).havenai;
      const creds = (await havenai?.getCredentials?.()) ?? {};
      const flags = await loadFlags();

      if (!creds.accessToken) {
        setUser(null);
        mirrorCredsToLocalStorage({});
        setState('login');
        return;
      }

      // Mirror immediately so any code reading localStorage mid-boot sees
      // at least the cached token.
      mirrorCredsToLocalStorage(creds);

      let me = await fetchMe(creds.accessToken);
      if (!me.ok && me.status === 401 && creds.refreshToken) {
        const refreshed = await tryRefresh(creds.refreshToken);
        if (refreshed) {
          await havenai?.saveCredentials?.({
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken,
            user: creds.user,
            deviceId: creds.deviceId,
          });
          me = await fetchMe(refreshed.accessToken);
        }
      }

      if (me.ok) {
        setUser(me.user);
        // Keep the cached user fresh for offline reboots. Re-read from store
        // because we may have just refreshed the access token.
        const fresh = await havenai?.getCredentials?.();
        await havenai?.saveCredentials?.({
          accessToken: fresh?.accessToken,
          refreshToken: fresh?.refreshToken,
          user: me.user,
          deviceId: creds.deviceId,
        });
        mirrorCredsToLocalStorage({
          accessToken: fresh?.accessToken,
          refreshToken: fresh?.refreshToken,
          user: me.user,
        });
        setState(resolveState(me.user, flags, { offline: false }));
        return;
      }

      if (me.status === 'network') {
        // Offline — fall back to cached user if we have one.
        if (creds.user?.id) {
          setUser(creds.user);
          mirrorCredsToLocalStorage(creds);
          setIsOffline(true);
          setState('offline-authenticated');
          return;
        }
        setUser(null);
        mirrorCredsToLocalStorage({});
        setState('login');
        return;
      }

      // 401/403 after refresh attempt — wipe tokens, force login.
      await havenai?.clearCredentials?.();
      mirrorCredsToLocalStorage({});
      setUser(null);
      setState('login');
    } finally {
      bootingRef.current = false;
    }
  }, [loadFlags, resolveState]);

  // Initial boot.
  useEffect(() => {
    void boot();
  }, [boot]);

  // Listen for device-linked-error at any time.
  useEffect(() => {
    const havenai = (window as any).havenai;
    if (!havenai?.onDeviceLinkedError) return;
    havenai.onDeviceLinkedError(async (message: string) => {
      setDeviceConflictMessage(message || 'This device is linked to another account.');
      await havenai?.clearCredentials?.();
      mirrorCredsToLocalStorage({});
      setUser(null);
      setState('login-device-conflict');
    });
    return () => {
      havenai?.removeAllListeners?.('device-linked-error');
    };
  }, []);

  // Listen for device-unlinked (forces fresh login).
  useEffect(() => {
    const havenai = (window as any).havenai;
    if (!havenai?.onDeviceUnlinked) return;
    havenai.onDeviceUnlinked(async () => {
      await havenai?.clearCredentials?.();
      mirrorCredsToLocalStorage({});
      // Also drop any renderer-side email connection cache so the new
      // account that logs in next doesn't inherit stale email state.
      try {
        localStorage.removeItem('haven-email-connection');
      } catch {
        /* ignore */
      }
      setUser(null);
      setState('login');
    });
    return () => {
      havenai?.removeAllListeners?.('device-unlinked');
    };
  }, []);

  // Replay-onboarding event from Settings button.
  useEffect(() => {
    const handler = () => {
      setState((prev) => (prev === 'dashboard' ? 'onboarding' : prev));
    };
    window.addEventListener('havenai-replay-onboarding', handler);
    return () => window.removeEventListener('havenai-replay-onboarding', handler);
  }, []);

  // Logout dispatched from the shared DashboardContext — desktop runtime
  // can't use window.location.href because the state machine owns the
  // renderer, so it fires this event instead.
  useEffect(() => {
    const handler = async () => {
      const havenai = (window as any).havenai;
      await havenai?.clearCredentials?.();
      mirrorCredsToLocalStorage({});
      try {
        localStorage.removeItem('haven-email-connection');
      } catch {
        /* ignore */
      }
      setUser(null);
      setDeviceConflictMessage(null);
      setState('login');
    };
    window.addEventListener('havenai-logout', handler);
    return () => window.removeEventListener('havenai-logout', handler);
  }, []);

  // Resume setup from the dashboard nag banner.
  useEffect(() => {
    const handler = async () => {
      // Clear the skipped flag so completion is once again meaningful.
      const havenai = (window as any).havenai;
      await havenai?.setAppFlags?.({ setupSkipped: false });
      flagsRef.current = { ...flagsRef.current, setupSkipped: false };
      setState((prev) => (prev === 'dashboard' ? 'setup' : prev));
    };
    window.addEventListener('havenai-resume-setup', handler);
    return () => window.removeEventListener('havenai-resume-setup', handler);
  }, []);

  // Re-boot when network returns after offline state.
  useEffect(() => {
    const online = () => {
      if (state === 'offline-authenticated') void boot();
    };
    window.addEventListener('online', online);
    return () => window.removeEventListener('online', online);
  }, [state, boot]);

  const onLoginSuccess = useCallback(() => {
    setDeviceConflictMessage(null);
    void boot();
  }, [boot]);

  const onOnboardingComplete = useCallback(async () => {
    if (!user) return;
    const havenai = (window as any).havenai;
    const next = Array.from(new Set([...(flagsRef.current.onboardedUsers || []), user.id]));
    await havenai?.setAppFlags?.({ onboardedUsers: next });
    flagsRef.current = { ...flagsRef.current, onboardedUsers: next };
    setState(resolveState(user, flagsRef.current, { offline: isOffline }));
  }, [user, resolveState, isOffline]);

  const onSetupFinished = useCallback(async () => {
    const havenai = (window as any).havenai;
    await havenai?.setAppFlags?.({ setupCompleted: true, setupSkipped: false });
    flagsRef.current = { ...flagsRef.current, setupCompleted: true, setupSkipped: false };
    setState('dashboard');
  }, []);

  const onSetupSkipped = useCallback(async () => {
    const havenai = (window as any).havenai;
    await havenai?.setAppFlags?.({ setupSkipped: true });
    flagsRef.current = { ...flagsRef.current, setupSkipped: true };
    setState('dashboard');
  }, []);

  const onLogout = useCallback(async () => {
    const havenai = (window as any).havenai;
    await havenai?.logoutAgent?.();
    await havenai?.clearCredentials?.();
    mirrorCredsToLocalStorage({});
    setUser(null);
    setDeviceConflictMessage(null);
    setState('login');
  }, []);

  const replayOnboarding = useCallback(() => {
    setState('onboarding');
  }, []);

  return {
    state,
    user,
    deviceConflictMessage,
    isOffline,
    onLoginSuccess,
    onOnboardingComplete,
    onSetupFinished,
    onSetupSkipped,
    onLogout,
    replayOnboarding,
  };
}
