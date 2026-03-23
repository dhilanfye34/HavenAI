import { Activity, AlertTriangle, RefreshCcw, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { AgentRuntimeStatus, MonitorControlState } from '../types';

interface RuntimeInspectorProps {
  runtimeStatus: AgentRuntimeStatus | null;
  isDesktopRuntime: boolean;
  monitorControl?: MonitorControlState | null;
}

type StreamFilter = 'all' | 'file' | 'process' | 'network';

function formatTime(timestamp?: number) {
  if (!timestamp) return 'Unknown';
  return new Date(timestamp * 1000).toLocaleTimeString();
}

export function RuntimeInspector({ runtimeStatus, isDesktopRuntime, monitorControl }: RuntimeInspectorProps) {
  const havenai = typeof window !== 'undefined' ? (window as any).havenai : null;
  const details = runtimeStatus?.module_details;
  const permissionHints = runtimeStatus?.permission_hints;
  const [streamFilter, setStreamFilter] = useState<StreamFilter>('all');
  const timelineRef = useRef<HTMLDivElement | null>(null);

  const refreshStatus = () => {
    havenai?.sendToAgent?.({ type: 'get_status' });
  };

  const openPermissionSettings = () => {
    havenai?.openPermissionsSettings?.();
  };

  const timelineEvents = useMemo(() => {
    const fileEvents = (details?.file.recent_events || []).map((event) => ({
      id: `f-${event.timestamp}-${event.path || event.filename || 'unknown'}`,
      kind: 'file' as const,
      timestamp: event.timestamp || 0,
      title: event.filename || event.path || 'File event',
      subtitle: `${event.type || 'event'} · ${event.extension || 'n/a'} · ${event.size || 0} bytes`,
    }));

    const processEvents = (details?.process.recent_events || []).map((event) => ({
      id: `p-${event.create_time}-${event.pid || 'unknown'}`,
      kind: 'process' as const,
      timestamp: event.create_time || 0,
      title: `${event.name || 'unknown'} (PID ${event.pid ?? 'n/a'})`,
      subtitle: `Parent: ${event.parent_name || 'unknown'}`,
    }));

    const networkEvents = (details?.network.recent_events || []).map((event) => ({
      id: `n-${event.timestamp}-${event.pid || 'unknown'}-${event.remote_ip || 'unknown'}`,
      kind: 'network' as const,
      timestamp: event.timestamp || 0,
      title: `${event.process_name || 'unknown'} -> ${event.hostname || event.remote_ip || 'unknown host'}`,
      subtitle: `Port ${event.remote_port ?? 'n/a'} · PID ${event.pid ?? 'n/a'}`,
    }));

    const merged = [...fileEvents, ...processEvents, ...networkEvents].sort(
      (a, b) => b.timestamp - a.timestamp,
    );

    if (streamFilter === 'all') return merged.slice(0, 100);
    return merged.filter((event) => event.kind === streamFilter).slice(0, 100);
  }, [details, streamFilter]);

  useEffect(() => {
    if (!timelineRef.current) return;
    timelineRef.current.scrollTop = 0;
  }, [timelineEvents]);

  return (
    <section className="mt-4 rounded-2xl border border-gray-700 bg-gray-900/70 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">Runtime Inspector</h2>
          <p className="text-xs text-gray-500">Live file/process/network activity on this device.</p>
        </div>
        <button
          type="button"
          onClick={refreshStatus}
          className="inline-flex items-center gap-1 rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-300 hover:text-white"
        >
          <RefreshCcw className="h-3 w-3" />
          Refresh
        </button>
      </div>

      {isDesktopRuntime && monitorControl && (
        <div className="mb-3 rounded-lg border border-gray-700 bg-gray-800/70 p-3 text-xs text-gray-300">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Monitor Lifecycle</p>
          <div className="grid gap-1 sm:grid-cols-3">
            {(['file', 'process', 'network'] as const).map((module) => (
              <div key={module} className="rounded border border-gray-700 bg-gray-900/70 p-2">
                <p className="font-medium capitalize text-gray-100">{module}</p>
                <p className="text-gray-400">Desired: {monitorControl.desired[module] ? 'On' : 'Off'}</p>
                <p className="text-gray-400">Granted: {monitorControl.grants[module] ? 'Yes' : 'No'}</p>
                <p className="text-gray-400">State: {monitorControl.state[module]}</p>
                {monitorControl.blockers[module]?.[0] && (
                  <p className="mt-1 text-red-300">{monitorControl.blockers[module][0]}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {isDesktopRuntime && permissionHints?.maybe_blocked && (
        <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
          <div className="mb-1 inline-flex items-center gap-1 font-medium">
            <AlertTriangle className="h-3.5 w-3.5" />
            Permissions likely blocking telemetry
          </div>
          <p className="mb-2">
            Monitoring is enabled but no events were observed yet. Grant privacy permissions and retry.
          </p>
          <button
            type="button"
            onClick={openPermissionSettings}
            className="rounded border border-amber-400/50 bg-amber-500/10 px-2 py-1 text-xs text-amber-100 hover:bg-amber-500/20"
          >
            Open macOS Privacy Settings
          </button>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-amber-100/90">
            {(permissionHints?.items || []).map((item) => (
              <li key={item.id}>
                <span className="font-medium">{item.label}:</span> {item.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-3 xl:grid-cols-2">
        <div className="rounded-lg border border-gray-700 bg-gray-800/70 p-3 xl:col-span-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Live Event Timeline</p>
            <div className="flex items-center gap-1">
              {(['all', 'file', 'process', 'network'] as StreamFilter[]).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setStreamFilter(filter)}
                  className={`rounded border px-2 py-1 text-[11px] transition ${
                    streamFilter === filter
                      ? 'border-cyan-400/70 bg-cyan-500/10 text-cyan-200'
                      : 'border-gray-700 bg-gray-900/70 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
          <div ref={timelineRef} className="max-h-52 space-y-1 overflow-y-auto text-xs">
            {timelineEvents.map((event) => (
              <div key={event.id} className="rounded border border-gray-700 bg-gray-900/70 p-2">
                <div className="mb-0.5 flex items-center justify-between gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${
                      event.kind === 'file'
                        ? 'bg-blue-500/20 text-blue-200'
                        : event.kind === 'process'
                        ? 'bg-violet-500/20 text-violet-200'
                        : 'bg-emerald-500/20 text-emerald-200'
                    }`}
                  >
                    {event.kind}
                  </span>
                  <span className="text-[11px] text-gray-500">{formatTime(event.timestamp)}</span>
                </div>
                <p className="truncate font-medium text-gray-100">{event.title}</p>
                <p className="truncate text-gray-400">{event.subtitle}</p>
              </div>
            ))}
            {timelineEvents.length === 0 && <p className="text-gray-500">No events for this filter yet.</p>}
          </div>
        </div>

        <div className="rounded-lg border border-gray-700 bg-gray-800/70 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">File Activity</p>
          <p className="mb-2 text-xs text-gray-400">Events observed: {details?.file.event_count ?? 0}</p>
          <div className="max-h-44 space-y-1 overflow-y-auto text-xs text-gray-300">
            {(details?.file.recent_events || []).slice(-12).reverse().map((event, idx) => (
              <div key={`${event.path}-${idx}`} className="rounded border border-gray-700 bg-gray-900/70 p-2">
                <p className="font-medium text-gray-100">{event.filename || event.path || 'Unknown file'}</p>
                <p className="text-gray-400">
                  {event.type || 'event'} · {event.extension || 'n/a'} · {event.size || 0} bytes
                </p>
                <p className="text-gray-500">{formatTime(event.timestamp)}</p>
              </div>
            ))}
            {(!details?.file.recent_events || details.file.recent_events.length === 0) && (
              <p className="text-gray-500">No file events yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-gray-700 bg-gray-800/70 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Process Activity</p>
          <p className="mb-2 text-xs text-gray-400">New process events: {details?.process.event_count ?? 0}</p>
          <div className="max-h-44 space-y-1 overflow-y-auto text-xs text-gray-300">
            {(details?.process.recent_events || []).slice(-12).reverse().map((event, idx) => (
              <div key={`${event.pid}-${idx}`} className="rounded border border-gray-700 bg-gray-900/70 p-2">
                <p className="font-medium text-gray-100">
                  {event.name || 'unknown'} <span className="text-gray-500">PID {event.pid ?? 'n/a'}</span>
                </p>
                <p className="text-gray-400">Parent: {event.parent_name || 'unknown'}</p>
                <p className="text-gray-500">{formatTime(event.create_time)}</p>
              </div>
            ))}
            {(!details?.process.recent_events || details.process.recent_events.length === 0) && (
              <p className="text-gray-500">No process spawn events yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-gray-700 bg-gray-800/70 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Active Process Snapshot</p>
          <div className="max-h-44 overflow-y-auto text-xs text-gray-300">
            <div className="grid grid-cols-[1fr_auto] gap-2 border-b border-gray-700 pb-1 text-[11px] text-gray-500">
              <span>Process</span>
              <span>PID</span>
            </div>
            {(details?.process.active_processes || []).slice(0, 24).map((proc, idx) => (
              <div key={`${proc.pid}-${idx}`} className="grid grid-cols-[1fr_auto] gap-2 border-b border-gray-800 py-1">
                <span className="truncate text-gray-100">{proc.name || 'unknown'}</span>
                <span className="text-gray-400">{proc.pid ?? 'n/a'}</span>
              </div>
            ))}
            {(!details?.process.active_processes || details.process.active_processes.length === 0) && (
              <p className="py-2 text-gray-500">No active process snapshot yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-gray-700 bg-gray-800/70 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Top Live Processes</p>
          <div className="max-h-44 overflow-y-auto text-xs text-gray-300">
            <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-gray-700 pb-1 text-[11px] text-gray-500">
              <span>Process</span>
              <span>CPU%</span>
              <span>Mem%</span>
            </div>
            {(details?.process.top_processes || []).slice(0, 12).map((proc, idx) => (
              <div key={`${proc.pid}-${idx}`} className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-gray-800 py-1">
                <span className="truncate text-gray-100">{proc.name || 'unknown'}</span>
                <span>{(proc.cpu_percent || 0).toFixed(1)}</span>
                <span>{(proc.memory_percent || 0).toFixed(1)}</span>
              </div>
            ))}
            {(!details?.process.top_processes || details.process.top_processes.length === 0) && (
              <p className="py-2 text-gray-500">No process telemetry yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-gray-700 bg-gray-800/70 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Network Activity</p>
          <p className="mb-2 text-xs text-gray-400">New network events: {details?.network.event_count ?? 0}</p>
          <div className="max-h-44 space-y-1 overflow-y-auto text-xs text-gray-300">
            {(details?.network.recent_events || []).slice(-12).reverse().map((event, idx) => (
              <div key={`${event.pid}-${event.remote_ip}-${idx}`} className="rounded border border-gray-700 bg-gray-900/70 p-2">
                <p className="font-medium text-gray-100">
                  {event.process_name || 'unknown'} <span className="text-gray-500">PID {event.pid ?? 'n/a'}</span>
                </p>
                <p className="text-gray-400">
                  {event.hostname || event.remote_ip || 'unknown host'}:{event.remote_port ?? 'n/a'}
                </p>
                <p className="text-gray-500">{formatTime(event.timestamp)}</p>
              </div>
            ))}
            {(!details?.network.recent_events || details.network.recent_events.length === 0) && (
              <p className="text-gray-500">No network events yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-gray-700 bg-gray-800/70 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Active Network Connections</p>
          <div className="max-h-44 overflow-y-auto text-xs text-gray-300">
            <div className="grid grid-cols-[1fr_auto] gap-2 border-b border-gray-700 pb-1 text-[11px] text-gray-500">
              <span>Destination</span>
              <span>Port</span>
            </div>
            {(details?.network.active_connections || []).slice(0, 24).map((conn, idx) => (
              <div
                key={`${conn.pid}-${conn.remote_ip}-${conn.remote_port}-${idx}`}
                className="grid grid-cols-[1fr_auto] gap-2 border-b border-gray-800 py-1"
              >
                <span className="truncate text-gray-100">{conn.hostname || conn.remote_ip || 'unknown'}</span>
                <span className="text-gray-400">{conn.remote_port ?? 'n/a'}</span>
              </div>
            ))}
            {(!details?.network.active_connections || details.network.active_connections.length === 0) && (
              <p className="py-2 text-gray-500">No active network snapshot yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-500">
        <ShieldCheck className="h-3.5 w-3.5" />
        Live status updates are pulled from the desktop agent in real time.
        <Activity className="ml-1 h-3.5 w-3.5" />
      </div>
    </section>
  );
}
