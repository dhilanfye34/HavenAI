'use client';

import ReactMarkdown from 'react-markdown';
import { ChatMessage } from '../types';

interface ChatBubbleProps {
  message: ChatMessage;
  size?: 'compact' | 'full';
}

export function ChatBubble({ message, size = 'full' }: ChatBubbleProps) {
  const isUser = message.role === 'user';
  const maxWidth = size === 'compact' ? 'max-w-[85%]' : 'max-w-[75%]';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className={`${maxWidth} rounded-2xl bg-blue-500 px-4 py-3 text-sm leading-relaxed text-white`}>
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div
        className={`${maxWidth} rounded-2xl px-4 py-3 text-sm leading-relaxed text-haven-text chat-markdown`}
        style={{ border: '1px solid var(--haven-border)', background: 'var(--haven-surface)' }}
      >
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-1 last:mb-0">{children}</ul>,
            ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-1 last:mb-0">{children}</ol>,
            li: ({ children }) => <li className="text-sm leading-relaxed">{children}</li>,
            h1: ({ children }) => <p className="mb-2 text-base font-semibold last:mb-0">{children}</p>,
            h2: ({ children }) => <p className="mb-2 text-base font-semibold last:mb-0">{children}</p>,
            h3: ({ children }) => <p className="mb-1.5 text-sm font-semibold last:mb-0">{children}</p>,
            code: ({ children, className }) => {
              const isBlock = className?.includes('language-');
              if (isBlock) {
                return (
                  <pre className="my-2 overflow-x-auto rounded-lg p-3 text-xs" style={{ background: 'var(--haven-bg)' }}>
                    <code>{children}</code>
                  </pre>
                );
              }
              return (
                <code className="rounded px-1 py-0.5 text-xs font-medium" style={{ background: 'var(--haven-bg)' }}>
                  {children}
                </code>
              );
            },
            pre: ({ children }) => <>{children}</>,
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline hover:text-blue-600">
                {children}
              </a>
            ),
            hr: () => <hr className="my-3" style={{ borderColor: 'var(--haven-border)' }} />,
            blockquote: ({ children }) => (
              <blockquote className="my-2 border-l-2 border-blue-500 pl-3 text-haven-text-secondary">
                {children}
              </blockquote>
            ),
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
