'use client';

import { useMemo } from 'react';
import { CheckCircle2, FileSearch, FileWarning, MessageCircle, ShieldCheck } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import { useNavigate } from '../context/NavigationContext';
import { timeAgo } from '../lib/timeAgo';

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
  const { runtimeStatus, preferences, alerts, chatSendMessage, safelist, isDesktopRuntime } = useDashboard();
  const navigate = useNavigate();
  const fileEnabled = Boolean(preferences?.file_monitoring_enabled);
  const details = runtimeStatus?.module_details;
  const metrics = runtimeStatus?.metrics;
  const hasLiveData = Boolean(details?.file.recent_events?.length);

  const recentEvents = useMemo(() => {
    return (details?.file.recent_events || [])
      .slice()
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, 20);
  }, [details]);

  const allFileAlerts = alerts.filter(
    (a) => a.source.toLowerCase().includes('file') && a.severity !== 'info',
  );
  const fileAlerts = allFileAlerts.filter((a) => !safelist.isSafe('files', a.id));
  const reviewedFileAlerts = allFileAlerts.filter((a) => safelist.isSafe('files', a.id));
  const eventCount = metrics?.file_events_seen || details?.file.event_count || 0;

  const askAboutFile = (filename: string, eventType: string) => {
    chatSendMessage(`Tell me about this file change: "${filename}" was ${eventType.toLowerCase()}. Is this normal? Should I be concerned?`);
    navigate('/dashboard/chat');
  };

  const askAboutAlert = (description: string) => {
    chatSendMessage(`Tell me more about this file alert: "${description}". What should I do?`);
    navigate('/dashboard/chat');
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
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => askAboutAlert(alert.description)}
                      className="p-1.5 text-haven-text-tertiary transition hover:text-blue-500"
                      title="Ask about this alert"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => safelist.markSafe('files', alert.id)}
                      className="p-1.5 text-haven-text-tertiary transition hover:text-green-500"
                      title="Mark as reviewed"
                    >
                      <ShieldCheck className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviewed */}
      {reviewedFileAlerts.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-haven-text">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Reviewed ({reviewedFileAlerts.length})
          </h2>
          <div className="space-y-2 opacity-60">
            {reviewedFileAlerts.map((alert) => (
              <div key={alert.id} className="card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-haven-text">
                      {alert.description}
                      <span className="ml-1.5 text-xs text-green-600 dark:text-green-400">(reviewed)</span>
                    </p>
                    <p className="mt-1 text-xs text-haven-text-tertiary">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
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
        ) : !isDesktopRuntime && !hasLiveData ? (
          <div className="card p-6 text-center">
            <FileSearch className="mx-auto h-8 w-8 text-haven-text-tertiary" />
            <p className="mt-3 text-sm font-semibold text-haven-text">Live data available in the desktop app</p>
            <p className="mt-1 text-xs text-haven-text-secondary">
              File monitoring runs locally on your computer. Open the HavenAI desktop app to see file changes in real time.
            </p>
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
