'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  MessageCircle,
  X,
  XCircle,
} from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';

interface AppInfo {
  id: string;
  name: string;
  count: number;
  category: 'normal' | 'review' | 'concern';
  reason: string;
  details: string[];
  totalCpu: number;
  totalMemory: number;
  firstSeen: number; // when first observed
  lastSeen: number;  // last time seen in live data
  stillRunning: boolean;
}

// Known-safe process name fragments
const KNOWN_SAFE_FRAGMENTS = [
  'finder', 'dock', 'systemuiserver', 'loginwindow', 'windowserver',
  'launchd', 'kernel_task', 'spotlight', 'mds',
  'coreaudiod', 'bluetoothd', 'airportd', 'configd', 'distnoted',
  'chrome', 'google chrome', 'safari', 'firefox', 'arc', 'brave',
  'slack', 'discord', 'zoom', 'microsoft teams', 'teams',
  'code', 'visual studio code', 'cursor',
  'iterm', 'terminal', 'warp', 'alacritty',
  'spotify', 'music', 'apple music',
  'notes', 'reminders', 'calendar', 'mail',
  'messages', 'facetime', 'photos',
  'preview', 'textedit', 'pages', 'numbers', 'keynote',
  'activity monitor', 'system preferences', 'system settings',
  'figma', 'notion', 'obsidian', 'linear',
  'docker', 'node', 'python', 'ruby', 'java', 'go',
  'electron', 'havenai', 'haven',
  'stocks', 'stockswidget', 'weather', 'weatherwidget',
  'notificationcenter', 'usernoted', 'coreservices',
  'cfprefsd', 'nsurlsessiond', 'trustd', 'opendirectoryd',
  'logd', 'syslogd', 'sharingd', 'rapportd',
  'bird', 'cloudd', 'assistantd', 'siri', 'suggestd',
  'backupd', 'timed', 'powerd', 'thermald',
  'amfid', 'endpointsecurity', 'syspolicyd',
  'axvisual', 'universalaccess', 'voiceover',
  'iconservices', 'lsd', 'corebrightness',
  'watchdogd', 'symptomsd', 'networkserviceproxy',
  'wifid', 'apsd', 'identityservices',
];

function isKnownSafe(name: string): boolean {
  const lower = name.toLowerCase();
  return KNOWN_SAFE_FRAGMENTS.some((frag) => lower.includes(frag));
}

function normalizeAppName(name: string): string {
  return name
    .replace(/\s*\(Renderer\)/gi, '')
    .replace(/\s*\(GPU\)/gi, '')
    .replace(/\s*\(Plugin\)/gi, '')
    .replace(/\s*Helper$/gi, '')
    .replace(/^\d+\.\d+\.\d+$/, 'Unknown')
    .trim() || name;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

// How long to keep a flagged process visible after it disappears (1 minute)
const FLAGGED_RETENTION_MS = 60 * 1000;

function AppCard({
  app,
  onAddToChat,
  onDismiss,
}: {
  app: AppInfo;
  onAddToChat: (app: AppInfo) => void;
  onDismiss?: (app: AppInfo) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const borderClass =
    app.category === 'concern'
      ? 'border-red-200 dark:border-red-500/20'
      : app.category === 'review'
      ? 'border-amber-200 dark:border-amber-500/20'
      : '';
  const bgClass =
    app.category === 'concern'
      ? 'bg-red-50 dark:bg-red-500/5'
      : app.category === 'review'
      ? 'bg-amber-50 dark:bg-amber-500/5'
      : '';
  const StatusIcon =
    app.category === 'concern'
      ? XCircle
      : app.category === 'review'
      ? AlertTriangle
      : CheckCircle2;
  const iconColor =
    app.category === 'concern'
      ? 'text-red-500'
      : app.category === 'review'
      ? 'text-amber-500'
      : 'text-green-500';

  return (
    <div className={`card ${borderClass} ${bgClass} p-4`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <StatusIcon className={`h-5 w-5 shrink-0 ${iconColor}`} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-haven-text truncate">
              {app.name}
              {app.count > 1 && (
                <span className="ml-1.5 text-xs text-haven-text-tertiary">
                  ({app.count} processes)
                </span>
              )}
            </p>
            <p className="text-xs text-haven-text-tertiary">{app.reason}</p>
            {!app.stillRunning && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-haven-text-tertiary">
                <Clock className="h-3 w-3" />
                Exited {timeAgo(app.lastSeen)}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onAddToChat(app)}
            className="p-1.5 text-haven-text-tertiary transition hover:text-blue-500"
            title="Ask about this app"
          >
            <MessageCircle className="h-4 w-4" />
          </button>
          {onDismiss && (
            <button
              onClick={() => onDismiss(app)}
              className="p-1.5 text-haven-text-tertiary transition hover:text-red-500"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {app.details.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 text-haven-text-tertiary hover:text-haven-text"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
      {expanded && app.details.length > 0 && (
        <div className="mt-3 ml-8 space-y-1">
          {app.details.map((d, i) => (
            <p key={i} className="text-xs text-haven-text-secondary">{d}</p>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AppsPage() {
  const { runtimeStatus, preferences, chatSendMessage } = useDashboard();
  const processEnabled = Boolean(preferences?.process_monitoring_enabled);
  const details = runtimeStatus?.module_details;

  // Persistent map of flagged processes — survives across re-renders and data refreshes
  const flaggedHistoryRef = useRef<Map<string, AppInfo>>(new Map());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [, forceUpdate] = useState(0);

  // Build current snapshot from live data
  const currentApps = useMemo(() => {
    const topProcs = details?.process.top_processes || [];
    const groups = new Map<string, {
      name: string;
      count: number;
      totalCpu: number;
      totalMemory: number;
      isKnown: boolean;
    }>();

    for (const proc of topProcs) {
      const rawName = proc.name || 'Unknown';
      const displayName = normalizeAppName(rawName);
      const key = displayName.toLowerCase();
      const existing = groups.get(key);

      if (existing) {
        existing.count++;
        existing.totalCpu += proc.cpu_percent || 0;
        existing.totalMemory += proc.memory_percent || 0;
      } else {
        groups.set(key, {
          name: displayName,
          count: 1,
          totalCpu: proc.cpu_percent || 0,
          totalMemory: proc.memory_percent || 0,
          isKnown: isKnownSafe(rawName),
        });
      }
    }

    const result: AppInfo[] = [];
    Array.from(groups.entries()).forEach(([key, group]) => {
      if (group.name === 'Unknown') return;

      const appDetails: string[] = [];
      if (group.totalCpu > 0.1) appDetails.push(`Using ${group.totalCpu.toFixed(1)}% CPU`);
      if (group.totalMemory > 0.1) appDetails.push(`Using ${group.totalMemory.toFixed(1)}% memory`);
      if (group.count > 1) appDetails.push(`${group.count} running processes`);

      const highResource = group.totalCpu > 50 || group.totalMemory > 30;

      let category: AppInfo['category'] = 'normal';
      let reason = 'Known app, normal behavior';

      if (!group.isKnown) {
        category = 'review';
        reason = highResource
          ? 'Unrecognized app using significant resources'
          : 'This app isn\'t recognized by HavenAI';
      }

      result.push({
        id: key,
        name: group.name,
        count: group.count,
        category,
        reason,
        details: appDetails,
        totalCpu: group.totalCpu,
        totalMemory: group.totalMemory,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        stillRunning: true,
      });
    });

    return result;
  }, [details]);

  // Merge current snapshot into persistent flagged history
  useEffect(() => {
    const now = Date.now();
    const history = flaggedHistoryRef.current;
    const currentIds = new Set(currentApps.map((a) => a.id));

    // Update or add flagged items from current snapshot
    currentApps.forEach((app) => {
      if (app.category !== 'normal') {
        const existing = history.get(app.id);
        history.set(app.id, {
          ...app,
          firstSeen: existing?.firstSeen || now, // preserve original first-seen time
          lastSeen: now,
          stillRunning: true,
        });
      }
    });

    // Mark previously-flagged items that are no longer in the current snapshot
    Array.from(history.entries()).forEach(([id, app]) => {
      if (!currentIds.has(id)) {
        history.set(id, { ...app, stillRunning: false });
      }
    });

    // Prune items that exited more than FLAGGED_RETENTION_MS ago
    Array.from(history.entries()).forEach(([id, app]) => {
      if (!app.stillRunning && now - app.lastSeen > FLAGGED_RETENTION_MS) {
        history.delete(id);
      }
    });

    forceUpdate((n) => n + 1);
  }, [currentApps]);

  // Build final lists
  const flagged = useMemo(() => {
    return Array.from(flaggedHistoryRef.current.values())
      .filter((a) => !dismissedIds.has(a.id))
      .sort((a, b) => {
        // Sort by firstSeen (oldest first) for stable ordering — new items append at bottom
        return a.firstSeen - b.firstSeen;
      });
  }, [currentApps, dismissedIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const normal = useMemo(() => {
    return currentApps
      .filter((a) => a.category === 'normal')
      .sort((a, b) => b.totalCpu - a.totalCpu);
  }, [currentApps]);

  const handleAddToChat = (app: AppInfo) => {
    const status = app.stillRunning ? 'currently running' : 'recently ran';
    chatSendMessage(`Tell me about the app "${app.name}" that is ${status} on my device. Is it safe? What does it do?`);
  };

  const handleDismiss = useCallback((app: AppInfo) => {
    setDismissedIds((prev) => new Set(prev).add(app.id));
    flaggedHistoryRef.current.delete(app.id);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-haven-text">Apps & Privacy</h1>
        <p className="mt-1 text-sm text-haven-text-secondary">
          See what apps are running and if any look suspicious.
        </p>
      </div>

      {/* Status */}
      <div className="card p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${processEnabled ? 'bg-green-500/10' : 'bg-gray-100 dark:bg-gray-800'}`}>
            <Eye className={`h-5 w-5 ${processEnabled ? 'text-green-500' : 'text-haven-text-tertiary'}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-haven-text">
              App monitoring is {processEnabled ? 'active' : 'off'}
            </p>
            <p className="text-xs text-haven-text-tertiary">
              {processEnabled
                ? `Watching ${currentApps.length} apps on this device`
                : 'Turn on app monitoring to see activity'}
            </p>
          </div>
        </div>
        <span className={processEnabled ? 'status-dot-safe' : 'status-dot-inactive'} />
      </div>

      {/* Flagged — persistent history */}
      {flagged.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-haven-text">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Needs review ({flagged.length})
          </h2>
          <p className="mb-3 text-xs text-haven-text-tertiary">
            Unrecognized apps stay here for 1 minute after exiting. Tap the chat icon to ask about any app.
          </p>
          <div className="max-h-[24rem] overflow-y-auto space-y-2 pr-1">
            {flagged.map((app) => (
              <AppCard
                key={app.id}
                app={app}
                onAddToChat={handleAddToChat}
                onDismiss={handleDismiss}
              />
            ))}
          </div>
        </div>
      )}

      {/* Normal */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-haven-text">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          Normal activity ({normal.length})
        </h2>
        {normal.length > 0 ? (
          <div className="max-h-[24rem] overflow-y-auto space-y-2 pr-1">
            {normal.map((app) => (
              <AppCard key={app.id} app={app} onAddToChat={handleAddToChat} />
            ))}
          </div>
        ) : (
          <div className="card p-6 text-center">
            <p className="text-sm text-haven-text-secondary">
              {processEnabled
                ? 'No app activity detected yet. Check back soon.'
                : 'Enable app monitoring to see what apps are doing.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
