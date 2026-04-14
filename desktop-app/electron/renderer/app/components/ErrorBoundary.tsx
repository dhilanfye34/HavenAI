'use client';

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('HavenAI renderer crashed:', error, info);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  reload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-haven-bg px-6">
        <div className="max-w-md rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-6 text-center">
          <h1 className="text-lg font-semibold text-haven-text">Something went wrong</h1>
          <p className="mt-2 text-sm text-haven-text-secondary">
            HavenAI hit an unexpected error. Your monitoring is still running in the background.
            Reload the window to get back in.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <button
              onClick={this.reset}
              className="rounded-lg border border-white/[0.12] px-4 py-2 text-sm font-medium text-haven-text transition hover:bg-white/[0.05]"
            >
              Try again
            </button>
            <button
              onClick={this.reload}
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
