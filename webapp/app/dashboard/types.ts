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
