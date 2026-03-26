import { useEffect, useState } from 'react';

import { AgentRuntimeStatus, AgentStatus, RuntimeMetrics } from '../types';
import {
  getNextMockAgentStatuses,
  initialAgentStatuses,
} from '../services/mockAgents';

function mapStatus(value?: string): AgentStatus['status'] {
  const normalized = (value || '').toLowerCase();
  if (normalized === 'error') return 'error';
  if (normalized === 'active' || normalized === 'running') return 'active';
  return 'idle';
}

function titleFromKey(key: string): string {
  const map: Record<string, string> = {
    FileAgent: 'File Monitoring',
    ProcessAgent: 'Process Monitoring',
    NetworkAgent: 'Network Monitoring',
    EmailInboxAgent: 'Email Inbox',
    MessageAgent: 'Message Notifications',
  };
  return map[key] || key;
}

export function useAgentStatus() {
  const [agents, setAgents] = useState<AgentStatus[]>(initialAgentStatuses);
  const [runtimeStatus, setRuntimeStatus] = useState<AgentRuntimeStatus | null>(null);
  const [localStats, setLocalStats] = useState<any>(null);

  const mapRuntimeMetrics = (metrics: any): RuntimeMetrics | null => {
    if (!metrics || typeof metrics !== 'object') return null;
    return {
      process_count: Number(metrics.process_count || 0),
      process_events_seen: Number(metrics.process_events_seen || 0),
      network_connection_count: Number(metrics.network_connection_count || 0),
      network_events_seen: Number(metrics.network_events_seen || 0),
      active_remote_ips: Number(metrics.active_remote_ips || 0),
      file_events_seen: Number(metrics.file_events_seen || 0),
      cpu_usage_percent: Number(metrics.cpu_usage_percent || 0),
      memory_usage_percent: Number(metrics.memory_usage_percent || 0),
      disk_usage_percent: Number(metrics.disk_usage_percent || 0),
      log_storage_usage_percent: Number(metrics.log_storage_usage_percent || 0),
      uptime_seconds: Number(metrics.uptime_seconds || 0),
    };
  };

  useEffect(() => {
    const havenai = (window as any).havenai;
    if (havenai?.onAgentStatus) {
      const applyStatus = (statusPayload: any) => {
        setRuntimeStatus((current) => ({
          cloud_connected: Boolean(statusPayload?.cloud_connected ?? current?.cloud_connected),
          has_tokens: Boolean(statusPayload?.has_tokens ?? current?.has_tokens),
          device_id:
            statusPayload?.device_id === undefined
              ? (current?.device_id ?? null)
              : (statusPayload?.device_id ?? null),
          alert_count: Number(statusPayload?.alert_count ?? current?.alert_count ?? 0),
          enabled_modules: {
            file_monitoring_enabled: Boolean(
              statusPayload?.enabled_modules?.file_monitoring_enabled ??
                current?.enabled_modules?.file_monitoring_enabled,
            ),
            process_monitoring_enabled: Boolean(
              statusPayload?.enabled_modules?.process_monitoring_enabled ??
                current?.enabled_modules?.process_monitoring_enabled,
            ),
            network_monitoring_enabled: Boolean(
              statusPayload?.enabled_modules?.network_monitoring_enabled ??
                current?.enabled_modules?.network_monitoring_enabled,
            ),
          },
          auth_state: statusPayload?.auth_status?.state || current?.auth_state || 'unknown',
          auth_last_error:
            statusPayload?.auth_status?.last_error === undefined
              ? (current?.auth_last_error ?? null)
              : (statusPayload?.auth_status?.last_error ?? null),
          last_heartbeat_at:
            statusPayload?.auth_status?.last_heartbeat_at === undefined
              ? (current?.last_heartbeat_at ?? null)
              : new Date(Number(statusPayload.auth_status.last_heartbeat_at) * 1000).toISOString(),
          metrics: mapRuntimeMetrics(statusPayload?.metrics) ?? current?.metrics ?? null,
          module_details:
            statusPayload?.module_details === undefined
              ? (current?.module_details ?? null)
              : (statusPayload?.module_details ?? null),
          permission_hints:
            statusPayload?.permission_hints === undefined
              ? (current?.permission_hints ?? null)
              : (statusPayload?.permission_hints ?? null),
        }));

        const map = statusPayload?.agents || {};
        const entries = Object.entries(map) as Array<[string, string]>;
        const nextAgents: AgentStatus[] = entries.map(([key, value]) => {
          const status = mapStatus(value);
          return {
            id: key,
            name: titleFromKey(key),
            status,
            lastCheckIn: new Date().toISOString(),
            summary:
              status === 'active'
                ? 'Monitoring is active on this device.'
                : status === 'error'
                ? 'Agent reported an error. Check logs/status.'
                : 'Waiting for next monitoring cycle.',
          };
        });
        if (nextAgents.length > 0) {
          setAgents(nextAgents);
        }
      };

      havenai.onAgentStatus(applyStatus);
      havenai.sendToAgent?.({ type: 'get_status' });

      if (havenai.getLocalStats && havenai.onLocalStats) {
        havenai.onLocalStats((data: any) => {
          setLocalStats(data);
        });
        havenai.getLocalStats();
      }

      return () => {
        havenai.removeAllListeners?.('agent-status');
        havenai.removeAllListeners?.('local-stats');
      };
    }

    const interval = setInterval(() => {
      setAgents((current) => getNextMockAgentStatuses(current));
    }, 25_000);

    return () => clearInterval(interval);
  }, []);

  return { agents, runtimeStatus, localStats };
}
