import { useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
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
  connected: 'bg-emerald-400',
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
    <section className="flex h-[calc(100vh-11rem)] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl">
      <div className="border-b border-white/[0.06] bg-gradient-to-r from-cyan-500/[0.06] to-violet-500/[0.04] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <div>
              <h2 className="text-sm font-semibold text-white">
                Security Assistant
              </h2>
              <p className="text-[11px] text-gray-500">
                Ask about alerts and system posture.
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] text-gray-400">
            <span className={`h-1.5 w-1.5 rounded-full ${indicatorColor[connectionStatus]}`} />
            {connectionLabel}
          </div>
        </div>
      </div>

      <div ref={messagesRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isResponding && (
          <div className="inline-flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs text-gray-400">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-400 [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-400 [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-400" />
            Thinking...
          </div>
        )}
      </div>

      {contextEvents.length > 0 && (
        <div className="max-h-24 overflow-y-auto border-t border-white/[0.06] bg-white/[0.02] px-4 py-2">
          <p className="mb-1 text-[10px] uppercase tracking-wider text-gray-600">
            Context ({contextEvents.length})
          </p>
          <div className="space-y-0.5">
            {contextEvents.slice(0, 3).map((event, index) => (
              <p key={`${event.timestamp}-${index}`} className="truncate text-[11px] text-gray-500">
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
