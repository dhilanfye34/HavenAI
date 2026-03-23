import { AgentStatus } from '../types';
import { AgentStatusCard } from './AgentStatusCard';

interface AgentPanelProps {
  agents: AgentStatus[];
}

export function AgentPanel({ agents }: AgentPanelProps) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-4">
      <div className="mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Agent Status
        </h2>
        <p className="mt-0.5 text-[11px] text-gray-600">Live heartbeat and latest summaries.</p>
      </div>
      <div className="space-y-2">
        {agents.map((agent) => (
          <AgentStatusCard key={agent.id} agent={agent} />
        ))}
      </div>
    </section>
  );
}
