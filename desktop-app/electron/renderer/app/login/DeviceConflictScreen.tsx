'use client';

import { ArrowLeft, ExternalLink, Lock } from 'lucide-react';
import ShieldLock from '../components/ShieldLock';

const WEB_DASHBOARD_URL =
  process.env.NEXT_PUBLIC_WEB_URL || 'https://havenai.ai/dashboard/settings';

interface Props {
  message?: string | null;
  onBackToLogin: () => void;
}

/**
 * Shown when the backend returned a 409 because this device is already
 * linked to a different account. The user can't proceed with a new sign-in
 * until someone unlinks — either by logging into the other account on the
 * web dashboard, or (rarely) by contacting support.
 */
export default function DeviceConflictScreen({ message, onBackToLogin }: Props) {
  const headline = message || 'This device is already linked to another HavenAI account.';

  const openWebDashboard = () => {
    const havenai = (window as any).havenai;
    if (havenai?.openExternal) {
      havenai.openExternal(WEB_DASHBOARD_URL);
    } else {
      window.open(WEB_DASHBOARD_URL, '_blank', 'noopener');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-haven-bg px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <ShieldLock className="h-12 w-12 text-blue-500" />
          <span className="text-2xl font-bold tracking-tight text-haven-text">HavenAI</span>
        </div>

        <div className="card p-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10">
            <Lock className="h-7 w-7 text-amber-500" />
          </div>

          <h1 className="text-lg font-semibold text-haven-text">Device already linked</h1>
          <p className="mt-2 text-sm text-haven-text-secondary">{headline}</p>
          <p className="mt-3 text-xs text-haven-text-tertiary leading-relaxed">
            HavenAI only allows one account per device. To use this Mac with a different
            account, the current owner needs to sign in on the web and unlink it from
            their Settings.
          </p>

          <div className="mt-6 space-y-2">
            <button
              onClick={openWebDashboard}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-amber-600"
            >
              <ExternalLink className="h-4 w-4" />
              Open web dashboard to unlink
            </button>
            <a
              href="mailto:support@havenai.ai?subject=Device%20linked%20to%20another%20account"
              className="inline-flex w-full items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-medium text-haven-text-secondary transition hover:bg-haven-surface-hover"
              style={{ borderColor: 'var(--haven-border)' }}
            >
              Contact support
            </a>
            <button
              onClick={onBackToLogin}
              className="inline-flex w-full items-center justify-center gap-2 pt-2 text-sm text-haven-text-tertiary transition hover:text-haven-text"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-haven-text-tertiary">
          Already unlinked?{' '}
          <button
            onClick={onBackToLogin}
            className="text-blue-500 underline-offset-2 hover:underline"
          >
            Try signing in again
          </button>
          .
        </p>
      </div>
    </div>
  );
}
