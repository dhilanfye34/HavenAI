import { ChatMessage as ChatMessageType } from '../types';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm shadow transition ${
          isUser
            ? 'bg-cyan-500 text-white'
            : 'border border-gray-700 bg-gray-800 text-gray-100'
        }`}
      >
        <p className="whitespace-pre-wrap leading-relaxed">{message.content || ' '}</p>
      </div>
    </div>
  );
}
