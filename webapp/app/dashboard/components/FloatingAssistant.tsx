'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import { ChatBubble } from './ChatBubble';

export function FloatingAssistant() {
  const {
    chatMessages,
    chatIsResponding,
    chatConnectionStatus,
    chatSendMessage,
  } = useDashboard();

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const messagesRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom instantly when panel opens, smoothly on new messages
  useEffect(() => {
    if (!messagesRef.current || !open) return;
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [open]);

  useEffect(() => {
    if (!messagesRef.current || !open) return;
    messagesRef.current.scrollTo({
      top: messagesRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [chatMessages, chatIsResponding]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || chatIsResponding) return;
    setInput('');
    chatSendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg transition-all hover:bg-blue-600 hover:scale-105 lg:bottom-6"
          aria-label="Open assistant"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-4 z-40 flex h-[28rem] w-[22rem] flex-col overflow-hidden rounded-2xl border shadow-2xl lg:bottom-6"
          style={{ borderColor: 'var(--haven-border)', background: 'var(--haven-chat-bg)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--haven-border)' }}>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10">
                <MessageCircle className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-haven-text">Haven Assistant</p>
                <div className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    chatConnectionStatus === 'connected' ? 'bg-green-500'
                    : chatConnectionStatus === 'degraded' ? 'bg-amber-500'
                    : 'bg-red-500'
                  }`} />
                  <span className="text-[10px] text-haven-text-tertiary">
                    {chatConnectionStatus === 'connected' ? 'Online' : chatConnectionStatus === 'degraded' ? 'Slow' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-haven-text-tertiary transition hover:bg-haven-surface-hover hover:text-haven-text"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={messagesRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {chatMessages.length === 0 && (
              <div className="flex h-full items-center justify-center">
                <p className="text-center text-xs text-haven-text-tertiary">
                  Ask me about your security, alerts, or what&apos;s happening on your device.
                </p>
              </div>
            )}
            {chatMessages.filter((msg) => msg.content).map((msg) => (
              <ChatBubble key={msg.id} message={msg} size="compact" />
            ))}
            {chatIsResponding && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl border px-3.5 py-2.5 text-haven-text-tertiary" style={{ borderColor: 'var(--haven-border)' }}>
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t p-3" style={{ borderColor: 'var(--haven-border)' }}>
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything..."
                className="input-field !rounded-full !py-2.5 !px-4 !text-sm"
                disabled={chatIsResponding}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || chatIsResponding}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white transition hover:bg-blue-600 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
