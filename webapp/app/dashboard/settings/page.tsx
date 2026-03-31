'use client';

import { useEffect, useState } from 'react';
import {
  Bell,
  Eye,
  FileSearch,
  LogOut,
  Mail,
  Monitor,
  Moon,
  Phone,
  MessageSquare,
  Shield,
  Sun,
  User,
  Wifi,
} from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';

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
  icon: typeof Shield;
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

  useEffect(() => {
    setSmsPhone(preferences?.sms_phone ?? '');
    setVoicePhone(preferences?.voice_phone ?? '');
  }, [preferences?.sms_phone, preferences?.voice_phone]);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('haven-theme', next ? 'dark' : 'light');
  };

  const desktopLocked = !preferences?.desktop_available && !isDesktopRuntime;

  const handleSmsPhoneSave = () => {
    const normalized = normalizePhone(smsPhone);
    if (normalized) savePreferences({ sms_phone: normalized });
  };

  const handleVoicePhoneSave = () => {
    const normalized = normalizePhone(voicePhone);
    if (normalized) savePreferences({ voice_phone: normalized });
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
        <SettingRow
          icon={Monitor}
          label="Desktop app"
          description={isDesktopRuntime ? 'Connected' : 'Not connected'}
        >
          <span className={`text-xs font-medium ${isDesktopRuntime ? 'text-green-500' : 'text-haven-text-tertiary'}`}>
            {isDesktopRuntime ? 'Active' : 'Inactive'}
          </span>
        </SettingRow>
      </SectionCard>

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
