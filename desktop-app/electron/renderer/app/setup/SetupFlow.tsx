'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  FileSearch,
  Loader2,
  Mail,
  Wifi,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * The SETUP step runs right after the walkthrough for a brand-new account.
 * Four stepped cards walk the user through granting File / Process / Network
 * permissions, and (optionally) connecting email. All four are skippable —
 * the dashboard shows a persistent amber banner until setup is complete.
 *
 * Reuses the existing IPC:
 *   havenai.openPermissionsSettings(module)
 *   havenai.grantMonitorPermission(module) → returns full monitor-control state
 *   havenai.setMonitorDesired({ module, enabled })
 *   havenai.configureEmailMonitor(...)
 */

type MonitorModule = 'file' | 'process' | 'network';
type LifecycleState = 'off' | 'pending_permission' | 'running' | 'blocked' | 'error';
type RecheckOutcome = 'ok' | 'still-blocked' | 'error' | null;

interface StepBase {
  id: 'file' | 'process' | 'network' | 'email';
  icon: LucideIcon;
  headline: string;
  subhead: string;
  description: string;
}

const STEPS: StepBase[] = [
  {
    id: 'file',
    icon: FileSearch,
    headline: 'Watch your files',
    subhead: 'HavenAI can spot unusual writes and bulk edits.',
    description:
      'macOS needs Full Disk Access to let HavenAI see activity inside Desktop and Downloads. Grant it in System Settings and we\u2019ll pick it up automatically.',
  },
  {
    id: 'process',
    icon: Eye,
    headline: 'Watch your apps',
    subhead: 'Unknown processes are one of the biggest red flags.',
    description:
      'HavenAI lists running apps and flags suspicious spawns. This usually works without extra permissions, but the re-check below will confirm.',
  },
  {
    id: 'network',
    icon: Wifi,
    headline: 'Watch your network',
    subhead: 'Catches outbound connections to unfamiliar hosts.',
    description:
      'Full Disk Access helps here too — without it, macOS hides the process-to-socket mapping. You\u2019ll still get most signals even if this stays limited.',
  },
  {
    id: 'email',
    icon: Mail,
    headline: 'Scan your inbox (optional)',
    subhead: 'We look for phishing, fake senders, and scam patterns.',
    description:
      'Gmail, iCloud, Yahoo, and Outlook are supported. Skip this one if you\u2019d rather set it up later from the Email tab.',
  },
];

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
  'yahoo.com': { name: 'Yahoo', imapHost: 'imap.mail.yahoo.com', imapPort: 993, instructionsUrl: 'https://login.yahoo.com/account/security#other-apps' },
  'icloud.com': { name: 'Apple', imapHost: 'imap.mail.me.com', imapPort: 993, instructionsUrl: 'https://appleid.apple.com/account/manage' },
  'me.com': { name: 'Apple', imapHost: 'imap.mail.me.com', imapPort: 993, instructionsUrl: 'https://appleid.apple.com/account/manage' },
};

function detectProvider(email: string): EmailProvider | null {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? EMAIL_PROVIDERS[domain] ?? null : null;
}

interface Props {
  onFinish: () => void;
  onSkip: () => void;
}

export default function SetupFlow({ onFinish, onSkip }: Props) {
  const [step, setStep] = useState(0);
  const [monitorStates, setMonitorStates] = useState<Record<MonitorModule, LifecycleState>>({
    file: 'off',
    process: 'off',
    network: 'off',
  });
  const [recheckingModule, setRecheckingModule] = useState<MonitorModule | null>(null);
  const [recheckResult, setRecheckResult] = useState<Record<MonitorModule, RecheckOutcome>>({
    file: null,
    process: null,
    network: null,
  });
  const [openedFor, setOpenedFor] = useState<Record<string, boolean>>({});

  // Email form
  const [emailAddress, setEmailAddress] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [emailMessage, setEmailMessage] = useState('');

  const havenai = typeof window !== 'undefined' ? (window as any).havenai : null;
  const provider = useMemo(() => detectProvider(emailAddress), [emailAddress]);
  const current = STEPS[step];

  // Pull initial monitor state once.
  useEffect(() => {
    if (!havenai?.getMonitorControlState) return;
    havenai.getMonitorControlState().then((ctrl: any) => {
      if (ctrl?.state) {
        setMonitorStates({
          file: ctrl.state.file || 'off',
          process: ctrl.state.process || 'off',
          network: ctrl.state.network || 'off',
        });
      }
    });
  }, [havenai]);

  // Keep in sync with live monitor-state broadcasts.
  useEffect(() => {
    if (!havenai?.onMonitorState) return;
    havenai.onMonitorState((ctrl: any) => {
      if (!ctrl?.state) return;
      setMonitorStates({
        file: ctrl.state.file || 'off',
        process: ctrl.state.process || 'off',
        network: ctrl.state.network || 'off',
      });
    });
    return () => havenai?.removeAllListeners?.('monitor-state');
  }, [havenai]);

  const openSettings = useCallback(
    (mod: MonitorModule) => {
      havenai?.openPermissionsSettings?.(mod);
      setOpenedFor((prev) => ({ ...prev, [mod]: true }));
    },
    [havenai],
  );

  const recheck = useCallback(
    async (mod: MonitorModule) => {
      setRecheckingModule(mod);
      setRecheckResult((p) => ({ ...p, [mod]: null }));
      try {
        const result = await havenai?.grantMonitorPermission?.(mod);
        const next: LifecycleState | undefined = result?.state?.[mod];
        if (next === 'running' || next === 'pending_permission') {
          setRecheckResult((p) => ({ ...p, [mod]: 'ok' }));
        } else {
          setRecheckResult((p) => ({ ...p, [mod]: 'still-blocked' }));
        }
      } catch {
        setRecheckResult((p) => ({ ...p, [mod]: 'error' }));
      } finally {
        setRecheckingModule(null);
      }
    },
    [havenai],
  );

  const enableMonitor = useCallback(
    (mod: MonitorModule) => {
      havenai?.setMonitorDesired?.({ module: mod, enabled: true });
    },
    [havenai],
  );

  const testEmail = useCallback(() => {
    if (!havenai?.configureEmailMonitor || !emailAddress || !appPassword) return;
    const imapHost = provider?.imapHost;
    const imapPort = provider?.imapPort || 993;
    if (!imapHost) {
      setEmailStatus('error');
      setEmailMessage('We only support Gmail, iCloud, Yahoo, and Outlook right now — use the Email tab in Settings for custom providers.');
      return;
    }

    setEmailStatus('testing');
    setEmailMessage('Testing connection\u2026');

    havenai.configureEmailMonitor({
      email: emailAddress,
      password: appPassword,
      imapHost,
      imapPort,
    });

    let settled = false;
    const timeoutId = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      havenai.removeAllListeners?.('email-config-result');
      setEmailStatus('error');
      setEmailMessage('Timed out after 25s. Double-check your app password and try again.');
    }, 25_000);

    havenai.onEmailConfigResult?.((result: any) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      if (result?.success) {
        setEmailStatus('success');
        setEmailMessage(result.message || 'Connected! Scanning inbox now.');
      } else {
        setEmailStatus('error');
        setEmailMessage(result?.message || 'Connection failed. Check the app password.');
      }
      havenai.removeAllListeners?.('email-config-result');
    });
  }, [havenai, emailAddress, appPassword, provider]);

  const goNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else onFinish();
  };

  const stepBadge = (mod: MonitorModule) => {
    const s = monitorStates[mod];
    if (s === 'running') return { label: 'Monitoring', tone: 'text-emerald-400' };
    if (s === 'blocked') return { label: 'Needs permission', tone: 'text-red-400' };
    if (s === 'pending_permission') return { label: 'Starting\u2026', tone: 'text-amber-400' };
    return { label: 'Off', tone: 'text-gray-500' };
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-haven-bg px-4 py-12">
      <div className="w-full max-w-xl">
        <div className="mb-8 flex items-center justify-center gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? 'w-8 bg-blue-500' : i < step ? 'w-2 bg-blue-300' : 'w-2 bg-gray-300 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>

        <div className="card p-8 md:p-10 animate-fade-in" key={current.id}>
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10">
              <current.icon className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <h1 className="text-center text-2xl md:text-3xl font-bold text-haven-text">
            {current.headline}
          </h1>
          <p className="mt-2 text-center text-sm font-medium text-blue-500">{current.subhead}</p>
          <p className="mt-4 text-center text-sm md:text-[15px] leading-relaxed text-haven-text-secondary">
            {current.description}
          </p>

          {current.id !== 'email' ? (
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-xs">
                <span className="text-haven-text-secondary">Status</span>
                <span className={`font-medium ${stepBadge(current.id as MonitorModule).tone}`}>
                  {stepBadge(current.id as MonitorModule).label}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openSettings(current.id as MonitorModule)}
                  disabled={recheckingModule === current.id}
                  className="flex-1 rounded-lg border border-amber-400/30 bg-amber-500/[0.08] px-3 py-2 text-xs font-medium text-amber-300 transition hover:bg-amber-500/[0.14] disabled:opacity-60"
                >
                  {openedFor[current.id] ? 'Open privacy settings again' : '1. Open privacy settings'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    enableMonitor(current.id as MonitorModule);
                    recheck(current.id as MonitorModule);
                  }}
                  disabled={recheckingModule === current.id}
                  className="flex-1 rounded-lg border border-cyan-400/30 bg-cyan-500/[0.08] px-3 py-2 text-xs font-medium text-cyan-300 transition hover:bg-cyan-500/[0.14] disabled:opacity-60 disabled:cursor-wait"
                >
                  {recheckingModule === current.id
                    ? 'Checking\u2026'
                    : openedFor[current.id]
                    ? "2. I\u2019ve granted access \u2014 check"
                    : "I\u2019ve already granted access \u2014 check"}
                </button>
              </div>

              {recheckResult[current.id as MonitorModule] === 'ok' && (
                <p className="text-[11px] text-emerald-300/90">
                  <CheckCircle2 className="inline h-3 w-3 mr-1" />
                  Access granted. Monitoring is starting up.
                </p>
              )}
              {recheckResult[current.id as MonitorModule] === 'still-blocked' && (
                <p className="text-[11px] text-amber-300/90">
                  {'Still blocked. In Privacy & Security \u2192 Full Disk Access, make sure HavenAI is toggled on. macOS sometimes needs a moment to apply it.'}
                </p>
              )}
              {recheckResult[current.id as MonitorModule] === 'error' && (
                <p className="text-[11px] text-red-300/90">
                  {'Couldn\u2019t re-check \u2014 try again in a second.'}
                </p>
              )}
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              <label className="block text-xs font-medium text-haven-text-secondary">
                Email address
                <input
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="you@gmail.com"
                  className="input-field mt-1"
                />
              </label>
              <label className="block text-xs font-medium text-haven-text-secondary">
                App password
                {provider && (
                  <span className="ml-2 text-[11px] text-blue-400">
                    <a href={provider.instructionsUrl} target="_blank" rel="noreferrer" className="underline">
                      Generate one for {provider.name}
                    </a>
                  </span>
                )}
                <input
                  type="password"
                  value={appPassword}
                  onChange={(e) => setAppPassword(e.target.value)}
                  placeholder="xxxx xxxx xxxx xxxx"
                  className="input-field mt-1"
                />
              </label>
              <button
                type="button"
                onClick={testEmail}
                disabled={emailStatus === 'testing' || !emailAddress || !appPassword}
                className="btn-primary w-full disabled:opacity-60"
              >
                {emailStatus === 'testing' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {'Testing\u2026'}
                  </>
                ) : (
                  'Test connection'
                )}
              </button>
              {emailStatus !== 'idle' && (
                <p
                  className={`text-[11px] ${
                    emailStatus === 'success'
                      ? 'text-emerald-300/90'
                      : emailStatus === 'error'
                      ? 'text-amber-300/90'
                      : 'text-haven-text-tertiary'
                  }`}
                >
                  {emailMessage}
                </p>
              )}
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              onClick={onSkip}
              className="text-sm text-haven-text-tertiary transition hover:text-haven-text"
            >
              Skip setup for now
            </button>
            <button onClick={goNext} className="btn-primary">
              {step === STEPS.length - 1 ? 'Finish setup' : 'Continue'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-haven-text-tertiary">
          {`Step ${step + 1} of ${STEPS.length} \u2014 you can change any of this later in Settings.`}
        </p>
      </div>
    </div>
  );
}
