import { AlertTriangle, Info, Siren } from 'lucide-react';
import { SecurityAlert } from '../types';

interface AlertItemProps {
  alert: SecurityAlert;
  isNewest: boolean;
  onSelect: (alert: SecurityAlert) => void;
}

const severityStyles: Record<SecurityAlert['severity'], string> = {
  critical: 'border-red-500/20 bg-red-500/[0.06] text-red-300 hover:border-red-500/40',
  warning: 'border-amber-500/20 bg-amber-500/[0.06] text-amber-300 hover:border-amber-500/40',
  info: 'border-blue-500/20 bg-blue-500/[0.06] text-blue-300 hover:border-blue-500/40',
};

function severityIcon(severity: SecurityAlert['severity']) {
  if (severity === 'critical') return <Siren className="h-3.5 w-3.5" />;
  if (severity === 'warning') return <AlertTriangle className="h-3.5 w-3.5" />;
  return <Info className="h-3.5 w-3.5" />;
}

export function AlertItem({ alert, isNewest, onSelect }: AlertItemProps) {
  return (
    <button
      onClick={() => onSelect(alert)}
      className={`w-full rounded-xl border p-3 text-left transition-all duration-300 ${severityStyles[alert.severity]} ${
        isNewest ? 'animate-pulse-glow' : ''
      }`}
    >
      <div className="mb-1 flex items-center justify-between gap-2 text-[11px] uppercase tracking-wide">
        <div className="inline-flex items-center gap-1.5">
          {severityIcon(alert.severity)}
          {alert.severity}
        </div>
        <span className="text-gray-500">{new Date(alert.timestamp).toLocaleTimeString()}</span>
      </div>
      <p className="mb-1 text-[11px] text-gray-400">{alert.source}</p>
      <p className="line-clamp-2 text-sm text-gray-200">{alert.description}</p>
    </button>
  );
}
