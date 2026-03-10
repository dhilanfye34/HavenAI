import { useCallback, useEffect, useState } from 'react';

import {
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
      setPreferences({
        ...nextPrefs,
        desktop_available:
          nextProtection.has_devices || nextProtection.protection_active,
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

  const save = useCallback(
    async (payload: SetupPreferencesUpdate) => {
      if (!token) {
        setSaveError('Missing auth token.');
        return;
      }
      setSaving(true);
      setSaveError(null);
      setSaveSuccess(null);
      try {
        const nextPrefs = await updateSetupPreferences(token, payload);
        setPreferences(nextPrefs);
        setSaveSuccess('Saved.');
      } catch (saveErr) {
        setSaveError(saveErr instanceof Error ? saveErr.message : 'Save failed.');
      } finally {
        setSaving(false);
      }
    },
    [token],
  );

  return {
    preferences,
    protectionStatus,
    loading,
    saving,
    error,
    saveError,
    saveSuccess,
    refresh,
    save,
  };
}
