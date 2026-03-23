import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Activity, Lock, Save } from 'lucide-react';

import {
  MonitorControlState,
  MonitorLifecycleState,
  AgentRuntimeStatus,
  SecurityAlert,
  SetupPreferences,
  SetupPreferencesUpdate,
} from '../types';

interface SetupPanelProps {
  preferences: SetupPreferences | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  saveError: string | null;
  saveSuccess: string | null;
  recentAlerts: SecurityAlert[];
  runtimeStatus?: AgentRuntimeStatus | null;
  monitorControl?: MonitorControlState | null;
  onSave: (payload: SetupPreferencesUpdate) => Promise<void>;
  isDesktopRuntime?: boolean;
}

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  locked?: boolean;
  status?: MonitorLifecycleState;
  blockers?: string[];
  onToggle: (checked: boolean) => void;
  onViewDetails?: () => void;
}

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  locked,
  status,
  blockers,
  onToggle,
  onViewDetails,
}: ToggleRowProps) {
  const statusTone =
    status === 'running'
      ? 'text-green-300'
      : status === 'blocked'
      ? 'text-red-300'
      : status === 'pending_permission'
      ? 'text-amber-300'
      : 'text-gray-400';
  const statusLabel =
    status === 'running'
      ? 'Running'
      : status === 'blocked'
      ? 'Blocked'
      : status === 'pending_permission'
      ? 'Waiting permission'
      : 'Off';

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/70 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-gray-100">{label}</p>
          <p className="text-xs text-gray-400">{description}</p>
          {!!status && <p className={`mt-1 text-xs font-medium ${statusTone}`}>Status: {statusLabel}</p>}
          {locked && (
            <p className="mt-1 text-xs text-amber-300">
              Requires desktop app installation and permissions.
            </p>
          )}
          {!!blockers?.length && (
            <p className="mt-1 text-xs text-red-300">{blockers[0]}</p>
          )}
          {onViewDetails && (
            <button
              onClick={onViewDetails}
              className="mt-2 text-xs text-cyan-300 transition hover:text-cyan-200"
              type="button"
            >
              View recent events
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => onToggle(!checked)}
          disabled={disabled || locked}
          className={`relative inline-flex h-6 w-11 items-center rounded-full p-0.5 transition ${
            checked ? 'bg-cyan-500' : 'bg-gray-600'
          } ${disabled || locked ? 'cursor-not-allowed opacity-60' : ''}`}
          aria-pressed={checked}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
              checked ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
}

function normalizePhone(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const compact = trimmed.replace(/[.\-()\s]/g, '');
  const hasPlus = compact.startsWith('+');
  const digits = hasPlus ? compact.slice(1) : compact;
  if (!/^\d+$/.test(digits)) {
    return null;
  }
  if (digits.length < 7 || digits.length > 15) {
    return null;
  }
  return hasPlus ? `+${digits}` : digits;
}

export function SetupPanel({
  preferences,
  loading,
  saving,
  error,
  saveError,
  saveSuccess,
  recentAlerts,
  runtimeStatus,
  monitorControl,
  onSave,
  isDesktopRuntime = false,
}: SetupPanelProps) {
  const [smsPhoneDraft, setSmsPhoneDraft] = useState('');
  const [voicePhoneDraft, setVoicePhoneDraft] = useState('');
  const [smsPhoneError, setSmsPhoneError] = useState<string | null>(null);
  const [voicePhoneError, setVoicePhoneError] = useState<string | null>(null);

  useEffect(() => {
    setSmsPhoneDraft(preferences?.sms_phone ?? '');
    setVoicePhoneDraft(preferences?.voice_phone ?? '');
  }, [preferences?.sms_phone, preferences?.voice_phone]);

  if (loading) {
    return (
      <section className="mb-4 rounded-2xl border border-gray-700 bg-gray-900/70 p-4">
        <p className="text-sm text-gray-400">Loading setup...</p>
      </section>
    );
  }

  if (!preferences) {
    return (
      <section className="mb-4 rounded-2xl border border-gray-700 bg-gray-900/70 p-4">
        <p className="text-sm text-red-300">{error || 'Could not load setup state.'}</p>
      </section>
    );
  }

  const desktopLocked = !preferences.desktop_available && !isDesktopRuntime;
  const fileEvents =
    runtimeStatus?.metrics?.file_events_seen ??
    recentAlerts.filter((a) => a.source.includes('File')).length;
  const processEvents =
    runtimeStatus?.metrics?.process_events_seen ??
    recentAlerts.filter((a) => a.source.includes('Process')).length;
  const networkEvents =
    runtimeStatus?.metrics?.network_events_seen ??
    recentAlerts.filter((a) => a.source.includes('Network')).length;
  const openPermissionsSettings = (target: 'file' | 'process' | 'network' | 'alerts' | 'all') => {
    (window as any).havenai?.openPermissionsSettings?.(target);
  };
  const allowAccessAndRetry = async (module: 'file' | 'process' | 'network') => {
    const havenai = (window as any).havenai;
    openPermissionsSettings(module);
    await havenai?.grantMonitorPermission?.(module);
    if (module === 'file') {
      await onSave({ file_monitoring_enabled: true });
      return;
    }
    if (module === 'process') {
      await onSave({ process_monitoring_enabled: true });
      return;
    }
    await onSave({ network_monitoring_enabled: true });
  };

  const fileState = monitorControl?.state.file ?? (preferences.file_monitoring_enabled ? 'running' : 'off');
  const processState =
    monitorControl?.state.process ?? (preferences.process_monitoring_enabled ? 'running' : 'off');
  const networkState =
    monitorControl?.state.network ?? (preferences.network_monitoring_enabled ? 'running' : 'off');
  const fileBlockers = monitorControl?.blockers.file || [];
  const processBlockers = monitorControl?.blockers.process || [];
  const networkBlockers = monitorControl?.blockers.network || [];

  const validateAndSaveSmsPhone = async () => {
    const normalized = normalizePhone(smsPhoneDraft);
    if (!normalized) {
      setSmsPhoneError('Enter a valid phone (7-15 digits, optional +).');
      return;
    }
    setSmsPhoneError(null);
    await onSave({ sms_phone: normalized });
  };

  const validateAndSaveVoicePhone = async () => {
    const normalized = normalizePhone(voicePhoneDraft);
    if (!normalized) {
      setVoicePhoneError('Enter a valid phone (7-15 digits, optional +).');
      return;
    }
    setVoicePhoneError(null);
    await onSave({ voice_phone: normalized });
  };

  return (
    <section className="mb-4 rounded-2xl border border-gray-700 bg-gray-900/70 p-4">
      <div className="mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
          Setup and Monitoring
        </h2>
        <p className="text-xs text-gray-500">
          Configure desktop monitors and cloud alert channels.
        </p>
      </div>

      {desktopLocked && (
        <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
          <div className="mb-1 inline-flex items-center gap-1 font-medium">
            <Lock className="h-3.5 w-3.5" />
            Desktop app required
          </div>
          <p className="mb-2">
            Install and link the desktop app to unlock File, Process, and Network monitoring.
          </p>
          <Link href="/download" className="text-cyan-300 underline">
            Download desktop app
          </Link>
        </div>
      )}

      {isDesktopRuntime && (
        <div className="mb-3 rounded-lg border border-cyan-500/40 bg-cyan-500/10 p-3 text-xs text-cyan-200">
          <div className="mb-1 inline-flex items-center gap-1 font-medium">
            <Activity className="h-3.5 w-3.5" />
            Desktop runtime connected
          </div>
          <p>Local file, process, and network monitoring modules are controlled from this command center.</p>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Desktop Monitoring
        </p>
        <ToggleRow
          label={`File Monitoring (${fileEvents} recent events)`}
          description="Monitors suspicious files and integrity changes."
          checked={preferences.file_monitoring_enabled}
          status={fileState}
          blockers={fileBlockers}
          locked={desktopLocked}
          disabled={saving}
          onToggle={(checked) => onSave({ file_monitoring_enabled: checked })}
        />
        {fileState === 'blocked' && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => openPermissionsSettings('file')}
              className="rounded border border-amber-500/50 bg-amber-500/10 px-2 py-1 text-xs text-amber-200 hover:bg-amber-500/20"
            >
              Open privacy settings
            </button>
            <button
              type="button"
              onClick={() => allowAccessAndRetry('file')}
              className="rounded border border-cyan-500/50 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-200 hover:bg-cyan-500/20"
            >
              Allow access and retry
            </button>
          </div>
        )}
        <ToggleRow
          label={`Process Monitoring (${processEvents} recent events)`}
          description="Monitors process spawns and suspicious parent-child chains."
          checked={preferences.process_monitoring_enabled}
          status={processState}
          blockers={processBlockers}
          locked={desktopLocked}
          disabled={saving}
          onToggle={(checked) => onSave({ process_monitoring_enabled: checked })}
        />
        {processState === 'blocked' && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => openPermissionsSettings('process')}
              className="rounded border border-amber-500/50 bg-amber-500/10 px-2 py-1 text-xs text-amber-200 hover:bg-amber-500/20"
            >
              Open privacy settings
            </button>
            <button
              type="button"
              onClick={() => allowAccessAndRetry('process')}
              className="rounded border border-cyan-500/50 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-200 hover:bg-cyan-500/20"
            >
              Allow access and retry
            </button>
          </div>
        )}
        <ToggleRow
          label={`Network Monitoring (${networkEvents} recent events)`}
          description="Monitors outbound/inbound network behavior and suspicious connections."
          checked={preferences.network_monitoring_enabled}
          status={networkState}
          blockers={networkBlockers}
          locked={desktopLocked}
          disabled={saving}
          onToggle={(checked) => onSave({ network_monitoring_enabled: checked })}
        />
        {networkState === 'blocked' && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => openPermissionsSettings('network')}
              className="rounded border border-amber-500/50 bg-amber-500/10 px-2 py-1 text-xs text-amber-200 hover:bg-amber-500/20"
            >
              Open privacy settings
            </button>
            <button
              type="button"
              onClick={() => allowAccessAndRetry('network')}
              className="rounded border border-cyan-500/50 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-200 hover:bg-cyan-500/20"
            >
              Allow access and retry
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Cloud Alerts
        </p>
        <ToggleRow
          label="Email Alerts"
          description="Receive alerts by account email."
          checked={preferences.email_enabled}
          disabled={saving}
          onToggle={(checked) => onSave({ email_enabled: checked })}
        />
        <ToggleRow
          label="SMS Alerts"
          description="Receive high-priority alerts via text message."
          checked={preferences.sms_enabled}
          disabled={saving}
          onToggle={async (checked) => {
            if (checked) {
              const normalized = normalizePhone(smsPhoneDraft || preferences.sms_phone || '');
              if (!normalized) {
                setSmsPhoneError('Add a valid SMS phone before enabling SMS alerts.');
                return;
              }
              setSmsPhoneError(null);
              if (normalized !== preferences.sms_phone) {
                await onSave({ sms_phone: normalized });
              }
            }
            await onSave({ sms_enabled: checked });
          }}
        />
        {preferences.sms_enabled && (
          <div className="space-y-2">
            <input
              value={smsPhoneDraft}
              placeholder="+1 305 555 1234"
              onChange={(event) => setSmsPhoneDraft(event.target.value)}
              onBlur={validateAndSaveSmsPhone}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs text-gray-200 outline-none focus:border-cyan-400"
            />
            <select
              value={preferences.sms_min_severity}
              onChange={(event) =>
                onSave({
                  sms_min_severity: event.target.value as
                    | 'low'
                    | 'medium'
                    | 'high'
                    | 'critical',
                })
              }
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs text-gray-200 outline-none focus:border-cyan-400"
            >
              <option value="low">SMS threshold: low+</option>
              <option value="medium">SMS threshold: medium+</option>
              <option value="high">SMS threshold: high+</option>
              <option value="critical">SMS threshold: critical only</option>
            </select>
            {smsPhoneError && <p className="text-xs text-red-300">{smsPhoneError}</p>}
          </div>
        )}
        <ToggleRow
          label="Phone Call Alerts"
          description="Receive critical alerts as automated calls."
          checked={preferences.voice_call_enabled}
          disabled={saving}
          onToggle={async (checked) => {
            if (checked) {
              const normalized = normalizePhone(voicePhoneDraft || preferences.voice_phone || '');
              if (!normalized) {
                setVoicePhoneError('Add a valid phone before enabling call alerts.');
                return;
              }
              setVoicePhoneError(null);
              if (normalized !== preferences.voice_phone) {
                await onSave({ voice_phone: normalized });
              }
            }
            await onSave({ voice_call_enabled: checked });
          }}
        />
        {preferences.voice_call_enabled && (
          <div className="space-y-2">
            <input
              value={voicePhoneDraft}
              placeholder="+1 305 555 5678"
              onChange={(event) => setVoicePhoneDraft(event.target.value)}
              onBlur={validateAndSaveVoicePhone}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs text-gray-200 outline-none focus:border-cyan-400"
            />
            <select
              value={preferences.voice_call_min_severity}
              onChange={(event) =>
                onSave({
                  voice_call_min_severity: event.target.value as
                    | 'low'
                    | 'medium'
                    | 'high'
                    | 'critical',
                })
              }
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs text-gray-200 outline-none focus:border-cyan-400"
            >
              <option value="low">Call threshold: low+</option>
              <option value="medium">Call threshold: medium+</option>
              <option value="high">Call threshold: high+</option>
              <option value="critical">Call threshold: critical only</option>
            </select>
            {voicePhoneError && <p className="text-xs text-red-300">{voicePhoneError}</p>}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 text-gray-400">
          <Save className="h-3.5 w-3.5" />
          {saving ? 'Saving...' : saveSuccess || 'Changes autosave'}
        </span>
        {saveError && <span className="text-red-300">{saveError}</span>}
        {error && <span className="text-red-300">{error}</span>}
      </div>
      <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-gray-500">
        <Activity className="h-3 w-3" />
        Agent details are visible in the alert feed and assistant context.
      </div>
    </section>
  );
}
