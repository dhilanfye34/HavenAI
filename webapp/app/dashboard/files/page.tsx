'use client';

import { useMemo } from 'react';
import { CheckCircle2, FileSearch, FileWarning, MessageCircle } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';

function timeAgo(timestamp?: number): string {
  if (!timestamp) return 'Unknown';
  const diff = Date.now() - timestamp * 1000;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function friendlyEventType(type?: string): string {
  if (!type) return 'Changed';
  const t = type.toLowerCase();
  if (t.includes('create') || t.includes('new')) return 'Created';
  if (t.includes('modif') || t.includes('change') || t.includes('write')) return 'Modified';
  if (t.includes('delet') || t.includes('remov')) return 'Deleted';
  if (t.includes('rename') || t.includes('move')) return 'Renamed';
  return 'Changed';
}

export default function FilesPage() {
  const { runtimeStatus, preferences, alerts, chatSendMessage } = useDashboard();
  const fileEnabled = Boolean(preferences?.file_monitoring_enabled);
  const details = runtimeStatus?.module_details;
  const metrics = runtimeStatus?.metrics;

  const recentEvents = useMemo(() => {
    return (details?.file.recent_events || [])
      .slice()
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, 20);
  }, [details]);

  const fileAlerts = alerts.filter(
    (a) => a.source.toLowerCase().includes('file') && a.severity !== 'info',
  );
  const eventCount = metrics?.file_events_seen || details?.file.event_count || 0;

  const askAboutFile = (filename: string, eventType: string) => {
    chatSendMessage(`Tell me about this file change: "${filename}" was ${eventType.toLowerCase()}. Is this normal? Should I be concerned?`);
  };

  const askAboutAlert = (description: string) => {
    chatSendMessage(`Tell me more about this file alert: "${description}". What should I do?`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-haven-text">Files</h1>
        <p className="mt-1 text-sm text-haven-text-secondary">
          We watch your important files for unauthorized changes.
        </p>
      </div>

      {/* Status */}
      <div className="card p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${fileEnabled ? 'bg-green-500/10' : 'bg-gray-100 dark:bg-gray-800'}`}>
            <FileSearch className={`h-5 w-5 ${fileEnabled ? 'text-green-500' : 'text-haven-text-tertiary'}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-haven-text">
              File protection is {fileEnabled ? 'active' : 'off'}
            </p>
            <p className="text-xs text-haven-text-tertiary">
              {fileEnabled
                ? `${eventCount.toLocaleString()} file changes detected`
                : 'Turn on file monitoring in Settings'}
            </p>
          </div>
        </div>
        <span className={fileEnabled ? 'status-dot-safe' : 'status-dot-inactive'} />
      </div>

      {/* Flagged */}
      {fileAlerts.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-haven-text">
            <FileWarning className="h-4 w-4 text-amber-500" />
            Flagged changes ({fileAlerts.length})
          </h2>
          <div className="space-y-2">
            {fileAlerts.map((alert) => (
              <div
                key={alert.id}
                className="card border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/5 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-haven-text">{alert.description}</p>
                    <p className="mt-1 text-xs text-haven-text-tertiary">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => askAboutAlert(alert.description)}
                    className="shrink-0 p-1.5 text-haven-text-tertiary transition hover:text-blue-500"
                    title="Ask about this alert"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-haven-text">Recent activity</h2>
        {recentEvents.length > 0 ? (
          <div className="card divide-y" style={{ borderColor: 'var(--haven-border)' }}>
            {recentEvents.map((event, idx) => {
              const filename = event.filename || event.path?.split('/').pop() || 'Unknown file';
              const eventType = friendlyEventType(event.type);
              return (
                <div key={`${event.path}-${idx}`} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-haven-text truncate">
                      {filename}
                    </p>
                    <p className="text-xs text-haven-text-tertiary">
                      {eventType}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => askAboutFile(filename, eventType)}
                      className="p-1.5 text-haven-text-tertiary transition hover:text-blue-500"
                      title="Ask about this file"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </button>
                    <span className="text-xs text-haven-text-tertiary">
                      {timeAgo(event.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card p-6 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-green-500" />
            <p className="mt-3 text-sm text-haven-text-secondary">
              {fileEnabled
                ? 'No file activity detected yet. Check back soon.'
                : 'Enable file monitoring to see changes.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
