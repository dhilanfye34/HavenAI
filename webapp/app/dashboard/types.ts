export type AgentStatusLevel = 'active' | 'idle' | 'error';
export type AlertSeverity = 'critical' | 'warning' | 'info';
export type ChatRole = 'user' | 'assistant';
export type ChatConnectionStatus = 'connected' | 'degraded' | 'offline';

export interface AgentStatus {
  id: string;
  name: string;
  status: AgentStatusLevel;
  lastCheckIn: string;
  summary: string;
}

export interface SecurityAlert {
  id: string;
  severity: AlertSeverity;
  timestamp: string;
  source: string;
  description: string;
  details: string;
}

export interface Recommendation {
  id: string;
  title: string;
  context: string;
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
  sms_phone?: string | null;
  voice_phone?: string | null;
}
