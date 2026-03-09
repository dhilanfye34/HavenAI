import { SecurityAlert } from '../types';

const minutesAgo = (value: number) =>
  new Date(Date.now() - value * 60 * 1000).toISOString();

export const initialMockAlerts: SecurityAlert[] = [
  {
    id: 'alert-1',
    severity: 'critical',
    timestamp: minutesAgo(4),
    source: 'Network Monitor',
    description:
      'Unusual outbound connection detected to IP 203.0.113.42 on port 4444.',
    details:
      'Traffic pattern resembles command-and-control beaconing with repeated 90-second intervals.',
  },
  {
    id: 'alert-2',
    severity: 'warning',
    timestamp: minutesAgo(9),
    source: 'File Integrity Watcher',
    description: 'File modification detected: /etc/shadow',
    details:
      'Protected credential file changed outside expected maintenance window.',
  },
  {
    id: 'alert-3',
    severity: 'critical',
    timestamp: minutesAgo(14),
    source: 'Process Analyzer',
    description:
      'New process spawned: powershell.exe with encoded arguments.',
    details:
      'Command line includes base64 payload and hidden execution flags.',
  },
  {
    id: 'alert-4',
    severity: 'info',
    timestamp: minutesAgo(20),
    source: 'Threat Intelligence',
    description:
      'Matched one local IP against newly published suspicious host list.',
    details:
      'No active sessions currently tied to the flagged host. Monitoring elevated.',
  },
  {
    id: 'alert-5',
    severity: 'warning',
    timestamp: minutesAgo(32),
    source: 'Vulnerability Scanner',
    description:
      'Outdated package found: OpenSSL 1.1.1 with known vulnerabilities.',
    details:
      'Patch recommended to latest stable release to reduce exposure to known CVEs.',
  },
  {
    id: 'alert-6',
    severity: 'info',
    timestamp: minutesAgo(44),
    source: 'Network Monitor',
    description: 'New external DNS resolver observed in outbound traffic.',
    details:
      'Resolver differs from baseline corporate DNS. Source process under review.',
  },
  {
    id: 'alert-7',
    severity: 'warning',
    timestamp: minutesAgo(58),
    source: 'File Integrity Watcher',
    description: 'Startup script changed: /usr/local/bin/launch.sh',
    details:
      'Script hash mismatch detected compared to previous trusted version.',
  },
  {
    id: 'alert-8',
    severity: 'critical',
    timestamp: minutesAgo(72),
    source: 'Threat Intelligence',
    description:
      'Domain contacted by local process listed in active phishing campaign.',
    details:
      'Threat feed marks domain as high-risk with recent malware delivery reports.',
  },
  {
    id: 'alert-9',
    severity: 'info',
    timestamp: minutesAgo(95),
    source: 'Vulnerability Scanner',
    description: 'Scheduled weekly scan completed successfully.',
    details: 'No critical CVEs introduced since previous scan baseline.',
  },
  {
    id: 'alert-10',
    severity: 'warning',
    timestamp: minutesAgo(120),
    source: 'Process Analyzer',
    description: 'Unsigned binary executed from temp directory.',
    details:
      'Binary launched from user profile temp folder and attempted outbound network call.',
  },
];

const rotatingAlerts: Omit<SecurityAlert, 'id' | 'timestamp'>[] = [
  {
    severity: 'warning',
    source: 'Network Monitor',
    description: 'Unexpected RDP session attempt from unfamiliar subnet.',
    details: 'Three failed authentication attempts detected in 2 minutes.',
  },
  {
    severity: 'info',
    source: 'Threat Intelligence',
    description: 'New IOC bundle downloaded from premium threat feed.',
    details: 'Indicators synced and available for local correlation.',
  },
  {
    severity: 'critical',
    source: 'Process Analyzer',
    description: 'Potential credential dumping behavior detected in lsass memory access.',
    details: 'Process requested suspicious memory read patterns; immediate review recommended.',
  },
];

let rotatingIndex = 0;

export function getNextMockAlert(): SecurityAlert {
  const next = rotatingAlerts[rotatingIndex % rotatingAlerts.length];
  rotatingIndex += 1;

  return {
    id: `mock-live-${Date.now()}`,
    timestamp: new Date().toISOString(),
    ...next,
  };
}
