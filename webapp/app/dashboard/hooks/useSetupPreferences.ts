import { useCallback, useEffect, useState } from 'react';

import {
  MonitorControlState,
  ProtectionStatus,
  SetupPreferences,
  SetupPreferencesUpdate,
} from '../types';
import {
  getProtectionStatus,
  getSetupPreferences,
  updateSetupPreferences,
} from '../services/setupApi';

interface UseSetupPreferencesResult {
  preferences: SetupPreferences | null;
  protectionStatus: ProtectionStatus | null;
  monitorControl: MonitorControlState | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  saveError: string | null;
  saveSuccess: string | null;
  refresh: () => Promise<void>;
  save: (payload: SetupPreferencesUpdate) => Promise<void>;
}

export function useSetupPreferences(token: string | null): UseSetupPreferencesResult {
  const [preferences, setPreferences] = useState<SetupPreferences | null>(null);
  const [protectionStatus, setProtectionStatus] = useState<ProtectionStatus | null>(null);
  const [monitorControl, setMonitorControl] = useState<MonitorControlState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setError('Missing auth token.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [nextPrefs, nextProtection] = await Promise.all([
        getSetupPreferences(token),
        getProtectionStatus(token),
      ]);
      const isDesktopRuntime = typeof window !== 'undefined' && Boolean((window as any).havenai);
      let localMonitorState: MonitorControlState | null = null;
      if (isDesktopRuntime) {
        localMonitorState = (await (window as any).havenai.getMonitorControlState?.()) || null;
        setMonitorControl(localMonitorState);
      }
      setPreferences({
        ...nextPrefs,
        file_monitoring_enabled:
          localMonitorState?.desired.file ?? nextPrefs.file_monitoring_enabled,
        process_monitoring_enabled:
          localMonitorState?.desired.process ?? nextPrefs.process_monitoring_enabled,
        network_monitoring_enabled:
          localMonitorState?.desired.network ?? nextPrefs.network_monitoring_enabled,
        desktop_available:
          isDesktopRuntime || nextProtection.has_devices || nextProtection.protection_active,
      });
      setProtectionStatus(nextProtection);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load setup.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const havenai = (window as any).havenai;
    if (!havenai?.onMonitorState) return;

    const onMonitorState = (state: MonitorControlState) => {
      setMonitorControl(state);
      setPreferences((current) =>
        current
          ? {
              ...current,
              file_monitoring_enabled: Boolean(state?.desired?.file),
              process_monitoring_enabled: Boolean(state?.desired?.process),
              network_monitoring_enabled: Boolean(state?.desired?.network),
              desktop_available: true,
            }
          : current,
      );
    };

    havenai.onMonitorState(onMonitorState);
    return () => {
      havenai.removeAllListeners?.('monitor-state');
    };
  }, []);

  const save = useCallback(
    async (payload: SetupPreferencesUpdate) => {
      if (!token) {
        setSaveError('Missing auth token.');
        return;
      }
      setSaving(true);
      setSaveError(null);
      setSaveSuccess(null);
      const isDesktopRuntime = typeof window !== 'undefined' && Boolean((window as any).havenai);
      const monitorPatch: SetupPreferencesUpdate = {};
      if (payload.file_monitoring_enabled !== undefined) {
        monitorPatch.file_monitoring_enabled = payload.file_monitoring_enabled;
      }
      if (payload.process_monitoring_enabled !== undefined) {
        monitorPatch.process_monitoring_enabled = payload.process_monitoring_enabled;
      }
      if (payload.network_monitoring_enabled !== undefined) {
        monitorPatch.network_monitoring_enabled = payload.network_monitoring_enabled;
      }

      const hasMonitorPatch = Object.keys(monitorPatch).length > 0;

      // In desktop runtime, apply strict monitor toggle flow through the local
      // permission-gated monitor state machine.
      if (isDesktopRuntime && hasMonitorPatch) {
        const havenai = (window as any).havenai;
        const entries = Object.entries(monitorPatch) as Array<[keyof SetupPreferencesUpdate, boolean]>;
        for (const [key, enabled] of entries) {
          if (key === 'file_monitoring_enabled') {
            await havenai?.setMonitorDesired?.({ module: 'file', enabled: Boolean(enabled) });
          } else if (key === 'process_monitoring_enabled') {
            await havenai?.setMonitorDesired?.({ module: 'process', enabled: Boolean(enabled) });
          } else if (key === 'network_monitoring_enabled') {
            await havenai?.setMonitorDesired?.({ module: 'network', enabled: Boolean(enabled) });
          }
        }
        const nextLocalState: MonitorControlState | null =
          (await havenai?.getMonitorControlState?.()) || null;
        if (nextLocalState) {
          setMonitorControl(nextLocalState);
          setPreferences((current) =>
            current
              ? {
                  ...current,
                  ...monitorPatch,
                  file_monitoring_enabled: nextLocalState.desired.file,
                  process_monitoring_enabled: nextLocalState.desired.process,
                  network_monitoring_enabled: nextLocalState.desired.network,
                  desktop_available: true,
                }
              : current,
          );
        }
      }

      try {
        const nextPrefs = await updateSetupPreferences(token, payload);
        if (isDesktopRuntime && hasMonitorPatch) {
          const nextLocalState: MonitorControlState | null =
            (await (window as any).havenai?.getMonitorControlState?.()) || null;
          if (nextLocalState) {
            setMonitorControl(nextLocalState);
            setPreferences((current) =>
              current
                ? {
                    ...nextPrefs,
                    file_monitoring_enabled: nextLocalState.desired.file,
                    process_monitoring_enabled: nextLocalState.desired.process,
                    network_monitoring_enabled: nextLocalState.desired.network,
                    desktop_available: true,
                  }
                : {
                    ...nextPrefs,
                    file_monitoring_enabled: nextLocalState.desired.file,
                    process_monitoring_enabled: nextLocalState.desired.process,
                    network_monitoring_enabled: nextLocalState.desired.network,
                    desktop_available: true,
                  },
            );
          } else {
            setPreferences(nextPrefs);
          }
        } else {
          setPreferences(nextPrefs);
        }
        setSaveSuccess('Saved.');
      } catch (saveErr) {
        const message = saveErr instanceof Error ? saveErr.message : 'Save failed.';

        // Backend may still enforce desktop-link gating; keep desktop local toggles usable.
        if (
          isDesktopRuntime &&
          hasMonitorPatch &&
          message.toLowerCase().includes('desktop app must be installed and linked')
        ) {
          setSaveSuccess('Applied locally on this desktop. Cloud preference sync will update after device linking.');
          setSaveError(null);
        } else {
          setSaveError(message);
        }
      } finally {
        setSaving(false);
      }
    },
    [token],
  );

  return {
    preferences,
    protectionStatus,
    monitorControl,
    loading,
    saving,
    error,
    saveError,
    saveSuccess,
    refresh,
    save,
  };
}
