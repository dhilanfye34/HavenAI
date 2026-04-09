import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AgentRuntimeStatus, ProtectionStatus } from '../types';
import { getProtectionStatus, listDevices, DeviceInfo } from '../services/setupApi';

export type ConnectionState =
  | 'connected'   // agent heartbeating / desktop runtime live
  | 'stale'       // was connected but heartbeat is old
  | 'disconnected'// has a linked device, but it's offline
  | 'no-device'   // no linked device at all
  | 'checking';   // initial load

export interface ConnectionStatus {
  state: ConnectionState;
  lastSeen: string | null;
  deviceCount: number;
  onlineCount: number;
  deviceName: string | null;
  isDesktopRuntime: boolean;
  label: string;
  detail: string;
  recheck: () => void;
}

// Agent heartbeats every 60s; backend marks devices offline after 3 min.
// Match the backend threshold so the webapp and server agree.
const DESKTOP_STALE_MS = 180_000;
// Poll /devices/status at half the backend threshold so we catch drops fast
// without hammering the API.
const BROWSER_POLL_MS = 30_000;
// Desktop runtime: re-ping the agent at the heartbeat cadence
const DESKTOP_POLL_MS = 60_000;

interface Options {
  token: string | null;
  runtimeStatus: AgentRuntimeStatus | null;
  // Initial protectionStatus from useSetupPreferences — used only until the
  // hook's own poll returns. After that, the hook's local copy wins.
  protectionStatus: ProtectionStatus | null;
}

export function useConnectionStatus({
  token,
  runtimeStatus,
  protectionStatus: initialProtectionStatus,
}: Options): ConnectionStatus {
  const [isDesktopRuntime, setIsDesktopRuntime] = useState(false);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [protectionStatus, setProtectionStatus] = useState<ProtectionStatus | null>(
    initialProtectionStatus,
  );
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [hasChecked, setHasChecked] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setIsDesktopRuntime(Boolean((window as any).havenai));
  }, []);

  // Accept initial value from props once, then own it locally
  useEffect(() => {
    if (!protectionStatus && initialProtectionStatus) {
      setProtectionStatus(initialProtectionStatus);
    }
  }, [initialProtectionStatus, protectionStatus]);

  // Tick every 10s so stale detection stays live even without new data
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 10_000);
    return () => clearInterval(id);
  }, []);

  // Fetch both /devices/status and /devices — status is the authoritative
  // summary for "how many online", and the devices list gives us names/last-seen.
  const fetchConnection = useCallback(async () => {
    if (!token) return;
    try {
      const [status, list] = await Promise.all([
        getProtectionStatus(token).catch(() => null),
        listDevices(token).catch(() => null),
      ]);
      if (status) setProtectionStatus(status);
      if (list) setDevices(list);
    } finally {
      setHasChecked(true);
    }
  }, [token]);

  // Initial + polling loop
  useEffect(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    if (isDesktopRuntime) {
      const havenai = (window as any).havenai;
      const ping = () => havenai?.sendToAgent?.({ type: 'get_status' });
      ping();
      setHasChecked(true);
      pollingRef.current = setInterval(ping, DESKTOP_POLL_MS);
      // Still fetch the devices list once so we know the name
      fetchConnection();
    } else if (token) {
      fetchConnection();
      pollingRef.current = setInterval(fetchConnection, BROWSER_POLL_MS);
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [isDesktopRuntime, token, fetchConnection]);

  // Revalidate immediately when the tab regains focus
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      setNowTick(Date.now());
      if (isDesktopRuntime) {
        (window as any).havenai?.sendToAgent?.({ type: 'get_status' });
      } else if (token) {
        fetchConnection();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [isDesktopRuntime, token, fetchConnection]);

  const recheck = useCallback(() => {
    setNowTick(Date.now());
    if (isDesktopRuntime) {
      (window as any).havenai?.sendToAgent?.({ type: 'get_status' });
    } else {
      fetchConnection();
    }
  }, [isDesktopRuntime, fetchConnection]);

  return useMemo<ConnectionStatus>(() => {
    // ── Desktop runtime path ──
    if (isDesktopRuntime) {
      const lastSeen = runtimeStatus?.last_heartbeat_at || null;
      const lastSeenMs = lastSeen ? new Date(lastSeen).getTime() : null;
      const ageMs = lastSeenMs ? nowTick - lastSeenMs : null;
      const hasRuntime = Boolean(runtimeStatus);

      let state: ConnectionState;
      if (!hasRuntime) {
        state = 'checking';
      } else if (ageMs !== null && ageMs > DESKTOP_STALE_MS) {
        state = 'stale';
      } else {
        state = 'connected';
      }

      const deviceName = devices[0]?.name || 'This device';
      const label =
        state === 'connected'
          ? `Live · ${deviceName}`
          : state === 'stale'
          ? `Reconnecting · ${deviceName}`
          : 'Checking agent…';
      const detail =
        state === 'connected'
          ? 'Your device is being monitored in real time.'
          : state === 'stale'
          ? 'The desktop agent stopped heartbeating. Trying to reconnect.'
          : 'Waiting for the desktop agent to respond.';

      return {
        state,
        lastSeen,
        deviceCount: devices.length || 1,
        onlineCount: state === 'connected' ? 1 : 0,
        deviceName,
        isDesktopRuntime: true,
        label,
        detail,
        recheck,
      };
    }

    // ── Browser runtime path ──
    if (!hasChecked && !protectionStatus) {
      return {
        state: 'checking',
        lastSeen: null,
        deviceCount: 0,
        onlineCount: 0,
        deviceName: null,
        isDesktopRuntime: false,
        label: 'Checking connection…',
        detail: 'Looking for a linked HavenAI desktop app.',
        recheck,
      };
    }

    const deviceCount = protectionStatus?.total_devices ?? devices.length;
    const onlineCount =
      protectionStatus?.online_devices ?? devices.filter((d) => d.is_online).length;
    const hasDevices = protectionStatus?.has_devices ?? deviceCount > 0;

    // Prefer a known online device for lastSeen/name
    const onlineDevice = devices.find((d) => d.is_online);
    const anyDevice = onlineDevice || devices[0] || null;
    const lastSeen = anyDevice?.last_seen || null;
    const deviceName = anyDevice?.name || null;

    let state: ConnectionState;
    if (!hasDevices) state = 'no-device';
    else if (onlineCount > 0) state = 'connected';
    else state = 'disconnected';

    const label =
      state === 'connected'
        ? `Live · ${deviceName || 'Linked device'}`
        : state === 'disconnected'
        ? `Offline · ${deviceName || 'Linked device'}`
        : 'No device linked';
    const detail =
      state === 'connected'
        ? `${onlineCount} of ${deviceCount} device${deviceCount === 1 ? '' : 's'} reporting in real time.`
        : state === 'disconnected'
        ? 'Your linked device hasn\u2019t checked in recently. Open the desktop app to resume monitoring.'
        : 'Install and sign into the HavenAI desktop app to start monitoring this computer.';

    return {
      state,
      lastSeen,
      deviceCount,
      onlineCount,
      deviceName,
      isDesktopRuntime: false,
      label,
      detail,
      recheck,
    };
  }, [isDesktopRuntime, runtimeStatus, protectionStatus, devices, nowTick, hasChecked, recheck]);
}
