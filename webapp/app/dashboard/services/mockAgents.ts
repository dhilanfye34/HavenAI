import { AgentStatus, Recommendation, SecurityStats } from '../types';

export const initialAgentStatuses: AgentStatus[] = [
  {
    id: 'network-monitor',
    name: 'Network Monitor',
    status: 'active',
    lastCheckIn: new Date().toISOString(),
    summary: 'Watching inbound and outbound traffic for suspicious patterns.',
  },
  {
    id: 'file-integrity-watcher',
    name: 'File Integrity Watcher',
    status: 'active',
    lastCheckIn: new Date(Date.now() - 20_000).toISOString(),
    summary: 'Tracking critical system files for unauthorized changes.',
  },
  {
    id: 'process-analyzer',
    name: 'Process Analyzer',
    status: 'idle',
    lastCheckIn: new Date(Date.now() - 60_000).toISOString(),
    summary: 'Monitoring running processes and baseline behavior.',
  },
  {
    id: 'threat-intelligence',
    name: 'Threat Intelligence',
    status: 'active',
    lastCheckIn: new Date(Date.now() - 30_000).toISOString(),
    summary: 'Cross-referencing local activity with external threat feeds.',
  },
  {
    id: 'vulnerability-scanner',
    name: 'Vulnerability Scanner',
    status: 'active',
    lastCheckIn: new Date(Date.now() - 90_000).toISOString(),
    summary: 'Scanning for known CVEs and risky misconfigurations.',
  },
];

const statusMessages: Record<AgentStatus['status'], string[]> = {
  active: [
    'Operating normally and collecting telemetry.',
    'No anomalies detected in current monitoring cycle.',
    'Real-time checks are currently healthy.',
  ],
  idle: [
    'Waiting for next scan interval.',
    'No urgent activity right now.',
    'Standing by for event-driven checks.',
  ],
  error: [
    'Encountered a temporary feed timeout.',
    'Retrying after telemetry stream interruption.',
    'Agent recovery in progress after connector error.',
  ],
};

export function getNextMockAgentStatuses(
  previous: AgentStatus[],
): AgentStatus[] {
  return previous.map((agent) => {
    const roll = Math.random();
    let nextStatus = agent.status;

    if (roll > 0.92) {
      nextStatus = 'error';
    } else if (roll > 0.78) {
      nextStatus = 'idle';
    } else {
      nextStatus = 'active';
    }

    const summaries = statusMessages[nextStatus];
    return {
      ...agent,
      status: nextStatus,
      summary: summaries[Math.floor(Math.random() * summaries.length)],
      lastCheckIn: new Date().toISOString(),
    };
  });
}

export const mockSecurityStats: SecurityStats = {
  threatsBlocked24h: 37,
  threatsTrend: 11,
  activeConnections: 142,
  filesMonitored: 18429,
  lastFullScan: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  uptime: '4d 13h',
  healthScore: 78,
  diskUsage: 68,
  memoryUsage: 61,
  cpuUsage: 34,
  logStorageUsage: 57,
};

export const mockRecommendations: Recommendation[] = [
  {
    id: 'rec-1',
    title: 'Update OpenSSH to patch CVE-2024-6387',
    context: 'settings',
    severity: 'warning',
    description: 'Vulnerability Scanner found outdated OpenSSH on one monitored host.',
    recommendation: 'Update OpenSSH to the latest version.',
    relatedAlerts: [],
    targetPath: '/dashboard/settings',
    actionLabel: 'Open settings',
  },
  {
    id: 'rec-2',
    title: 'Review 3 new outbound connections from last 24h',
    context: 'network',
    severity: 'warning',
    description: 'Network Monitor saw unusual destinations outside the normal baseline.',
    recommendation: 'Review these connections and mark as safe if recognized.',
    relatedAlerts: [],
    targetPath: '/dashboard/network',
    actionLabel: 'Review connections',
  },
  {
    id: 'rec-3',
    title: 'Enable 2FA on your admin account',
    context: 'settings',
    severity: 'info',
    description: 'Threat Intelligence flagged account takeover campaigns targeting admin users.',
    recommendation: 'Enable two-factor authentication for better security.',
    relatedAlerts: [],
    targetPath: '/dashboard/settings',
    actionLabel: 'Open settings',
  },
  {
    id: 'rec-4',
    title: 'Investigate repeated PowerShell encoded command usage',
    context: 'apps',
    severity: 'critical',
    description: 'Process Analyzer detected multiple encoded PowerShell invocations.',
    recommendation: 'Review these processes and determine if they are legitimate.',
    relatedAlerts: [],
    targetPath: '/dashboard/apps',
    actionLabel: 'Review apps',
  },
];
