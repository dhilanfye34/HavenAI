import { useEffect, useState } from 'react';

import { AgentStatus } from '../types';
import {
  getNextMockAgentStatuses,
  initialAgentStatuses,
} from '../services/mockAgents';

export function useAgentStatus() {
  const [agents, setAgents] = useState<AgentStatus[]>(initialAgentStatuses);

  useEffect(() => {
    const interval = setInterval(() => {
      setAgents((current) => getNextMockAgentStatuses(current));
    }, 25_000);

    return () => clearInterval(interval);
  }, []);

  return { agents };
}
