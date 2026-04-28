import { ChatContextEvent, ChatMessage } from '../types';
import { apiUrl } from '../../lib/apiConfig';

interface StreamChatParams {
  token: string;
  messages: Array<Pick<ChatMessage, 'role' | 'content'>>;
  contextEvents: ChatContextEvent[];
  model?: string;
  conversationId?: string | null;
  onToken: (token: string) => void;
  onDone?: (conversationId?: string) => void;
}

export async function streamChatCompletion({
  token,
  messages,
  contextEvents,
  model = 'gpt-4o-mini',
  conversationId,
  onToken,
  onDone,
}: StreamChatParams): Promise<void> {
  const response = await fetch(apiUrl('/chat/stream'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
      context_events: contextEvents,
      model,
      conversation_id: conversationId || null,
    }),
  });

  if (!response.ok || !response.body) {
    const detail = await response.text();
    throw new Error(detail || 'Unable to connect to AI backend');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';

    for (const event of events) {
      if (!event.startsWith('data: ')) continue;
      const payload = event.slice(6).trim();
      if (!payload) continue;

      let parsed: { type: string; content?: string; message?: string; conversation_id?: string };
      try {
        parsed = JSON.parse(payload);
      } catch {
        continue; // skip malformed SSE frames
      }

      if (parsed.type === 'token' && parsed.content) {
        onToken(parsed.content);
      }

      if (parsed.type === 'done') {
        onDone?.(parsed.conversation_id);
      }

      if (parsed.type === 'error') {
        throw new Error(parsed.message || 'Chat stream failed');
      }
    }
  }
}

export interface ConversationSummary {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export async function listConversations(
  token: string,
  limit: number = 20,
): Promise<ConversationSummary[]> {
  const response = await fetch(apiUrl(`/chat/conversations?limit=${limit}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return [];
  const data = await response.json();
  return data.conversations ?? [];
}
