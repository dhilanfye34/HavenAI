'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import ShieldLock from '../components/ShieldLock';
import { apiUrl } from '../lib/apiConfig';

export interface LoginFormProps {
  onLoginSuccess?: () => void;
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps = {}) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // Device-linked-error is handled globally by the root state machine
  // (useAppState). When it fires it transitions us to the dedicated
  // DeviceConflictScreen — no banner needed here.

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const body = isLogin ? { email, password } : { email, password, full_name: fullName };

      const response = await fetch(apiUrl(endpoint), {
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

      onLoginSuccess?.();
    } catch (err: any) {
      setError(
        err instanceof TypeError
          ? 'Cannot reach HavenAI backend. Check your internet connection and try again.'
          : err.message || 'Failed to fetch',
      );
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

          {error && (
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
