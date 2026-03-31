'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import { ChatBubble } from '../components/ChatBubble';

export default function ChatPage() {
  const {
    chatMessages,
    chatIsResponding,
    chatConnectionStatus,
    chatSendMessage,
  } = useDashboard();

  const [input, setInput] = useState('');
  const messagesRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on mount (instant) and on new messages (smooth)
  const hasScrolledRef = useRef(false);
  useEffect(() => {
    if (!messagesRef.current) return;
    if (!hasScrolledRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
      hasScrolledRef.current = true;
    } else {
      messagesRef.current.scrollTo({
        top: messagesRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
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
    <div className="flex h-[calc(100vh-7rem)] flex-col animate-fade-in">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-haven-text">Chat</h1>
          <p className="mt-1 text-sm text-haven-text-secondary">
            Ask Haven Assistant about your security, alerts, or device activity.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full px-3 py-1.5" style={{ border: '1px solid var(--haven-border)' }}>
          <span className={`h-2 w-2 rounded-full ${
            chatConnectionStatus === 'connected' ? 'bg-green-500'
            : chatConnectionStatus === 'degraded' ? 'bg-amber-500'
            : 'bg-red-500'
          }`} />
          <span className="text-xs text-haven-text-tertiary">
            {chatConnectionStatus === 'connected' ? 'Online' : chatConnectionStatus === 'degraded' ? 'Connecting' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesRef}
        className="flex-1 overflow-y-auto rounded-2xl p-5"
        style={{ border: '1px solid var(--haven-border)', background: 'var(--haven-chat-bg)' }}
      >
        <div className="space-y-4">
          {chatMessages.length === 0 && (
            <div className="flex h-full min-h-[200px] items-center justify-center">
              <div className="text-center">
                <MessageCircle className="mx-auto h-10 w-10 text-haven-text-tertiary" />
                <p className="mt-3 text-sm text-haven-text-secondary">
                  Ask me anything about your security.
                </p>
                <p className="mt-1 text-xs text-haven-text-tertiary">
                  I can help with alerts, device activity, and recommendations.
                </p>
              </div>
            </div>
          )}
          {chatMessages.filter((msg) => msg.content).map((msg) => (
            <ChatBubble key={msg.id} message={msg} size="full" />
          ))}
          {chatIsResponding && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1.5 rounded-2xl px-4 py-3 text-haven-text-tertiary" style={{ border: '1px solid var(--haven-border)' }}>
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="mt-4">
        <div className="flex items-center gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            className="input-field !rounded-full !py-3 !px-5"
            disabled={chatIsResponding}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || chatIsResponding}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white transition hover:bg-blue-600 disabled:opacity-40"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
