export type AgentStatusLevel = 'active' | 'idle' | 'error';
export type AlertSeverity = 'critical' | 'warning' | 'info';
export type ChatRole = 'user' | 'assistant';
export type ChatConnectionStatus = 'connected' | 'degraded' | 'offline';
export type MonitorModule = 'file' | 'process' | 'network';
export type MonitorLifecycleState = 'off' | 'pending_permission' | 'running' | 'blocked';

export interface AgentStatus {
  id: string;
  name: string;
  status: AgentStatusLevel;
  lastCheckIn: string;
  summary: string;
}

export interface RuntimeMetrics {
  process_count: number;
  process_events_seen: number;
  network_connection_count: number;
  network_events_seen: number;
  active_remote_ips: number;
  file_events_seen: number;
  cpu_usage_percent: number;
  memory_usage_percent: number;
  disk_usage_percent: number;
  log_storage_usage_percent: number;
  uptime_seconds: number;
}

export interface AgentRuntimeStatus {
  cloud_connected: boolean;
  has_tokens: boolean;
  device_id: string | null;
  alert_count: number;
  enabled_modules: {
    file_monitoring_enabled: boolean;
    process_monitoring_enabled: boolean;
    network_monitoring_enabled: boolean;
  };
  auth_state: string;
  auth_last_error: string | null;
  last_heartbeat_at: string | null;
  metrics: RuntimeMetrics | null;
  module_details: {
    file: {
      event_count: number;
      recent_events: Array<{
        type?: string;
        path?: string;
        filename?: string;
        extension?: string;
        size?: number;
        timestamp?: number;
      }>;
    };
    process: {
      event_count: number;
      recent_events: Array<{
        pid?: number;
        name?: string;
        parent_name?: string;
        ppid?: number;
        create_time?: number;
      }>;
      active_processes: Array<{
        pid?: number;
        name?: string;
        parent_name?: string;
        ppid?: number;
        create_time?: number;
      }>;
      top_processes: Array<{
        pid?: number;
        name?: string;
        cpu_percent?: number;
        memory_percent?: number;
        status?: string;
      }>;
    };
    network: {
      event_count: number;
      recent_events: Array<{
        process_name?: string;
        pid?: number;
        remote_ip?: string;
        remote_port?: number;
        hostname?: string;
        status?: string;
        timestamp?: number;
      }>;
      active_connections: Array<{
        process_name?: string;
        pid?: number;
        remote_ip?: string;
        remote_port?: number;
        hostname?: string;
        status?: string;
      }>;
    };
    email?: {
      enabled: boolean;
      last_scan_count: number;
      total_scanned: number;
      last_scan_at?: number | null;
      last_successful_scan_at?: number | null;
      last_error?: string | null;
      last_error_at?: number | null;
      consecutive_failures?: number;
      findings: Array<{
        email?: {
          from_name?: string;
          from_email?: string;
          subject?: string;
          received_at?: string;
          snippet?: string;
          has_attachments?: boolean;
        };
        risk_score?: number;
        reasons?: string[];
        recommendation?: string;
      }>;
      recent_emails?: Array<{
        message_id?: string;
        uid?: string;
        from_name?: string;
        from_email?: string;
        subject?: string;
        snippet?: string;
        received_at?: string;
        has_attachments?: boolean;
        risk_score?: number;
        reasons?: string[];
      }>;
    };
  } | null;
  permission_hints: {
    platform: string;
    maybe_blocked: boolean;
    items: Array<{
      id: string;
      label: string;
      description: string;
    }>;
  } | null;
}

export interface MonitorControlState {
  desired: Record<MonitorModule, boolean>;
  state: Record<MonitorModule, MonitorLifecycleState>;
  blockers: Record<MonitorModule, string[]>;
  updated_at: string;
}

export interface SecurityAlert {
  id: string;
  severity: AlertSeverity;
  timestamp: string;
  source: string;
  description: string;
  details: string | Record<string, any>;
}

export interface Recommendation {
  id: string;
  title: string;
  context: string;
  severity: 'critical' | 'warning' | 'info';
  description: string;
  recommendation: string;
  relatedAlerts: SecurityAlert[];
  targetPath: string;
  actionLabel: string;
}

export interface SecurityStats {
  threatsBlocked24h: number;
  threatsTrend: number;
  activeConnections: number;
  filesMonitored: number;
  lastFullScan: string;
  uptime: string;
  healthScore: number;
  diskUsage: number;
  memoryUsage: number;
  cpuUsage: number;
  logStorageUsage: number;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
}

export interface ChatContextEvent {
  source: string;
  severity?: string;
  timestamp?: string;
  description: string;
}

export interface ProtectionStatus {
  has_devices: boolean;
  total_devices: number;
  online_devices: number;
  protection_active: boolean;
}

export interface SetupPreferences {
  file_monitoring_enabled: boolean;
  process_monitoring_enabled: boolean;
  network_monitoring_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  voice_call_enabled: boolean;
  sms_min_severity: 'low' | 'medium' | 'high' | 'critical';
  voice_call_min_severity: 'low' | 'medium' | 'high' | 'critical';
  sms_phone: string | null;
  voice_phone: string | null;
  desktop_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface SetupPreferencesUpdate {
  file_monitoring_enabled?: boolean;
  process_monitoring_enabled?: boolean;
  network_monitoring_enabled?: boolean;
  email_enabled?: boolean;
  sms_enabled?: boolean;
  voice_call_enabled?: boolean;
  sms_min_severity?: 'low' | 'medium' | 'high' | 'critical';
  voice_call_min_severity?: 'low' | 'medium' | 'high' | 'critical';
  sms_phone?: string | null;
  voice_phone?: string | null;
}
