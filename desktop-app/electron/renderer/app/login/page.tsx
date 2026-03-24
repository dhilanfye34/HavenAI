'use client';

import { useState } from 'react';
import { Shield, Loader2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

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
        throw new Error(data.detail || 'Something went wrong');
      }

      const data = await response.json();
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      localStorage.setItem('user', JSON.stringify(data.user));

      const havenai = (window as any).havenai;
      if (havenai?.saveCredentials) {
        await havenai.saveCredentials({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          user: data.user,
        });
      }
      if (havenai?.syncAgentAuth) {
        await havenai.syncAgentAuth({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          user: data.user,
        });
      }

      // Reload so page.tsx detects the token and renders the dashboard.
      // router.push('/') breaks on file:// protocol in packaged Electron.
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="bg-gradient-mesh-animated absolute inset-0 -z-10" />
      <div className="bg-dot-pattern absolute inset-0 -z-10 opacity-30" />

      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Shield className="h-12 w-12 text-cyan-400" />
          <span className="text-2xl font-bold tracking-tight text-white">HavenAI</span>
          <p className="text-sm text-gray-500">Connect your HavenAI account</p>
        </div>

        <div className="glass-card p-8">
          <h2 className="mb-6 text-center text-xl font-bold text-white">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h2>

          {error && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-400">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="glass-input"
                  placeholder="John Doe"
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-400">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="glass-input"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-400">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="glass-input"
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
              className="text-sm text-cyan-400 transition hover:text-cyan-300"
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
