'use client';

import { useEffect, useState } from 'react';
import {
  Bell,
  Compass,
  Eye,
  FileSearch,
  Link2Off,
  LogOut,
  Mail,
  Monitor,
  Moon,
  Phone,
  MessageSquare,
  Sun,
  User,
  Wifi,
} from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import { listDevices, unlinkDevice, DeviceInfo } from '../services/setupApi';

function ToggleSwitch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function SettingRow({
  icon: Icon,
  label,
  description,
  children,
}: {
  icon: typeof Bell;
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
          <Icon className="h-[18px] w-[18px] text-blue-500" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-haven-text">{label}</p>
          {description && (
            <p className="text-xs text-haven-text-tertiary">{description}</p>
          )}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-haven-text-tertiary">
        {title}
      </h3>
      <div className="divide-y" style={{ borderColor: 'var(--haven-border)' }}>
        {children}
      </div>
    </div>
  );
}

function normalizePhone(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const compact = trimmed.replace(/[.\-()\s]/g, '');
  const hasPlus = compact.startsWith('+');
  const digits = hasPlus ? compact.slice(1) : compact;
  if (!/^\d+$/.test(digits)) return null;
  if (digits.length < 7 || digits.length > 15) return null;
  return hasPlus ? `+${digits}` : digits;
}

export default function SettingsPage() {
  const {
    preferences,
    preferencesSaving,
    savePreferences,
    isDesktopRuntime,
    monitorControl,
    user,
    logout,
  } = useDashboard();

  const [smsPhone, setSmsPhone] = useState('');
  const [voicePhone, setVoicePhone] = useState('');
  const [isDark, setIsDark] = useState(false);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [unlinking, setUnlinking] = useState<string | null>(null);

  useEffect(() => {
    setSmsPhone(preferences?.sms_phone ?? '');
    setVoicePhone(preferences?.voice_phone ?? '');
  }, [preferences?.sms_phone, preferences?.voice_phone]);

  // Fetch linked devices (webapp only — desktop shows single device info via IPC)
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token || isDesktopRuntime) return;
    listDevices(token).then(setDevices).catch(() => {});
  }, [isDesktopRuntime]);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('haven-theme', next ? 'dark' : 'light');
  };

  // Allow toggles even without desktop linked — backend handles gracefully
  const desktopLocked = false;

  const handleSmsPhoneSave = () => {
    const normalized = normalizePhone(smsPhone);
    if (normalized) savePreferences({ sms_phone: normalized });
  };

  const handleVoicePhoneSave = () => {
    const normalized = normalizePhone(voicePhone);
    if (normalized) savePreferences({ voice_phone: normalized });
  };

  const handleUnlinkDevice = async (deviceId: string) => {
    if (!confirm('Are you sure you want to unlink this device? It will stop all monitoring on that device and allow another account to claim it.')) {
      return;
    }

    if (isDesktopRuntime) {
      // Desktop: trigger unlink via IPC and let the root state machine
      // handle the transition when the `device-unlinked` event arrives.
      // Do NOT call logout() here — logout navigates window.location to
      // /login which escapes the state machine and leaves a white page.
      const havenai = (window as any).havenai;
      if (havenai?.unlinkDevice) {
        try {
          localStorage.removeItem('haven-email-connection');
        } catch {
          /* ignore */
        }
        await havenai.unlinkDevice();
      }
    } else {
      // Webapp: call API directly
      const token = localStorage.getItem('access_token');
      if (!token) return;
      setUnlinking(deviceId);
      try {
        await unlinkDevice(token, deviceId);
        setDevices((prev) => prev.filter((d) => d.id !== deviceId));
      } catch {
        // Silently handle — device may already be unlinked
      } finally {
        setUnlinking(null);
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-haven-text">Settings</h1>
        <p className="mt-1 text-sm text-haven-text-secondary">
          Manage your protection and preferences.
        </p>
      </div>

      {/* Protection */}
      <SectionCard title="Protection">
        <SettingRow
          icon={FileSearch}
          label="File monitoring"
          description="Watch for unauthorized file changes"
        >
          <ToggleSwitch
            checked={Boolean(preferences?.file_monitoring_enabled)}
            disabled={preferencesSaving || desktopLocked}
            onChange={(v) => savePreferences({ file_monitoring_enabled: v })}
          />
        </SettingRow>
        <SettingRow
          icon={Eye}
          label="App monitoring"
          description="Track suspicious app behavior"
        >
          <ToggleSwitch
            checked={Boolean(preferences?.process_monitoring_enabled)}
            disabled={preferencesSaving || desktopLocked}
            onChange={(v) => savePreferences({ process_monitoring_enabled: v })}
          />
        </SettingRow>
        <SettingRow
          icon={Wifi}
          label="Network monitoring"
          description="Monitor internet connections"
        >
          <ToggleSwitch
            checked={Boolean(preferences?.network_monitoring_enabled)}
            disabled={preferencesSaving || desktopLocked}
            onChange={(v) => savePreferences({ network_monitoring_enabled: v })}
          />
        </SettingRow>
        <SettingRow
          icon={Mail}
          label="Email monitoring"
          description="Scan for phishing and suspicious emails"
        >
          <ToggleSwitch
            checked={Boolean(preferences?.email_enabled)}
            disabled={preferencesSaving}
            onChange={(v) => savePreferences({ email_enabled: v })}
          />
        </SettingRow>
      </SectionCard>

      {/* Notifications */}
      <SectionCard title="Notifications">
        <SettingRow
          icon={Bell}
          label="Email alerts"
          description="Receive alerts to your account email"
        >
          <ToggleSwitch
            checked={Boolean(preferences?.email_enabled)}
            disabled={preferencesSaving}
            onChange={(v) => savePreferences({ email_enabled: v })}
          />
        </SettingRow>
        <SettingRow
          icon={MessageSquare}
          label="Text message alerts"
          description="Get high-priority alerts via SMS"
        >
          <ToggleSwitch
            checked={Boolean(preferences?.sms_enabled)}
            disabled={preferencesSaving}
            onChange={(v) => savePreferences({ sms_enabled: v })}
          />
        </SettingRow>
        {preferences?.sms_enabled && (
          <div className="py-3 pl-12">
            <input
              value={smsPhone}
              onChange={(e) => setSmsPhone(e.target.value)}
              onBlur={handleSmsPhoneSave}
              placeholder="+1 555 123 4567"
              className="input-field !py-2 !text-sm max-w-xs"
            />
          </div>
        )}
        <SettingRow
          icon={Phone}
          label="Phone call alerts"
          description="Automated calls for critical threats"
        >
          <ToggleSwitch
            checked={Boolean(preferences?.voice_call_enabled)}
            disabled={preferencesSaving}
            onChange={(v) => savePreferences({ voice_call_enabled: v })}
          />
        </SettingRow>
        {preferences?.voice_call_enabled && (
          <div className="py-3 pl-12">
            <input
              value={voicePhone}
              onChange={(e) => setVoicePhone(e.target.value)}
              onBlur={handleVoicePhoneSave}
              placeholder="+1 555 123 4567"
              className="input-field !py-2 !text-sm max-w-xs"
            />
          </div>
        )}
      </SectionCard>

      {/* Appearance */}
      <SectionCard title="Appearance">
        <SettingRow
          icon={isDark ? Moon : Sun}
          label={isDark ? 'Dark mode' : 'Light mode'}
          description="Toggle light and dark theme"
        >
          <ToggleSwitch checked={isDark} onChange={toggleTheme} />
        </SettingRow>
      </SectionCard>

      {/* Device */}
      <SectionCard title="Device">
        {isDesktopRuntime ? (
          <>
            <SettingRow
              icon={Monitor}
              label="Desktop app"
              description="Connected"
            >
              <span className="text-xs font-medium text-green-500">Active</span>
            </SettingRow>
            <div className="py-4">
              <button
                onClick={() => handleUnlinkDevice('current')}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-red-500 transition hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                <Link2Off className="h-4 w-4" />
                Unlink this device
              </button>
              <p className="mt-1.5 pl-1 text-xs text-haven-text-tertiary">
                Removes this device from your account. Another account will be able to use Haven on this device.
              </p>
            </div>
          </>
        ) : devices.length > 0 ? (
          devices.map((device) => (
            <div key={device.id} className="flex items-center justify-between gap-4 py-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                  <Monitor className="h-[18px] w-[18px] text-blue-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-haven-text">{device.name}</p>
                  <p className="text-xs text-haven-text-tertiary">
                    {device.os_type} {device.os_version ? `· ${device.os_version}` : ''} · {device.is_online ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleUnlinkDevice(device.id)}
                disabled={unlinking === device.id}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50"
              >
                <Link2Off className="h-3.5 w-3.5" />
                {unlinking === device.id ? 'Unlinking...' : 'Unlink'}
              </button>
            </div>
          ))
        ) : (
          <SettingRow
            icon={Monitor}
            label="No devices linked"
            description="Install the HavenAI desktop app to protect your device"
          >
            <span className="text-xs font-medium text-haven-text-tertiary">Inactive</span>
          </SettingRow>
        )}
      </SectionCard>

      {/* Help */}
      {isDesktopRuntime && (
        <SectionCard title="Help">
          <div className="py-4">
            <button
              onClick={() => {
                // No persisted flag change — just nudge the root state
                // machine to replay the walkthrough. Returns to dashboard
                // on completion without touching onboardedUsers.
                window.dispatchEvent(new CustomEvent('havenai-replay-onboarding'));
              }}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-blue-500 transition hover:bg-blue-50 dark:hover:bg-blue-500/10"
            >
              <Compass className="h-4 w-4" />
              Take the walkthrough again
            </button>
            <p className="mt-1 pl-1 text-xs text-haven-text-tertiary">
              Replays the intro tour. You'll land back on Home when you finish.
            </p>
          </div>
        </SectionCard>
      )}

      {/* Dev-only hard reset — only visible in unpackaged dev builds. */}
      {isDesktopRuntime && typeof window !== 'undefined' && !(window as any).havenai?.isPackaged && (
        <SectionCard title="Developer">
          <div className="py-4">
            <button
              onClick={async () => {
                if (!confirm('Hard reset will unlink this device, wipe all local HavenAI data, and reload the app. Continue?')) return;
                const havenai = (window as any).havenai;
                try {
                  await havenai?.hardReset?.();
                } catch {
                  /* reloads regardless */
                }
                try { localStorage.clear(); } catch { /* ignore */ }
                window.location.reload();
              }}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-red-500 transition hover:bg-red-50 dark:hover:bg-red-500/10"
            >
              <Link2Off className="h-4 w-4" />
              Hard reset (dev only)
            </button>
            <p className="mt-1 pl-1 text-xs text-haven-text-tertiary">
              Unlinks the device, wipes all HavenAI state on this machine, reloads to the login screen.
            </p>
          </div>
        </SectionCard>
      )}

      {/* Account */}
      <SectionCard title="Account">
        <SettingRow
          icon={User}
          label={user?.full_name || 'Account'}
          description={user?.email}
        >
          <span />
        </SettingRow>
        <div className="py-4">
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-red-500 transition hover:bg-red-50 dark:hover:bg-red-500/10"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
