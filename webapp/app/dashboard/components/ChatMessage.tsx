import { ChatMessage as ChatMessageType } from '../types';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm transition-all ${
          isUser
            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
            : 'border border-white/[0.08] bg-white/[0.04] text-gray-200'
        }`}
      >
        <p className="whitespace-pre-wrap leading-relaxed">{message.content || ' '}</p>
      </div>
    </div>
  );
}
