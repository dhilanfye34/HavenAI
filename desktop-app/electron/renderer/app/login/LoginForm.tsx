'use client';

import { useState, useEffect } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';
import ShieldLock from '../components/ShieldLock';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const WEB_DASHBOARD_URL =
  process.env.NEXT_PUBLIC_WEB_URL || 'https://havenai.ai/dashboard/settings';

export interface LoginFormProps {
  // When present, the login page is in LOGIN_DEVICE_CONFLICT — show the rich
  // banner with web-dashboard + support actions. When null, regular login.
  deviceConflictMessage?: string | null;
  onLoginSuccess?: () => void;
}

export default function LoginForm({
  deviceConflictMessage,
  onLoginSuccess,
}: LoginFormProps = {}) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [conflictMessage, setConflictMessage] = useState<string | null>(
    deviceConflictMessage ?? null,
  );

  // Keep local conflict state in sync with the parent prop — the state hook
  // resets it on successful login.
  useEffect(() => {
    setConflictMessage(deviceConflictMessage ?? null);
  }, [deviceConflictMessage]);

  useEffect(() => {
    const havenai = (window as any).havenai;
    if (havenai?.onDeviceLinkedError) {
      havenai.onDeviceLinkedError((message: string) => {
        setLoading(false);
        setConflictMessage(message || 'This device is linked to another account.');
      });
    }
    return () => {
      if (havenai?.removeAllListeners) {
        havenai.removeAllListeners('device-linked-error');
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const body = isLogin ? { email, password } : { email, password, full_name: fullName };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        const detail = data.detail;
        const message =
          typeof detail === 'string'
            ? detail
            : Array.isArray(detail)
            ? detail.map((d: any) => d.msg || d.message || JSON.stringify(d)).join('. ')
            : 'Something went wrong';
        throw new Error(message);
      }

      const data = await response.json();
      if (!data.access_token) throw new Error('No access token received');

      const havenai = (window as any).havenai;
      // electron-store is authoritative; localStorage is a read-through
      // mirror so the shared webapp dashboard code (which reads localStorage
      // directly) continues to work without an IPC round-trip.
      if (havenai?.saveCredentials) {
        await havenai.saveCredentials({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          user: data.user,
        });
      }
      try {
        localStorage.setItem('access_token', data.access_token);
        if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
        if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
      } catch {
        /* ignore quota errors */
      }
      if (havenai?.syncAgentAuth) {
        await havenai.syncAgentAuth({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          user: data.user,
        });
      }

      setConflictMessage(null);
      onLoginSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-haven-bg px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <ShieldLock className="h-12 w-12 text-blue-500" />
          <span className="text-2xl font-bold tracking-tight text-haven-text">HavenAI</span>
          <p className="text-sm text-haven-text-tertiary">Connect your HavenAI account</p>
        </div>

        <div className="card p-8">
          <h2 className="mb-6 text-center text-xl font-bold text-haven-text">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h2>

          {conflictMessage && (
            <div className="mb-6 rounded-xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium">{conflictMessage}</p>
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300/80">
                If you own the other account, sign in on the web and unlink this device. Otherwise,
                get in touch and we&apos;ll help sort it out.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const havenai = (window as any).havenai;
                    if (havenai?.openExternal) {
                      havenai.openExternal(WEB_DASHBOARD_URL);
                    } else {
                      window.open(WEB_DASHBOARD_URL, '_blank', 'noopener');
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-amber-600"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open web dashboard to unlink
                </button>
                <a
                  href="mailto:support@havenai.ai?subject=Device%20linked%20to%20another%20account"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-200 transition hover:bg-amber-100 dark:hover:bg-amber-500/10"
                >
                  Contact support
                </a>
              </div>
            </div>
          )}

          {error && !conflictMessage && (
            <div className="mb-6 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-haven-text-secondary">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-field"
                  placeholder="John Doe"
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-haven-text-secondary">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-field"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-haven-text-secondary">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input-field"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary mt-2 w-full disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isLogin ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-sm text-blue-500 transition hover:text-blue-600"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
