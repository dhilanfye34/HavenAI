import { Activity, AlertTriangle, RefreshCcw, ShieldCheck, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { AgentRuntimeStatus, MonitorControlState } from '../types';

interface RuntimeInspectorProps {
  runtimeStatus: AgentRuntimeStatus | null;
  isDesktopRuntime: boolean;
  monitorControl?: MonitorControlState | null;
}

type StreamFilter = 'all' | 'file' | 'process' | 'network';

interface TimelineEvent {
  id: string;
  kind: 'file' | 'process' | 'network';
  timestamp: number;
  title: string;
  subtitle: string;
  raw: Record<string, any>;
}

function formatTime(timestamp?: number) {
  if (!timestamp) return 'Unknown';
  return new Date(timestamp * 1000).toLocaleTimeString();
}

function formatFullTime(timestamp?: number) {
  if (!timestamp) return 'Unknown';
  const d = new Date(timestamp * 1000);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
}

function formatBytes(bytes?: number) {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

const kindBadge: Record<string, string> = {
  file: 'border-blue-500/20 bg-blue-500/[0.08] text-blue-300',
  process: 'border-violet-500/20 bg-violet-500/[0.08] text-violet-300',
  network: 'border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-300',
};

const kindLabel: Record<string, string> = {
  file: 'File Event',
  process: 'Process Event',
  network: 'Network Event',
};

function DetailRow({ label, value }: { label: string; value: string | number | undefined | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="grid grid-cols-[100px_1fr] gap-2 border-b border-white/[0.04] py-2">
      <span className="text-[11px] text-gray-500">{label}</span>
      <span className="break-all text-[11px] text-gray-300">{String(value)}</span>
    </div>
  );
}

function EventDetailPanel({ event, onClose }: { event: TimelineEvent; onClose: () => void }) {
  const raw = event.raw;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`rounded-md border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${kindBadge[event.kind]}`}>
            {event.kind}
          </span>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            {kindLabel[event.kind]} Details
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-white/[0.08] p-1.5 text-gray-500 transition hover:border-white/[0.15] hover:text-white"
          title="Close details"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <p className="mb-3 text-sm font-medium text-gray-200">{event.title}</p>

      <div className="space-y-0">
        <DetailRow label="Time" value={formatFullTime(event.timestamp)} />

        {event.kind === 'file' && (
          <>
            <DetailRow label="Filename" value={raw.filename} />
            <DetailRow label="Path" value={raw.path} />
            <DetailRow label="Event Type" value={raw.type} />
            <DetailRow label="Extension" value={raw.extension} />
            <DetailRow label="Size" value={raw.size != null ? formatBytes(raw.size) : undefined} />
          </>
        )}

        {event.kind === 'process' && (
          <>
            <DetailRow label="Name" value={raw.name} />
            <DetailRow label="PID" value={raw.pid} />
            <DetailRow label="Parent" value={raw.parent_name} />
            <DetailRow label="Parent PID" value={raw.ppid} />
            <DetailRow label="Created" value={raw.create_time ? formatFullTime(raw.create_time) : undefined} />
          </>
        )}

        {event.kind === 'network' && (
          <>
            <DetailRow label="Process" value={raw.process_name} />
            <DetailRow label="PID" value={raw.pid} />
            <DetailRow label="Remote IP" value={raw.remote_ip} />
            <DetailRow label="Remote Port" value={raw.remote_port} />
            <DetailRow label="Hostname" value={raw.hostname} />
            <DetailRow label="Status" value={raw.status} />
          </>
        )}
      </div>

      <div className="mt-3 rounded-lg border border-white/[0.04] bg-white/[0.02] p-2.5">
        <p className="mb-1 text-[10px] uppercase tracking-wider text-gray-600">Raw Data</p>
        <pre className="max-h-32 overflow-auto text-[11px] leading-relaxed text-gray-500">
          {JSON.stringify(raw, null, 2)}
        </pre>
      </div>
    </div>
  );
}

export function RuntimeInspector({ runtimeStatus, isDesktopRuntime, monitorControl }: RuntimeInspectorProps) {
  const havenai = typeof window !== 'undefined' ? (window as any).havenai : null;
  const details = runtimeStatus?.module_details;
  const permissionHints = runtimeStatus?.permission_hints;
  const [streamFilter, setStreamFilter] = useState<StreamFilter>('all');
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);

  const refreshStatus = () => {
    havenai?.sendToAgent?.({ type: 'get_status' });
  };

  const openPermissionSettings = () => {
    havenai?.openPermissionsSettings?.();
  };

  const timelineEvents = useMemo<TimelineEvent[]>(() => {
    const fileEvents: TimelineEvent[] = (details?.file.recent_events || []).map((event) => ({
      id: `f-${event.timestamp}-${event.path || event.filename || 'unknown'}`,
      kind: 'file' as const,
      timestamp: event.timestamp || 0,
      title: event.filename || event.path || 'File event',
      subtitle: `${event.type || 'event'} · ${event.extension || 'n/a'} · ${formatBytes(event.size)}`,
      raw: event,
    }));

    const processEvents: TimelineEvent[] = (details?.process.recent_events || []).map((event) => ({
      id: `p-${event.create_time}-${event.pid || 'unknown'}`,
      kind: 'process' as const,
      timestamp: event.create_time || 0,
      title: `${event.name || 'unknown'} (PID ${event.pid ?? 'n/a'})`,
      subtitle: `Parent: ${event.parent_name || 'unknown'}`,
      raw: event,
    }));

    const networkEvents: TimelineEvent[] = (details?.network.recent_events || []).map((event) => ({
      id: `n-${event.timestamp}-${event.pid || 'unknown'}-${event.remote_ip || 'unknown'}`,
      kind: 'network' as const,
      timestamp: event.timestamp || 0,
      title: `${event.process_name || 'unknown'} -> ${event.hostname || event.remote_ip || 'unknown host'}`,
      subtitle: `Port ${event.remote_port ?? 'n/a'} · PID ${event.pid ?? 'n/a'}`,
      raw: event,
    }));

    const merged = [...fileEvents, ...processEvents, ...networkEvents].sort(
      (a, b) => b.timestamp - a.timestamp,
    );

    if (streamFilter === 'all') return merged.slice(0, 100);
    return merged.filter((event) => event.kind === streamFilter).slice(0, 100);
  }, [details, streamFilter]);

  // Only auto-scroll to top if the user is already near the top.
  useEffect(() => {
    if (!timelineRef.current) return;
    if (timelineRef.current.scrollTop < 60) {
      timelineRef.current.scrollTop = 0;
    }
  }, [timelineEvents]);

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Runtime Inspector</h2>
          <p className="mt-0.5 text-[11px] text-gray-600">Live file/process/network activity on this device. Click any event for details.</p>
        </div>
        <button
          type="button"
          onClick={refreshStatus}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-xs text-gray-400 transition-all duration-300 hover:border-white/[0.15] hover:text-white"
        >
          <RefreshCcw className="h-3 w-3" />
          Refresh
        </button>
      </div>

      {isDesktopRuntime && monitorControl && (
        <div className="mb-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Monitor Lifecycle</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {(['file', 'process', 'network'] as const).map((module) => (
              <div key={module} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-sm font-medium capitalize text-white">{module}</p>
                <div className="mt-1.5 space-y-0.5 text-[11px] text-gray-500">
                  <p>Desired: <span className="text-gray-300">{monitorControl.desired[module] ? 'On' : 'Off'}</span></p>
                  <p>State: <span className={
                    monitorControl.state[module] === 'running' ? 'text-emerald-400' :
                    monitorControl.state[module] === 'blocked' ? 'text-red-400' :
                    monitorControl.state[module] === 'pending_permission' ? 'text-amber-400' : 'text-gray-400'
                  }>{monitorControl.state[module]}</span></p>
                </div>
                {monitorControl.blockers[module]?.[0] && (
                  <p className="mt-1.5 text-[11px] text-red-300">{monitorControl.blockers[module][0]}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {isDesktopRuntime && permissionHints?.maybe_blocked && (
        <div className="mb-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3 text-xs text-amber-300">
          <div className="mb-1.5 inline-flex items-center gap-1.5 font-medium">
            <AlertTriangle className="h-3.5 w-3.5" />
            Permissions likely blocking telemetry
          </div>
          <p className="mb-2 text-amber-200/80">
            Monitoring is enabled but no events were observed yet. Grant privacy permissions and retry.
          </p>
          <button
            type="button"
            onClick={openPermissionSettings}
            className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200 transition hover:bg-amber-500/20"
          >
            Open macOS Privacy Settings
          </button>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-amber-200/70">
            {(permissionHints?.items || []).map((item) => (
              <li key={item.id}>
                <span className="font-medium">{item.label}:</span> {item.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        {/* Live Event Timeline */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Live Event Timeline</p>
            <div className="flex items-center gap-1">
              {(['all', 'file', 'process', 'network'] as StreamFilter[]).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setStreamFilter(filter)}
                  className={`rounded-lg border px-2 py-1 text-[11px] font-medium transition-all duration-300 ${
                    streamFilter === filter
                      ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300'
                      : 'border-white/[0.06] bg-white/[0.02] text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
          <div ref={timelineRef} className="max-h-[30rem] space-y-1.5 overflow-y-auto">
            {timelineEvents.map((event, idx) => (
              <button
                key={event.id}
                type="button"
                onClick={() => setSelectedEvent(selectedEvent?.id === event.id ? null : event)}
                className={`w-full rounded-lg border p-2.5 text-left transition-all duration-300 ${
                  selectedEvent?.id === event.id
                    ? 'border-cyan-400/30 bg-cyan-500/[0.06]'
                    : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
                }`}
                style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
              >
                <div className="mb-0.5 flex items-center justify-between gap-2">
                  <span className={`rounded-md border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${kindBadge[event.kind]}`}>
                    {event.kind}
                  </span>
                  <span className="text-[11px] text-gray-600">{formatTime(event.timestamp)}</span>
                </div>
                <p className="truncate text-sm font-medium text-gray-200">{event.title}</p>
                <p className="truncate text-[11px] text-gray-500">{event.subtitle}</p>
              </button>
            ))}
            {timelineEvents.length === 0 && <p className="py-4 text-center text-xs text-gray-600">No events for this filter yet.</p>}
          </div>
        </div>

        {/* Right column: detail panel or default panels */}
        <div className="space-y-3">
          {selectedEvent ? (
            <EventDetailPanel event={selectedEvent} onClose={() => setSelectedEvent(null)} />
          ) : (
            <>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Active Process Snapshot</p>
                <div className="max-h-36 overflow-y-auto text-xs">
                  <div className="grid grid-cols-[1fr_auto] gap-2 border-b border-white/[0.06] pb-1.5 text-[11px] text-gray-600">
                    <span>Process</span>
                    <span>PID</span>
                  </div>
                  {(details?.process.active_processes || []).slice(0, 16).map((proc, idx) => (
                    <div key={`${proc.pid}-${idx}`} className="grid grid-cols-[1fr_auto] gap-2 border-b border-white/[0.04] py-1.5">
                      <span className="truncate text-gray-300">{proc.name || 'unknown'}</span>
                      <span className="text-gray-500">{proc.pid ?? 'n/a'}</span>
                    </div>
                  ))}
                  {(!details?.process.active_processes || details.process.active_processes.length === 0) && (
                    <p className="py-3 text-center text-gray-600">No active process snapshot yet.</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Active Network Connections</p>
                <div className="max-h-36 overflow-y-auto text-xs">
                  <div className="grid grid-cols-[1fr_auto] gap-2 border-b border-white/[0.06] pb-1.5 text-[11px] text-gray-600">
                    <span>Destination</span>
                    <span>Port</span>
                  </div>
                  {(details?.network.active_connections || []).slice(0, 16).map((conn, idx) => (
                    <div key={`${conn.pid}-${conn.remote_ip}-${conn.remote_port}-${idx}`} className="grid grid-cols-[1fr_auto] gap-2 border-b border-white/[0.04] py-1.5">
                      <span className="truncate text-gray-300">{conn.hostname || conn.remote_ip || 'unknown'}</span>
                      <span className="text-gray-500">{conn.remote_port ?? 'n/a'}</span>
                    </div>
                  ))}
                  {(!details?.network.active_connections || details.network.active_connections.length === 0) && (
                    <p className="py-3 text-center text-gray-600">No active network snapshot yet.</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Top Live Processes</p>
                <div className="max-h-28 overflow-y-auto text-xs">
                  <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-white/[0.06] pb-1.5 text-[11px] text-gray-600">
                    <span>Process</span>
                    <span>CPU%</span>
                    <span>Mem%</span>
                  </div>
                  {(details?.process.top_processes || []).slice(0, 8).map((proc, idx) => (
                    <div key={`${proc.pid}-${idx}`} className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-white/[0.04] py-1.5">
                      <span className="truncate text-gray-300">{proc.name || 'unknown'}</span>
                      <span className="text-gray-500">{(proc.cpu_percent || 0).toFixed(1)}</span>
                      <span className="text-gray-500">{(proc.memory_percent || 0).toFixed(1)}</span>
                    </div>
                  ))}
                  {(!details?.process.top_processes || details.process.top_processes.length === 0) && (
                    <p className="py-3 text-center text-gray-600">No process telemetry yet.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom activity panels */}
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">File Activity</p>
          <p className="mb-2 text-[11px] text-gray-600">Events observed: {details?.file.event_count ?? 0}</p>
          <div className="max-h-36 space-y-1.5 overflow-y-auto">
            {(details?.file.recent_events || []).slice(-8).reverse().map((event, idx) => (
              <div key={`${event.path}-${idx}`} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
                <p className="truncate text-sm font-medium text-gray-200">{event.filename || event.path || 'Unknown file'}</p>
                <p className="truncate text-[11px] text-gray-500">{event.type || 'event'} · {event.extension || 'n/a'} · {formatBytes(event.size)}</p>
              </div>
            ))}
            {(!details?.file.recent_events || details.file.recent_events.length === 0) && (
              <p className="py-2 text-center text-xs text-gray-600">No file events yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Process Activity</p>
          <p className="mb-2 text-[11px] text-gray-600">New process events: {details?.process.event_count ?? 0}</p>
          <div className="max-h-36 space-y-1.5 overflow-y-auto">
            {(details?.process.recent_events || []).slice(-8).reverse().map((event, idx) => (
              <div key={`${event.pid}-${idx}`} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
                <p className="truncate text-sm font-medium text-gray-200">{event.name || 'unknown'} <span className="text-gray-600">PID {event.pid ?? 'n/a'}</span></p>
                <p className="truncate text-[11px] text-gray-500">Parent: {event.parent_name || 'unknown'}</p>
              </div>
            ))}
            {(!details?.process.recent_events || details.process.recent_events.length === 0) && (
              <p className="py-2 text-center text-xs text-gray-600">No process spawn events yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Network Activity</p>
          <p className="mb-2 text-[11px] text-gray-600">New network events: {details?.network.event_count ?? 0}</p>
          <div className="max-h-36 space-y-1.5 overflow-y-auto">
            {(details?.network.recent_events || []).slice(-8).reverse().map((event, idx) => (
              <div key={`${event.pid}-${event.remote_ip}-${idx}`} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
                <p className="truncate text-sm font-medium text-gray-200">{event.process_name || 'unknown'} <span className="text-gray-600">PID {event.pid ?? 'n/a'}</span></p>
                <p className="truncate text-[11px] text-gray-500">{event.hostname || event.remote_ip || 'unknown host'}:{event.remote_port ?? 'n/a'}</p>
              </div>
            ))}
            {(!details?.network.recent_events || details.network.recent_events.length === 0) && (
              <p className="py-2 text-center text-xs text-gray-600">No network events yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-600">
        <ShieldCheck className="h-3.5 w-3.5 text-cyan-400/50" />
        Live status updates pulled from the desktop agent in real time.
        <Activity className="ml-1 h-3.5 w-3.5 text-cyan-400/50" />
      </div>
    </section>
  );
}
