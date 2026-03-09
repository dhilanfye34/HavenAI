import { Activity } from 'lucide-react';

import { AgentStatus } from '../types';

interface AgentStatusCardProps {
  agent: AgentStatus;
}

const statusClasses: Record<AgentStatus['status'], string> = {
  active: 'bg-green-400',
  idle: 'bg-amber-400',
  error: 'bg-red-500',
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
    <div className="rounded-xl border border-gray-700 bg-gray-800 p-3 transition hover:border-gray-600">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-gray-100">{agent.name}</p>
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-300">
          <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${statusClasses[agent.status]}`}>
            {agent.status === 'active' && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-70" />
            )}
          </span>
          {statusLabels[agent.status]}
        </span>
      </div>
      <p className="mb-2 line-clamp-2 text-xs text-gray-400">{agent.summary}</p>
      <div className="flex items-center gap-1 text-[11px] text-gray-500">
        <Activity className="h-3 w-3" />
        Last check-in {formatCheckIn(agent.lastCheckIn)}
      </div>
    </div>
  );
}
