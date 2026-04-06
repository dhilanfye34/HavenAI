'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Lock,
  Mail,
  MessageCircle,
  Unplug,
} from 'lucide-react';
import ShieldLock from '../../components/ShieldLock';
import { useDashboard } from '../context/DashboardContext';

interface ProviderInfo {
  name: string;
  imapHost: string;
  imapPort: number;
  instructionsUrl: string;
  steps: string[];
}

const EMAIL_PROVIDERS: Record<string, ProviderInfo> = {
  'gmail.com': {
    name: 'Gmail',
    imapHost: 'imap.gmail.com',
    imapPort: 993,
    instructionsUrl: 'https://myaccount.google.com/apppasswords',
    steps: [
      'Go to your Google Account security settings',
      'Make sure 2-Step Verification is turned on',
      'Search for "App passwords" in your Google Account',
      'Select "Mail" as the app and "Mac" as the device',
      'Click "Generate" and copy the 16-character password',
      'Paste it in the app password field below',
    ],
  },
  'googlemail.com': {
    name: 'Gmail',
    imapHost: 'imap.gmail.com',
    imapPort: 993,
    instructionsUrl: 'https://myaccount.google.com/apppasswords',
    steps: [
      'Go to your Google Account security settings',
      'Make sure 2-Step Verification is turned on',
      'Search for "App passwords" in your Google Account',
      'Select "Mail" as the app and "Mac" as the device',
      'Click "Generate" and copy the 16-character password',
      'Paste it in the app password field below',
    ],
  },
  'outlook.com': {
    name: 'Outlook',
    imapHost: 'outlook.office365.com',
    imapPort: 993,
    instructionsUrl: 'https://account.microsoft.com/security',
    steps: [
      'Go to your Microsoft Account security page',
      'Turn on Two-step verification if not already on',
      'Under "App passwords", click "Create a new app password"',
      'Copy the generated password',
      'Paste it in the app password field below',
    ],
  },
  'hotmail.com': {
    name: 'Outlook',
    imapHost: 'outlook.office365.com',
    imapPort: 993,
    instructionsUrl: 'https://account.microsoft.com/security',
    steps: [
      'Go to your Microsoft Account security page',
      'Turn on Two-step verification if not already on',
      'Under "App passwords", click "Create a new app password"',
      'Copy the generated password',
      'Paste it in the app password field below',
    ],
  },
  'live.com': {
    name: 'Outlook',
    imapHost: 'outlook.office365.com',
    imapPort: 993,
    instructionsUrl: 'https://account.microsoft.com/security',
    steps: [
      'Go to your Microsoft Account security page',
      'Turn on Two-step verification if not already on',
      'Under "App passwords", click "Create a new app password"',
      'Copy the generated password',
      'Paste it in the app password field below',
    ],
  },
  'yahoo.com': {
    name: 'Yahoo',
    imapHost: 'imap.mail.yahoo.com',
    imapPort: 993,
    instructionsUrl: 'https://login.yahoo.com/account/security#other-apps',
    steps: [
      'Go to your Yahoo Account security page',
      'Scroll down to "Generate app password"',
      'Select "Other App" and enter "HavenAI"',
      'Click "Generate" and copy the password',
      'Paste it in the app password field below',
    ],
  },
  'ymail.com': {
    name: 'Yahoo',
    imapHost: 'imap.mail.yahoo.com',
    imapPort: 993,
    instructionsUrl: 'https://login.yahoo.com/account/security#other-apps',
    steps: [
      'Go to your Yahoo Account security page',
      'Scroll down to "Generate app password"',
      'Select "Other App" and enter "HavenAI"',
      'Click "Generate" and copy the password',
      'Paste it in the app password field below',
    ],
  },
  'icloud.com': {
    name: 'iCloud',
    imapHost: 'imap.mail.me.com',
    imapPort: 993,
    instructionsUrl: 'https://appleid.apple.com/account/manage',
    steps: [
      'Go to appleid.apple.com and sign in',
      'Go to "Sign-In and Security" then "App-Specific Passwords"',
      'Click "Generate an app-specific password"',
      'Enter "HavenAI" as the label',
      'Copy the generated password',
      'Paste it in the app password field below',
    ],
  },
  'me.com': {
    name: 'iCloud',
    imapHost: 'imap.mail.me.com',
    imapPort: 993,
    instructionsUrl: 'https://appleid.apple.com/account/manage',
    steps: [
      'Go to appleid.apple.com and sign in',
      'Go to "Sign-In and Security" then "App-Specific Passwords"',
      'Click "Generate an app-specific password"',
      'Enter "HavenAI" as the label',
      'Copy the generated password',
      'Paste it in the app password field below',
    ],
  },
};

function detectProvider(email: string): ProviderInfo | null {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? EMAIL_PROVIDERS[domain] ?? null : null;
}

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function EmailPage() {
  const {
    preferences, isDesktopRuntime, alerts, chatSendMessage,
    emailConnection, setEmailConnected, setEmailDisconnected, setEmailTesting, setEmailError,
  } = useDashboard();

  const isConnected = emailConnection.status === 'connected';

  const [emailAddress, setEmailAddress] = useState(emailConnection.email || '');
  const [appPassword, setAppPassword] = useState('');
  const [manualHost, setManualHost] = useState('');
  const [manualPort, setManualPort] = useState('993');
  const [showSetup, setShowSetup] = useState(false);

  const testStatus = emailConnection.status === 'connected' ? 'success'
    : emailConnection.status === 'testing' ? 'testing'
    : emailConnection.status === 'error' ? 'error'
    : 'idle';

  const provider = detectProvider(emailAddress);

  // Deduplicate email alerts by subject+timestamp (agent can re-send same alert)
  const emailAlerts = useMemo(() => {
    const raw = alerts.filter(
      (a) => (a.source.toLowerCase().includes('email') || a.description.toLowerCase().includes('email'))
        && a.severity !== 'info',
    );
    const seen = new Set<string>();
    return raw.filter((a) => {
      // Dedupe by description (which includes subject)
      const key = a.description;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [alerts]);

  const handleConnect = () => {
    const havenai = (window as any).havenai;
    if (!havenai?.configureEmailMonitor) return;

    const imapHost = provider?.imapHost || manualHost;
    const imapPort = provider?.imapPort || parseInt(manualPort, 10) || 993;

    if (!emailAddress || !appPassword || !imapHost) {
      setEmailError('Please fill in all fields.');
      return;
    }

    setEmailTesting();

    havenai.configureEmailMonitor({ email: emailAddress, password: appPassword, imapHost, imapPort });
    havenai.onEmailConfigResult?.((result: any) => {
      if (result?.success) {
        setEmailConnected(emailAddress, provider?.name || '', result.message || 'Connected successfully!');
        setAppPassword('');
        setShowSetup(false);
      } else {
        setEmailError(result?.message || 'Connection failed. Check your credentials and try again.');
      }
      havenai.removeAllListeners?.('email-config-result');
    });
  };

  const handleDisconnect = () => {
    const havenai = (window as any).havenai;
    havenai?.disconnectEmailMonitor?.();
    setEmailDisconnected();
    setEmailAddress('');
    setAppPassword('');
  };

  const askAboutAlert = (alert: typeof emailAlerts[0]) => {
    const details = typeof alert.details === 'string' ? alert.details : '';
    chatSendMessage(`Tell me about this suspicious email: "${alert.description}". ${details} What should I do?`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-haven-text">Email</h1>
        <p className="mt-1 text-sm text-haven-text-secondary">
          We scan your inbox locally for phishing and suspicious emails.
        </p>
      </div>

      {/* Status */}
      <div className="card p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isConnected ? 'bg-green-500/10' : 'bg-gray-100 dark:bg-gray-800'}`}>
            <Mail className={`h-5 w-5 ${isConnected ? 'text-green-500' : 'text-haven-text-tertiary'}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-haven-text">
              {isConnected
                ? 'Email monitoring is active'
                : 'Email monitoring is not connected'}
            </p>
            <p className="text-xs text-haven-text-tertiary">
              {isConnected
                ? `Connected to ${emailConnection.providerName || 'your email'} (${emailConnection.email})`
                : 'Connect your email to scan for threats'}
            </p>
          </div>
        </div>
        {isConnected ? (
          <button
            onClick={handleDisconnect}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-50 dark:hover:bg-red-500/10"
          >
            <Unplug className="h-3.5 w-3.5" />
            Disconnect
          </button>
        ) : (
          <span className="status-dot-inactive" />
        )}
      </div>

      {/* Privacy note */}
      <div className="card p-4 flex items-start gap-3">
        <Lock className="h-5 w-5 shrink-0 text-blue-500 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-haven-text">Your credentials stay on this device</p>
          <p className="text-xs text-haven-text-secondary mt-0.5">
            Your email password is encrypted using your operating system&apos;s secure storage
            and never leaves your computer. All scanning happens locally.
          </p>
        </div>
      </div>

      {/* Flagged emails */}
      {emailAlerts.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-haven-text">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Flagged emails ({emailAlerts.length})
          </h2>
          <div className="max-h-[28rem] overflow-y-auto space-y-2 pr-1">
            {emailAlerts.map((alert) => {
              // Extract details from alert — the agent puts rich info in details
              const details = typeof alert.details === 'string'
                ? null
                : (alert.details as any);
              const subject = details?.subject || alert.description.replace('Suspicious email: ', '');
              const fromEmail = details?.from_email;
              const fromName = details?.from_name;
              const reasons = details?.reasons as string[] | undefined;
              const recommendation = details?.recommendation;
              const riskScore = details?.risk_score;

              const severityColor = alert.severity === 'critical'
                ? 'border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5'
                : 'border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/5';

              return (
                <div key={alert.id} className={`card ${severityColor} p-4`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-haven-text">{subject}</p>
                      {(fromName || fromEmail) && (
                        <p className="mt-1 text-xs text-haven-text-secondary">
                          From: {fromName ? `${fromName} ` : ''}{fromEmail ? `<${fromEmail}>` : ''}
                        </p>
                      )}
                      {reasons && reasons.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {reasons.slice(0, 3).map((reason, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-haven-text-secondary">
                              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                              {reason}
                            </li>
                          ))}
                        </ul>
                      )}
                      {recommendation && (
                        <p className="mt-2 text-xs font-medium text-haven-text-secondary">
                          {recommendation}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-3 text-xs text-haven-text-tertiary">
                        <span>{timeAgo(alert.timestamp)}</span>
                        {riskScore != null && (
                          <span className={riskScore >= 0.6 ? 'text-red-500' : 'text-amber-500'}>
                            Risk: {Math.round(riskScore * 100)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => askAboutAlert(alert)}
                      className="shrink-0 p-1.5 text-haven-text-tertiary transition hover:text-blue-500"
                      title="Ask about this email"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Connected + no alerts */}
      {isConnected && emailAlerts.length === 0 && (
        <div className="card p-6 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-green-500" />
          <p className="mt-3 text-sm font-semibold text-haven-text">Inbox looks clean</p>
          <p className="mt-1 text-xs text-haven-text-secondary">
            We&apos;re scanning your inbox every 20 seconds. We&apos;ll alert you if anything looks suspicious.
          </p>
        </div>
      )}

      {/* Connected account info */}
      {isDesktopRuntime && isConnected && !showSetup && (
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-haven-text">
                  {emailConnection.email || 'Email account connected'}
                </p>
                <p className="text-xs text-haven-text-tertiary">
                  {emailConnection.providerName
                    ? `${emailConnection.providerName} account`
                    : 'Scanning inbox every 20 seconds'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSetup(true)}
              className="text-xs font-medium text-blue-500 transition hover:text-blue-600"
            >
              Switch account
            </button>
          </div>
        </div>
      )}

      {/* Setup form — show when not connected OR when switching */}
      {isDesktopRuntime && (!isConnected || showSetup) && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="mb-1 text-base font-semibold text-haven-text">
                {showSetup && isConnected ? 'Switch email account' : 'Connect your email'}
              </h2>
              <p className="text-sm text-haven-text-secondary">
                HavenAI needs an app-specific password to scan your inbox. This is different from your regular password.
              </p>
            </div>
            {showSetup && isConnected && (
              <button
                onClick={() => setShowSetup(false)}
                className="text-xs font-medium text-haven-text-tertiary transition hover:text-haven-text"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="space-y-5 max-w-md">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-haven-text-secondary">
                Email address
              </label>
              <input
                type="email"
                value={emailAddress}
                onChange={(e) => { setEmailAddress(e.target.value); if (emailConnection.status === 'error') setEmailDisconnected(); }}
                placeholder="you@gmail.com"
                className="input-field"
              />
            </div>

            {provider && (
              <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 p-4">
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-3">
                  How to get your {provider.name} app password:
                </p>
                <ol className="space-y-2">
                  {provider.steps.map((step, i) => (
                    <li key={i} className="flex gap-2.5 text-xs text-blue-600 dark:text-blue-300">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-200 dark:bg-blue-500/20 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                        {i + 1}
                      </span>
                      <span className="pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
                <a
                  href={provider.instructionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Open {provider.name} settings
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            {emailAddress.includes('@') && !provider && (
              <div className="space-y-3">
                <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-3">
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    We don&apos;t have automatic setup for this provider. You&apos;ll need to enter your IMAP settings manually.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="mb-1.5 block text-sm font-medium text-haven-text-secondary">IMAP host</label>
                    <input type="text" value={manualHost} onChange={(e) => setManualHost(e.target.value)} placeholder="imap.example.com" className="input-field" />
                  </div>
                  <div className="w-24">
                    <label className="mb-1.5 block text-sm font-medium text-haven-text-secondary">Port</label>
                    <input type="text" value={manualPort} onChange={(e) => setManualPort(e.target.value)} className="input-field" />
                  </div>
                </div>
              </div>
            )}

            {(provider || (emailAddress.includes('@') && manualHost)) && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-haven-text-secondary">App password</label>
                <input
                  type="password"
                  value={appPassword}
                  onChange={(e) => setAppPassword(e.target.value)}
                  placeholder={provider ? `Paste your ${provider.name} app password` : 'Paste your app-specific password'}
                  className="input-field"
                />
                <p className="mt-1.5 text-xs text-haven-text-tertiary">
                  This is a special password generated by your email provider, not your regular login password.
                </p>
              </div>
            )}

            {(provider || manualHost) && (
              <button
                type="button"
                onClick={handleConnect}
                disabled={testStatus === 'testing' || !emailAddress || !appPassword}
                className="btn-primary w-full disabled:opacity-50"
              >
                {testStatus === 'testing' ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Testing connection...</>
                ) : (
                  'Connect email'
                )}
              </button>
            )}

            {testStatus === 'error' && emailConnection.message && (
              <div className="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-3">
                <p className="text-xs text-red-600 dark:text-red-400">{emailConnection.message}</p>
                <p className="mt-1.5 text-xs text-red-500 dark:text-red-300">
                  Common fixes: Make sure you&apos;re using an app password (not your regular password),
                  and that IMAP access is enabled in your email settings.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {!isDesktopRuntime && !isConnected && (
        <div className="card p-6 text-center">
          <ShieldLock className="mx-auto h-8 w-8 text-haven-text-tertiary" />
          <p className="mt-3 text-sm font-medium text-haven-text">Desktop app required</p>
          <p className="mt-1 text-xs text-haven-text-secondary">
            Email monitoring requires the HavenAI desktop app to scan your inbox locally and securely.
          </p>
        </div>
      )}
    </div>
  );
}
