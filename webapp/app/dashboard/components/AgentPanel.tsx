import { AgentStatus } from '../types';
import { AgentStatusCard } from './AgentStatusCard';

interface AgentPanelProps {
  agents: AgentStatus[];
}

export function AgentPanel({ agents }: AgentPanelProps) {
  return (
    <section className="rounded-2xl border border-gray-700 bg-gray-900/70 p-3">
      <div className="mb-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
          Agent Status
        </h2>
        <p className="text-xs text-gray-500">Live heartbeat and latest summaries.</p>
      </div>
      <div className="space-y-2">
        {agents.map((agent) => (
          <AgentStatusCard key={agent.id} agent={agent} />
        ))}
      </div>
    </section>
  );
}
