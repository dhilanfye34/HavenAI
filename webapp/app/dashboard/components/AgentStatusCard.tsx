import { Activity } from 'lucide-react';
import { AgentStatus } from '../types';

interface AgentStatusCardProps {
  agent: AgentStatus;
}

const statusDot: Record<AgentStatus['status'], string> = {
  active: 'bg-emerald-400',
  idle: 'bg-amber-400',
  error: 'bg-red-500',
};

const statusGlow: Record<AgentStatus['status'], string> = {
  active: 'shadow-[0_0_8px_rgba(52,211,153,0.4)]',
  idle: '',
  error: 'shadow-[0_0_8px_rgba(239,68,68,0.4)]',
};

const statusLabels: Record<AgentStatus['status'], string> = {
  active: 'Active',
  idle: 'Idle',
  error: 'Error',
};

function formatCheckIn(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function AgentStatusCard({ agent }: AgentStatusCardProps) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-white">{agent.name}</p>
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
          <span className={`relative inline-flex h-2 w-2 rounded-full ${statusDot[agent.status]} ${statusGlow[agent.status]}`}>
            {agent.status === 'active' && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
            )}
          </span>
          {statusLabels[agent.status]}
        </span>
      </div>
      <p className="mb-2 line-clamp-2 text-[11px] leading-relaxed text-gray-500">{agent.summary}</p>
      <div className="flex items-center gap-1 text-[10px] text-gray-600">
        <Activity className="h-3 w-3" />
        Last check-in {formatCheckIn(agent.lastCheckIn)}
      </div>
    </div>
  );
}
