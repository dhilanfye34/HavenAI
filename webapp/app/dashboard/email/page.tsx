'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Inbox,
  Loader2,
  Lock,
  Mail,
  MessageCircle,
  Paperclip,
  ShieldCheck,
  TrendingUp,
  Unplug,
  X,
} from 'lucide-react';
import ShieldLock from '../../components/ShieldLock';
import { useDashboard } from '../context/DashboardContext';
import { timeAgo } from '../lib/timeAgo';

interface ProviderInfo {
  name: string;
  imapHost: string;
  imapPort: number;
  instructionsUrl: string;
  steps: string[];
  warning?: string;
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
    warning:
      'Microsoft has disabled app-password IMAP for most personal Outlook/Hotmail/Live accounts. Connecting may fail — if it does, the account type isn\u2019t supported yet. Business Microsoft 365 tenants that explicitly allow IMAP still work.',
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
    warning:
      'Microsoft has disabled app-password IMAP for most personal Outlook/Hotmail/Live accounts. Connecting may fail — if it does, the account type isn\u2019t supported yet. Business Microsoft 365 tenants that explicitly allow IMAP still work.',
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
    warning:
      'Microsoft has disabled app-password IMAP for most personal Outlook/Hotmail/Live accounts. Connecting may fail — if it does, the account type isn\u2019t supported yet. Business Microsoft 365 tenants that explicitly allow IMAP still work.',
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

export default function EmailPage() {
  const {
    preferences, isDesktopRuntime, runtimeStatus, alerts, chatSendMessage, safelist,
    emailConnection, setEmailConnected, setEmailDisconnected, setEmailTesting, setEmailError,
    user,
  } = useDashboard();

  // Reconcile the locally-stored email connection state with the real agent
  // health so we don't keep saying "Active" after credentials break.
  const emailHealth = runtimeStatus?.module_details?.email;
  const hasRuntimeSignal = Boolean(emailHealth);
  const agentReportsEnabled = Boolean(emailHealth?.enabled);
  const lastScanSecs = emailHealth?.last_scan_at || null;
  const lastSuccessSecs = emailHealth?.last_successful_scan_at || null;
  const consecutiveFailures = emailHealth?.consecutive_failures ?? 0;
  const runtimeError = emailHealth?.last_error || null;

  // "Healthy" = local state says connected AND either agent confirms it's
  // enabled with no consecutive failures, or we have no runtime signal yet
  // (initial load / browser mode fallback to trust local state).
  const isHealthy =
    emailConnection.status === 'connected' &&
    (!hasRuntimeSignal || (agentReportsEnabled && consecutiveFailures < 3));
  const isConnected = isHealthy;
  // Error state: local state says connected but runtime shows repeated failures
  const hasBrokenCreds =
    emailConnection.status === 'connected' &&
    hasRuntimeSignal &&
    consecutiveFailures >= 3 &&
    Boolean(runtimeError);

  // Freshness label
  const lastSuccessfulAt = lastSuccessSecs ? new Date(lastSuccessSecs * 1000).toISOString() : null;
  const lastScanAt = lastScanSecs ? new Date(lastScanSecs * 1000).toISOString() : null;
  const totalScanned = emailHealth?.total_scanned ?? 0;

  const [emailAddress, setEmailAddress] = useState(emailConnection.email || '');
  const [appPassword, setAppPassword] = useState('');
  const [manualHost, setManualHost] = useState('');
  const [manualPort, setManualPort] = useState('993');
  const [showSetup, setShowSetup] = useState(false);
  // Which email row is currently expanded in the detail modal (null = closed)
  const [openEmailId, setOpenEmailId] = useState<string | null>(null);

  const testStatus = emailConnection.status === 'connected' ? 'success'
    : emailConnection.status === 'testing' ? 'testing'
    : emailConnection.status === 'error' ? 'error'
    : 'idle';

  const provider = detectProvider(emailAddress);

  // Deduplicate email alerts by subject+timestamp (agent can re-send same alert)
  const allEmailAlerts = useMemo(() => {
    const raw = alerts.filter(
      (a) => (a.source.toLowerCase().includes('email') || a.description.toLowerCase().includes('email'))
        && a.severity !== 'info',
    );
    const seen = new Set<string>();
    return raw.filter((a) => {
      // Prefer the IMAP Message-ID from the alert details (unique per message).
      // Fall back to subject+sender, and finally the full description, so
      // different emails with identical subjects from different senders
      // aren't collapsed together.
      const details = typeof a.details === 'string' ? null : (a.details as any);
      const key =
        details?.message_id ||
        (details?.subject && details?.from_email
          ? `${details.subject}::${details.from_email}`
          : a.description);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [alerts]);

  const emailAlerts = allEmailAlerts.filter((a) => !safelist.isSafe('emails', a.id));
  const reviewedEmails = allEmailAlerts.filter((a) => safelist.isSafe('emails', a.id));

  // Recent inbox activity — every scanned message with its risk score, not
  // just the flagged ones. Agent sends up to 30.
  const recentEmails = emailHealth?.recent_emails ?? [];

  // Summary stats for the strip above the activity feed.
  const now24h = Date.now() - 86_400_000;
  const scoredSafe = recentEmails.filter((e) => (e.risk_score ?? 0) < 0.5).length;
  const scoredSuspicious = recentEmails.filter((e) => (e.risk_score ?? 0) >= 0.5).length;
  const scanned24h = recentEmails.filter((e) => {
    if (!e.received_at) return false;
    const ts = Date.parse(e.received_at);
    return Number.isFinite(ts) && ts >= now24h;
  }).length;

  const openEmail = useMemo(() => {
    if (!openEmailId) return null;
    return recentEmails.find((e) => (e.message_id || e.uid) === openEmailId) || null;
  }, [openEmailId, recentEmails]);

  const riskTone = (score: number | undefined) => {
    const s = score ?? 0;
    if (s >= 0.7) return { label: 'High risk', dot: 'bg-red-500', text: 'text-red-500' };
    if (s >= 0.5) return { label: 'Suspicious', dot: 'bg-amber-500', text: 'text-amber-500' };
    if (s >= 0.3) return { label: 'Low concern', dot: 'bg-blue-500', text: 'text-blue-500' };
    return { label: 'Clean', dot: 'bg-emerald-500', text: 'text-emerald-500' };
  };

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

    // Remove any stale listeners before adding a new one
    havenai.removeAllListeners?.('email-config-result');
    havenai.onEmailConfigResult?.((result: any) => {
      havenai.removeAllListeners?.('email-config-result');
      if (result?.success) {
        setEmailConnected(emailAddress, provider?.name || '', result.message || 'Connected successfully!');
        setAppPassword('');
        setShowSetup(false);
      } else {
        setEmailError(result?.message || 'Connection failed. Check your credentials and try again.');
      }
    });
    havenai.configureEmailMonitor({ email: emailAddress, password: appPassword, imapHost, imapPort });
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
      <div className={`card p-5 flex items-center justify-between ${hasBrokenCreds ? 'border-red-300 dark:border-red-500/30 bg-red-50/50 dark:bg-red-500/5' : ''}`}>
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            hasBrokenCreds
              ? 'bg-red-500/10'
              : isConnected
              ? 'bg-green-500/10'
              : 'bg-gray-100 dark:bg-gray-800'
          }`}>
            <Mail className={`h-5 w-5 ${
              hasBrokenCreds
                ? 'text-red-500'
                : isConnected
                ? 'text-green-500'
                : 'text-haven-text-tertiary'
            }`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-haven-text">
              {hasBrokenCreds
                ? 'Email monitoring has stopped'
                : isConnected
                ? 'Email monitoring is active'
                : 'Email monitoring is not connected'}
            </p>
            <p className="text-xs text-haven-text-tertiary">
              {hasBrokenCreds
                ? (runtimeError || 'We can\u2019t reach your inbox. Reconnect with a fresh app password.')
                : isConnected
                ? `Connected to ${emailConnection.providerName || 'your email'}${emailConnection.email ? ` (${emailConnection.email})` : ''}`
                : 'Connect your email to scan for threats'}
            </p>
            {isConnected && !hasBrokenCreds && (lastSuccessfulAt || totalScanned > 0) && (
              <p className="mt-1 text-[11px] text-haven-text-tertiary">
                {lastSuccessfulAt ? `Last scan ${timeAgo(lastSuccessfulAt)}` : 'Waiting for first scan'}
                {totalScanned > 0 && ` · ${totalScanned.toLocaleString()} message${totalScanned === 1 ? '' : 's'} scanned`}
              </p>
            )}
          </div>
        </div>
        {(isConnected || hasBrokenCreds) ? (
          <div className="flex items-center gap-2">
            {hasBrokenCreds && (
              <button
                onClick={() => setShowSetup(true)}
                className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-600"
              >
                Reconnect
              </button>
            )}
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-50 dark:hover:bg-red-500/10"
            >
              <Unplug className="h-3.5 w-3.5" />
              Disconnect
            </button>
          </div>
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
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <button
                        onClick={() => askAboutAlert(alert)}
                        className="p-1.5 text-haven-text-tertiary transition hover:text-blue-500"
                        title="Ask about this email"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => safelist.markSafe('emails', alert.id)}
                        className="p-1.5 text-haven-text-tertiary transition hover:text-green-500"
                        title="Not suspicious"
                      >
                        <ShieldCheck className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reviewed emails */}
      {reviewedEmails.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-haven-text">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Reviewed ({reviewedEmails.length})
          </h2>
          <div className="max-h-[16rem] overflow-y-auto space-y-2 pr-1 opacity-60">
            {reviewedEmails.map((alert) => {
              const details = typeof alert.details === 'string' ? null : (alert.details as any);
              const subject = details?.subject || alert.description.replace('Suspicious email: ', '');
              return (
                <div key={alert.id} className="card p-4">
                  <p className="text-sm font-medium text-haven-text">
                    {subject}
                    <span className="ml-1.5 text-xs text-green-600 dark:text-green-400">(not suspicious)</span>
                  </p>
                  <p className="mt-1 text-xs text-haven-text-tertiary">{timeAgo(alert.timestamp)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Connected + no alerts */}
      {isConnected && emailAlerts.length === 0 && reviewedEmails.length === 0 && (
        <div className="card p-6 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-green-500" />
          <p className="mt-3 text-sm font-semibold text-haven-text">Inbox looks clean</p>
          <p className="mt-1 text-xs text-haven-text-secondary">
            {lastSuccessfulAt
              ? `Last checked ${timeAgo(lastSuccessfulAt)}. We\u2019ll alert you if anything looks suspicious.`
              : 'We\u2019re scanning your inbox every 20 seconds. We\u2019ll alert you if anything looks suspicious.'}
          </p>
          {totalScanned > 0 && (
            <p className="mt-2 text-[11px] text-haven-text-tertiary">
              {totalScanned.toLocaleString()} message{totalScanned === 1 ? '' : 's'} scanned since connecting
            </p>
          )}
        </div>
      )}

      {/* Connected account info */}
      {isDesktopRuntime && isConnected && !showSetup && (
        <div className="card p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-haven-text truncate">
                  {emailConnection.email || 'Email account connected'}
                </p>
                <p className="text-xs text-haven-text-tertiary">
                  {emailConnection.providerName
                    ? `${emailConnection.providerName} account \u00b7 scanning every 20s`
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
          {user?.email && (
            <div className="mt-3 border-t pt-3 text-[11px] text-haven-text-tertiary" style={{ borderColor: 'var(--haven-border)' }}>
              Linked to your HavenAI account:{' '}
              <span className="font-medium text-haven-text-secondary">
                {user.full_name ? `${user.full_name} (${user.email})` : user.email}
              </span>
              <span className="ml-2">{'\u00b7 alerts are sent here'}</span>
            </div>
          )}
        </div>
      )}

      {/* Stats strip — quick numbers for the inbox scanner */}
      {isDesktopRuntime && isConnected && !showSetup && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="card p-4">
            <div className="flex items-center gap-2 text-xs text-haven-text-tertiary">
              <Inbox className="h-3.5 w-3.5" />
              Total scanned
            </div>
            <p className="mt-1 text-xl font-semibold text-haven-text">{totalScanned.toLocaleString()}</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 text-xs text-haven-text-tertiary">
              <TrendingUp className="h-3.5 w-3.5" />
              Last 24h
            </div>
            <p className="mt-1 text-xl font-semibold text-haven-text">{scanned24h}</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 text-xs text-haven-text-tertiary">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              Suspicious
            </div>
            <p className="mt-1 text-xl font-semibold text-amber-500">{scoredSuspicious}</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 text-xs text-haven-text-tertiary">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Looks clean
            </div>
            <p className="mt-1 text-xl font-semibold text-emerald-500">{scoredSafe}</p>
          </div>
        </div>
      )}

      {/* Recent inbox activity — timeline of everything scanned, not just flagged */}
      {isDesktopRuntime && isConnected && !showSetup && recentEmails.length > 0 && (
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-haven-text">
              <Clock className="h-4 w-4 text-blue-500" />
              Recent inbox activity
            </h2>
            <span className="text-xs text-haven-text-tertiary">
              {`${recentEmails.length} message${recentEmails.length === 1 ? '' : 's'} \u00b7 last 30`}
            </span>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--haven-border)' }}>
            {[...recentEmails]
              .sort((a, b) => {
                const ta = a.received_at ? Date.parse(a.received_at) : 0;
                const tb = b.received_at ? Date.parse(b.received_at) : 0;
                return tb - ta;
              })
              .map((email) => {
                const tone = riskTone(email.risk_score);
                const key = email.message_id || email.uid || `${email.from_email}:${email.subject}`;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setOpenEmailId(key)}
                    className="flex w-full items-start gap-3 py-3 text-left transition hover:bg-haven-surface-hover -mx-3 px-3 rounded-lg"
                  >
                    <span className={`mt-1 inline-block h-2 w-2 flex-shrink-0 rounded-full ${tone.dot}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-haven-text truncate">
                          {email.subject || '(no subject)'}
                        </p>
                        {email.has_attachments && (
                          <Paperclip className="h-3 w-3 flex-shrink-0 text-haven-text-tertiary" />
                        )}
                      </div>
                      <p className="text-xs text-haven-text-tertiary truncate">
                        {email.from_name || email.from_email || 'Unknown sender'}
                        {email.from_name && email.from_email ? ` \u00b7 ${email.from_email}` : ''}
                      </p>
                      {email.snippet && (
                        <p className="mt-1 text-xs text-haven-text-tertiary/80 line-clamp-1">
                          {email.snippet}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 text-[11px] text-haven-text-tertiary">
                      {email.received_at && (
                        <span>{timeAgo(new Date(email.received_at).toISOString())}</span>
                      )}
                      <span className={`font-medium ${tone.text}`}>{tone.label}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 mt-1 flex-shrink-0 text-haven-text-tertiary" />
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Detail modal for a selected email */}
      {openEmail && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={() => setOpenEmailId(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="card w-full max-w-xl p-6 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-haven-text-tertiary uppercase tracking-wide">
                  Scanned email
                </p>
                <h3 className="mt-0.5 text-base font-semibold text-haven-text">
                  {openEmail.subject || '(no subject)'}
                </h3>
              </div>
              <button
                onClick={() => setOpenEmailId(null)}
                className="rounded-lg p-1 text-haven-text-tertiary transition hover:bg-haven-surface-hover"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <dl className="grid grid-cols-[96px_1fr] gap-y-2 gap-x-3 text-xs">
              <dt className="text-haven-text-tertiary">From</dt>
              <dd className="text-haven-text break-all">
                {openEmail.from_name
                  ? `${openEmail.from_name} <${openEmail.from_email}>`
                  : openEmail.from_email || 'Unknown'}
              </dd>
              <dt className="text-haven-text-tertiary">Received</dt>
              <dd className="text-haven-text">
                {openEmail.received_at
                  ? new Date(openEmail.received_at).toLocaleString()
                  : 'Unknown'}
              </dd>
              <dt className="text-haven-text-tertiary">Risk score</dt>
              <dd className={`font-medium ${riskTone(openEmail.risk_score).text}`}>
                {`${(openEmail.risk_score ?? 0).toFixed(2)} \u00b7 ${riskTone(openEmail.risk_score).label}`}
              </dd>
              {openEmail.has_attachments && (
                <>
                  <dt className="text-haven-text-tertiary">Attachments</dt>
                  <dd className="text-haven-text">Yes</dd>
                </>
              )}
            </dl>

            {openEmail.reasons && openEmail.reasons.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-haven-text mb-1.5">Why this score</p>
                <ul className="space-y-1 text-xs text-haven-text-secondary">
                  {openEmail.reasons.map((r, i) => (
                    <li key={i} className="flex gap-1.5">
                      <span className="text-haven-text-tertiary">{'\u2022'}</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {openEmail.snippet && (
              <div className="mt-4">
                <p className="text-xs font-medium text-haven-text mb-1.5">Preview</p>
                <div className="rounded-lg border p-3 text-xs text-haven-text-secondary whitespace-pre-wrap break-words" style={{ borderColor: 'var(--haven-border)', background: 'var(--haven-surface)' }}>
                  {openEmail.snippet}
                </div>
                <p className="mt-1.5 text-[11px] text-haven-text-tertiary">
                  HavenAI only stores a short preview. Open the message in your email app for the full content.
                </p>
              </div>
            )}

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => {
                  chatSendMessage(
                    `Tell me about this email: "${openEmail.subject}" from ${openEmail.from_email}. Risk score ${(openEmail.risk_score ?? 0).toFixed(2)}. Should I be worried?`,
                  );
                  setOpenEmailId(null);
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-500 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-600"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Ask in chat
              </button>
              <button
                onClick={() => setOpenEmailId(null)}
                className="rounded-lg border px-3 py-2 text-xs font-medium text-haven-text-secondary transition hover:bg-haven-surface-hover"
                style={{ borderColor: 'var(--haven-border)' }}
              >
                Close
              </button>
            </div>
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

            {provider?.warning && (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-3">
                <div className="flex gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">{provider.warning}</p>
                </div>
              </div>
            )}

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
