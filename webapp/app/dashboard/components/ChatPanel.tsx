import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles, Trash2, X } from 'lucide-react';
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
  onRemoveContext?: (index: number) => void;
  onClearContext?: () => void;
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
  onRemoveContext,
  onClearContext,
}: ChatPanelProps) {
  const messagesRef = useRef<HTMLDivElement>(null);
  const [contextExpanded, setContextExpanded] = useState(false);

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
        <div className="border-t border-white/[0.06] bg-white/[0.02]">
          <button
            type="button"
            onClick={() => setContextExpanded((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-2 text-left"
          >
            <span className="text-[10px] uppercase tracking-wider text-gray-600">
              Context ({contextEvents.length})
            </span>
            <div className="flex items-center gap-2">
              {onClearContext && (
                <span
                  role="button"
                  onClick={(e) => { e.stopPropagation(); onClearContext(); }}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-gray-600 transition hover:bg-white/[0.06] hover:text-red-400"
                  title="Clear all context"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear
                </span>
              )}
              {contextExpanded ? <ChevronDown className="h-3 w-3 text-gray-600" /> : <ChevronUp className="h-3 w-3 text-gray-600" />}
            </div>
          </button>
          {contextExpanded && (
            <div className="max-h-40 space-y-1 overflow-y-auto px-4 pb-2">
              {contextEvents.map((event, index) => (
                <div
                  key={`${event.timestamp}-${index}`}
                  className="group flex items-start gap-1.5 rounded-lg border border-white/[0.04] bg-white/[0.02] px-2.5 py-1.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium text-gray-400">{event.source}</p>
                    <p className="truncate text-[11px] text-gray-500">{event.description}</p>
                  </div>
                  {onRemoveContext && (
                    <button
                      type="button"
                      onClick={() => onRemoveContext(index)}
                      className="mt-0.5 shrink-0 rounded p-0.5 text-gray-700 opacity-0 transition hover:bg-white/[0.06] hover:text-red-400 group-hover:opacity-100"
                      title="Remove this context"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {!contextExpanded && (
            <div className="px-4 pb-2">
              <p className="truncate text-[11px] text-gray-600">
                {contextEvents[0]?.source}: {contextEvents[0]?.description}
              </p>
            </div>
          )}
        </div>
      )}

      <ChatInput disabled={isResponding} onSend={onSendMessage} />
    </section>
  );
}
