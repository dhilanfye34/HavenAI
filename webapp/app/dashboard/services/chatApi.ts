import { ChatContextEvent, ChatMessage } from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface StreamChatParams {
  token: string;
  messages: Array<Pick<ChatMessage, 'role' | 'content'>>;
  contextEvents: ChatContextEvent[];
  model?: string;
  onToken: (token: string) => void;
}

export async function streamChatCompletion({
  token,
  messages,
  contextEvents,
  model = 'gpt-4o-mini',
  onToken,
}: StreamChatParams): Promise<void> {
  const response = await fetch(`${API_URL}/chat/stream`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
      context_events: contextEvents,
      model,
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

      const parsed = JSON.parse(payload) as {
        type: 'token' | 'done' | 'error';
        content?: string;
        message?: string;
      };

      if (parsed.type === 'token' && parsed.content) {
        onToken(parsed.content);
      }

      if (parsed.type === 'error') {
        throw new Error(parsed.message || 'Chat stream failed');
      }
    }
  }
}
