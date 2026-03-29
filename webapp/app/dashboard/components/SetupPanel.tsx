import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Activity, ChevronDown, ChevronUp, Lock, Mail, Save } from 'lucide-react';

import {
  MonitorControlState,
  MonitorLifecycleState,
  AgentRuntimeStatus,
  SecurityAlert,
  SetupPreferences,
  SetupPreferencesUpdate,
} from '../types';

interface EmailProvider {
  name: string;
  imapHost: string;
  imapPort: number;
  instructionsUrl: string;
}

const EMAIL_PROVIDERS: Record<string, EmailProvider> = {
  'gmail.com': { name: 'Google', imapHost: 'imap.gmail.com', imapPort: 993, instructionsUrl: 'https://myaccount.google.com/apppasswords' },
  'googlemail.com': { name: 'Google', imapHost: 'imap.gmail.com', imapPort: 993, instructionsUrl: 'https://myaccount.google.com/apppasswords' },
  'outlook.com': { name: 'Microsoft', imapHost: 'outlook.office365.com', imapPort: 993, instructionsUrl: 'https://account.microsoft.com/security' },
  'hotmail.com': { name: 'Microsoft', imapHost: 'outlook.office365.com', imapPort: 993, instructionsUrl: 'https://account.microsoft.com/security' },
  'live.com': { name: 'Microsoft', imapHost: 'outlook.office365.com', imapPort: 993, instructionsUrl: 'https://account.microsoft.com/security' },
  'yahoo.com': { name: 'Yahoo', imapHost: 'imap.mail.yahoo.com', imapPort: 993, instructionsUrl: 'https://login.yahoo.com/account/security#other-apps' },
  'ymail.com': { name: 'Yahoo', imapHost: 'imap.mail.yahoo.com', imapPort: 993, instructionsUrl: 'https://login.yahoo.com/account/security#other-apps' },
  'icloud.com': { name: 'Apple', imapHost: 'imap.mail.me.com', imapPort: 993, instructionsUrl: 'https://appleid.apple.com/account/manage' },
  'me.com': { name: 'Apple', imapHost: 'imap.mail.me.com', imapPort: 993, instructionsUrl: 'https://appleid.apple.com/account/manage' },
  'mac.com': { name: 'Apple', imapHost: 'imap.mail.me.com', imapPort: 993, instructionsUrl: 'https://appleid.apple.com/account/manage' },
};

function detectProvider(email: string): EmailProvider | null {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? EMAIL_PROVIDERS[domain] ?? null : null;
}

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
      ? 'text-emerald-400'
      : status === 'blocked'
      ? 'text-red-400'
      : status === 'pending_permission'
      ? 'text-amber-400'
      : 'text-gray-500';
  const statusLabel =
    status === 'running'
      ? 'Running'
      : status === 'blocked'
      ? 'Blocked'
      : status === 'pending_permission'
      ? 'Waiting permission'
      : 'Off';

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="text-xs text-gray-500">{description}</p>
          {!!status && <p className={`mt-1 text-xs font-medium ${statusTone}`}>Status: {statusLabel}</p>}
          {locked && (
            <p className="mt-1 text-xs text-amber-400">
              Requires desktop app installation and permissions.
            </p>
          )}
          {!!blockers?.length && (
            <p className="mt-1 text-xs text-red-400">{blockers[0]}</p>
          )}
          {onViewDetails && (
            <button
              onClick={onViewDetails}
              className="mt-2 text-xs text-cyan-400 transition hover:text-cyan-300"
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
            checked ? 'bg-gradient-to-r from-cyan-500 to-blue-600' : 'bg-white/[0.1]'
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
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [emailMonitorOpen, setEmailMonitorOpen] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [manualImapHost, setManualImapHost] = useState('');
  const [manualImapPort, setManualImapPort] = useState('993');
  const [emailTestStatus, setEmailTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [emailTestMessage, setEmailTestMessage] = useState('');
  const detectedProvider = detectProvider(emailAddress);

  useEffect(() => {
    setSmsPhoneDraft(preferences?.sms_phone ?? '');
    setVoicePhoneDraft(preferences?.voice_phone ?? '');
  }, [preferences?.sms_phone, preferences?.voice_phone]);

  if (loading) {
    return (
      <section className="mb-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-4">
        <p className="text-sm text-gray-400">Loading setup...</p>
      </section>
    );
  }

  if (!preferences) {
    return (
      <section className="mb-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-4">
        <p className="text-sm text-red-400">{error || 'Could not load setup state.'}</p>
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
  const enabledCloudChannels = [
    preferences.email_enabled,
    preferences.sms_enabled,
    preferences.voice_call_enabled,
  ].filter(Boolean).length;

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

  const handleEmailTest = async () => {
    const havenai = (window as any).havenai;
    if (!havenai?.configureEmailMonitor) return;

    const imapHost = detectedProvider?.imapHost || manualImapHost;
    const imapPort = detectedProvider?.imapPort || parseInt(manualImapPort, 10) || 993;

    if (!emailAddress || !appPassword || !imapHost) {
      setEmailTestStatus('error');
      setEmailTestMessage('Please fill in all required fields.');
      return;
    }

    setEmailTestStatus('testing');
    setEmailTestMessage('Testing connection...');

    havenai.configureEmailMonitor({
      email: emailAddress,
      password: appPassword,
      imapHost,
      imapPort,
    });

    havenai.onEmailConfigResult?.((result: any) => {
      if (result?.success) {
        setEmailTestStatus('success');
        setEmailTestMessage(result.message || 'Connected successfully!');
      } else {
        setEmailTestStatus('error');
        setEmailTestMessage(result?.message || 'Connection failed.');
      }
      havenai.removeAllListeners?.('email-config-result');
    });
  };

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-4">
      <div className="mb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Monitor Controls
        </h2>
        <p className="text-[11px] text-gray-600">Fast access to monitor toggles and permission state.</p>
      </div>

      {desktopLocked && (
        <div className="mb-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3 text-xs text-amber-300">
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
        <div className="mb-3 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.06] p-3 text-xs text-cyan-300">
          <div className="mb-1 inline-flex items-center gap-1 font-medium">
            <Activity className="h-3.5 w-3.5" />
            Desktop runtime connected
          </div>
          <p>Local file, process, and network monitoring modules are controlled from this command center.</p>
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
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
              className="rounded-lg border border-amber-400/20 bg-amber-500/[0.06] px-2.5 py-1.5 text-xs text-amber-300 transition hover:bg-amber-500/10"
            >
              Open privacy settings
            </button>
            <button
              type="button"
              onClick={() => allowAccessAndRetry('file')}
              className="rounded-lg border border-cyan-400/20 bg-cyan-500/[0.06] px-2.5 py-1.5 text-xs text-cyan-300 transition hover:bg-cyan-500/10"
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
              className="rounded-lg border border-amber-400/20 bg-amber-500/[0.06] px-2.5 py-1.5 text-xs text-amber-300 transition hover:bg-amber-500/10"
            >
              Open privacy settings
            </button>
            <button
              type="button"
              onClick={() => allowAccessAndRetry('process')}
              className="rounded-lg border border-cyan-400/20 bg-cyan-500/[0.06] px-2.5 py-1.5 text-xs text-cyan-300 transition hover:bg-cyan-500/10"
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
          blockers={networkState === 'blocked' ? networkBlockers : []}
          locked={desktopLocked}
          disabled={saving}
          onToggle={(checked) => onSave({ network_monitoring_enabled: checked })}
        />
        {networkState === 'running' && networkBlockers.length > 0 && (
          <div className="rounded-lg border border-amber-500/10 bg-amber-500/[0.03] px-2.5 py-1.5 text-[11px] text-amber-300/80">
            {networkBlockers[0]}
          </div>
        )}
        {networkState === 'blocked' && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => openPermissionsSettings('network')}
              className="rounded-lg border border-amber-400/20 bg-amber-500/[0.06] px-2.5 py-1.5 text-xs text-amber-300 transition hover:bg-amber-500/10"
            >
              Open privacy settings
            </button>
            <button
              type="button"
              onClick={() => allowAccessAndRetry('network')}
              className="rounded-lg border border-cyan-400/20 bg-cyan-500/[0.06] px-2.5 py-1.5 text-xs text-cyan-300 transition hover:bg-cyan-500/10"
            >
              Allow access and retry
            </button>
          </div>
        )}
      </div>

      {isDesktopRuntime && (
        <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <button
            type="button"
            onClick={() => setEmailMonitorOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-xs text-gray-400"
          >
            <span>
              Email Inbox Monitoring
              <span className="ml-2 text-[11px] text-gray-600">
                {emailTestStatus === 'success' ? 'Connected' : 'Not configured'}
              </span>
            </span>
            {emailMonitorOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {emailMonitorOpen && (
            <div className="space-y-3 border-t border-white/[0.06] px-3 pb-3 pt-3">
              <div>
                <label className="mb-1 block text-xs text-gray-400">Email address</label>
                <input
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="you@gmail.com"
                  className="glass-input !text-xs !py-2"
                />
              </div>

              {detectedProvider ? (
                <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/[0.04] p-2.5 text-xs">
                  <p className="font-medium text-cyan-300">
                    {detectedProvider.name} account detected
                  </p>
                  <p className="mt-1 text-gray-400">
                    IMAP: {detectedProvider.imapHost}:{detectedProvider.imapPort}
                  </p>
                  <p className="mt-2 text-gray-400">
                    Generate an app password from your provider:
                  </p>
                  <a
                    href={detectedProvider.instructionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-cyan-400 underline hover:text-cyan-300"
                  >
                    Open {detectedProvider.name} app password settings
                  </a>
                </div>
              ) : emailAddress.includes('@') ? (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">Unknown provider — enter IMAP details manually.</p>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="mb-1 block text-xs text-gray-400">IMAP Host</label>
                      <input
                        type="text"
                        value={manualImapHost}
                        onChange={(e) => setManualImapHost(e.target.value)}
                        placeholder="imap.example.com"
                        className="glass-input !text-xs !py-2"
                      />
                    </div>
                    <div className="w-20">
                      <label className="mb-1 block text-xs text-gray-400">Port</label>
                      <input
                        type="text"
                        value={manualImapPort}
                        onChange={(e) => setManualImapPort(e.target.value)}
                        placeholder="993"
                        className="glass-input !text-xs !py-2"
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              <div>
                <label className="mb-1 block text-xs text-gray-400">App password</label>
                <input
                  type="password"
                  value={appPassword}
                  onChange={(e) => setAppPassword(e.target.value)}
                  placeholder="Paste your app-specific password"
                  className="glass-input !text-xs !py-2"
                />
              </div>

              <button
                type="button"
                onClick={handleEmailTest}
                disabled={emailTestStatus === 'testing' || !emailAddress || !appPassword}
                className={`w-full rounded-lg px-3 py-2 text-xs font-medium transition ${
                  emailTestStatus === 'testing'
                    ? 'cursor-wait bg-white/[0.06] text-gray-400'
                    : emailTestStatus === 'success'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {emailTestStatus === 'testing'
                  ? 'Testing connection...'
                  : emailTestStatus === 'success'
                  ? 'Connected'
                  : 'Test Connection'}
              </button>

              {emailTestMessage && (
                <p className={`text-xs ${emailTestStatus === 'success' ? 'text-emerald-400' : emailTestStatus === 'error' ? 'text-red-400' : 'text-gray-400'}`}>
                  {emailTestMessage}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <button
          type="button"
          onClick={() => setAdvancedOpen((value) => !value)}
          className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-xs text-gray-400"
        >
          <span>
            Advanced alert channels
            <span className="ml-2 text-[11px] text-gray-600">{enabledCloudChannels}/3 enabled</span>
          </span>
          {advancedOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        {advancedOpen && (
          <div className="space-y-2 border-t border-white/[0.06] px-3 pb-3 pt-3">
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
                  className="glass-input !text-xs !py-2"
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
                  className="glass-input !text-xs !py-2"
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
                  className="glass-input !text-xs !py-2"
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
                  className="glass-input !text-xs !py-2"
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
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 text-gray-500">
          <Save className="h-3.5 w-3.5" />
          {saving ? 'Saving...' : saveSuccess || 'Changes autosave'}
        </span>
        {saveError && <span className="text-red-400">{saveError}</span>}
        {error && <span className="text-red-400">{error}</span>}
      </div>
      <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-gray-600">
        <Activity className="h-3 w-3" />
        Agent details are visible in the alert feed and assistant context.
      </div>
    </section>
  );
}
