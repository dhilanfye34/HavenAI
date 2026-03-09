import { AlertTriangle, Info, Siren } from 'lucide-react';

import { SecurityAlert } from '../types';

interface AlertItemProps {
  alert: SecurityAlert;
  isNewest: boolean;
  onSelect: (alert: SecurityAlert) => void;
}

const severityStyles: Record<SecurityAlert['severity'], string> = {
  critical: 'border-red-500/40 bg-red-500/10 text-red-200',
  warning: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  info: 'border-blue-500/40 bg-blue-500/10 text-blue-200',
};

function severityIcon(severity: SecurityAlert['severity']) {
  if (severity === 'critical') return <Siren className="h-4 w-4" />;
  if (severity === 'warning') return <AlertTriangle className="h-4 w-4" />;
  return <Info className="h-4 w-4" />;
}

export function AlertItem({ alert, isNewest, onSelect }: AlertItemProps) {
  return (
    <button
      onClick={() => onSelect(alert)}
      className={`w-full rounded-lg border p-3 text-left transition hover:border-cyan-400/40 ${severityStyles[alert.severity]} ${
        isNewest ? 'animate-pulse' : ''
      }`}
    >
      <div className="mb-1 flex items-center justify-between gap-2 text-[11px] uppercase tracking-wide">
        <div className="inline-flex items-center gap-1.5">
          {severityIcon(alert.severity)}
          {alert.severity}
        </div>
        <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
      </div>
      <p className="mb-1 text-xs text-gray-200">{alert.source}</p>
      <p className="line-clamp-2 text-sm text-gray-100">{alert.description}</p>
    </button>
  );
}
