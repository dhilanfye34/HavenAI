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

async function persistRefreshedCredentials(data: {
  access_token?: string;
  refresh_token?: string;
}): Promise<string | null> {
  if (!data.access_token) return null;

  localStorage.setItem('access_token', data.access_token);
  if (data.refresh_token) {
    localStorage.setItem('refresh_token', data.refresh_token);
  }

  const havenai = (window as any).havenai;
  if (havenai?.saveCredentials) {
    let user: any;
    try {
      const rawUser = localStorage.getItem('user');
      user = rawUser ? JSON.parse(rawUser) : undefined;
    } catch {
      user = undefined;
    }

    try {
      const current = (await havenai.getCredentials?.()) ?? {};
      await havenai.saveCredentials({
        accessToken: data.access_token,
        refreshToken: data.refresh_token || current.refreshToken,
        user: current.user || user,
        deviceId: current.deviceId,
      });
      await havenai.syncAgentAuth?.({
        accessToken: data.access_token,
        refreshToken: data.refresh_token || current.refreshToken,
        user: current.user || user,
      });
    } catch {
      // localStorage has already been updated; Electron store sync is best-effort.
    }
  }

  return data.access_token;
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return null;

  try {
    const response = await fetch(apiUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) return null;
    return persistRefreshedCredentials(await response.json());
  } catch {
    return null;
  }
}

function getRefreshedToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function fetchChatStream(
  token: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const doFetch = (accessToken: string) =>
    fetch(apiUrl('/chat/stream'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

  const response = await doFetch(token);
  if (response.status !== 401) return response;

  const refreshedToken = await getRefreshedToken();
  if (!refreshedToken) return response;

  return doFetch(refreshedToken);
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
  const response = await fetchChatStream(token, {
    messages,
    context_events: contextEvents,
    model,
    conversation_id: conversationId || null,
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
  const fetchConversations = (accessToken: string) =>
    fetch(apiUrl(`/chat/conversations?limit=${limit}`), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

  let response = await fetchConversations(token);
  if (response.status === 401) {
    const refreshedToken = await getRefreshedToken();
    if (refreshedToken) {
      response = await fetchConversations(refreshedToken);
    }
  }

  if (!response.ok) return [];
  const data = await response.json();
  return data.conversations ?? [];
}
