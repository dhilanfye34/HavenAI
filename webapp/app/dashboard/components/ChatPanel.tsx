import { useEffect, useRef } from 'react';

import { ChatConnectionStatus, ChatMessage, ChatContextEvent } from '../types';
import { ChatInput } from './ChatInput';
import { ChatMessage as MessageBubble } from './ChatMessage';

interface ChatPanelProps {
  messages: ChatMessage[];
  isResponding: boolean;
  connectionStatus: ChatConnectionStatus;
  connectionLabel: string;
  contextEvents: ChatContextEvent[];
  onSendMessage: (message: string) => Promise<void> | void;
}

const indicatorColor: Record<ChatConnectionStatus, string> = {
  connected: 'bg-green-400',
  degraded: 'bg-amber-400',
  offline: 'bg-red-500',
};

export function ChatPanel({
  messages,
  isResponding,
  connectionStatus,
  connectionLabel,
  contextEvents,
  onSendMessage,
}: ChatPanelProps) {
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesRef.current?.scrollTo({
      top: messagesRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, isResponding]);

  return (
    <section className="flex h-[calc(100vh-10rem)] flex-col overflow-hidden rounded-2xl border border-gray-700 bg-gray-900/80">
      <div className="border-b border-gray-700 bg-gray-800/80 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-200">
              Security Assistant
            </h2>
            <p className="text-xs text-gray-400">
              Ask plain-English questions about alerts and system posture.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-700 bg-gray-900 px-2.5 py-1 text-xs text-gray-300">
            <span className={`h-2 w-2 rounded-full ${indicatorColor[connectionStatus]}`} />
            {connectionLabel}
          </div>
        </div>
      </div>

      <div ref={messagesRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isResponding && (
          <div className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs text-gray-300">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-300 [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-300 [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-300" />
            Assistant is typing...
          </div>
        )}
      </div>

      {contextEvents.length > 0 && (
        <div className="max-h-24 overflow-y-auto border-t border-gray-700 bg-gray-900/95 px-4 py-2">
          <p className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">
            Context Queue ({contextEvents.length})
          </p>
          <div className="space-y-1">
            {contextEvents.slice(0, 3).map((event, index) => (
              <p key={`${event.timestamp}-${index}`} className="truncate text-xs text-gray-400">
                {event.source}: {event.description}
              </p>
            ))}
          </div>
        </div>
      )}

      <ChatInput disabled={isResponding} onSend={onSendMessage} />
    </section>
  );
}
