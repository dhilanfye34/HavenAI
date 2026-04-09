'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { ChatMessage } from '../types';
import { useDashboard } from '../context/DashboardContext';

interface ChatBubbleProps {
  message: ChatMessage;
  size?: 'compact' | 'full';
}

type Segment =
  | { kind: 'text'; content: string }
  | { kind: 'action'; action: 'mark_safe'; category: 'processes' | 'hosts' | 'emails'; id: string };

// Match [[ACTION:mark_safe:<category>:<id>]]
// Category is one word; id can contain spaces, dots, dashes, colons (but not ']]')
const ACTION_RE = /\[\[ACTION:mark_safe:(processes|hosts|emails):([^\]]+?)\]\]/g;

function parseSegments(content: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  ACTION_RE.lastIndex = 0;
  while ((match = ACTION_RE.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: 'text', content: content.slice(lastIndex, match.index) });
    }
    segments.push({
      kind: 'action',
      action: 'mark_safe',
      category: match[1] as 'processes' | 'hosts' | 'emails',
      id: match[2].trim(),
    });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    segments.push({ kind: 'text', content: content.slice(lastIndex) });
  }
  return segments;
}

function MarkSafeButton({
  category,
  id,
}: {
  category: 'processes' | 'hosts' | 'emails';
  id: string;
}) {
  const { safelist } = useDashboard();
  const [done, setDone] = useState(() => safelist.isSafe(category, id));

  const label =
    category === 'processes' ? 'app'
    : category === 'hosts' ? 'destination'
    : 'email';

  if (done) {
    return (
      <div className="my-2 inline-flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs font-medium text-green-600 dark:text-green-400">
        <CheckCircle2 className="h-4 w-4" />
        Marked {`"${id}"`} as safe
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        safelist.markSafe(category, id);
        setDone(true);
      }}
      className="my-2 inline-flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-500/20 dark:text-blue-400"
    >
      <ShieldCheck className="h-4 w-4" />
      Mark this {label} as safe
    </button>
  );
}

const MARKDOWN_COMPONENTS = {
  p: ({ children }: any) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }: any) => <strong className="font-semibold">{children}</strong>,
  ul: ({ children }: any) => <ul className="mb-2 ml-4 list-disc space-y-1 last:mb-0">{children}</ul>,
  ol: ({ children }: any) => <ol className="mb-2 ml-4 list-decimal space-y-1 last:mb-0">{children}</ol>,
  li: ({ children }: any) => <li className="text-sm leading-relaxed">{children}</li>,
  h1: ({ children }: any) => <p className="mb-2 text-base font-semibold last:mb-0">{children}</p>,
  h2: ({ children }: any) => <p className="mb-2 text-base font-semibold last:mb-0">{children}</p>,
  h3: ({ children }: any) => <p className="mb-1.5 text-sm font-semibold last:mb-0">{children}</p>,
  code: ({ children, className }: any) => {
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
  pre: ({ children }: any) => <>{children}</>,
  a: ({ href, children }: any) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline hover:text-blue-600">
      {children}
    </a>
  ),
  hr: () => <hr className="my-3" style={{ borderColor: 'var(--haven-border)' }} />,
  blockquote: ({ children }: any) => (
    <blockquote className="my-2 border-l-2 border-blue-500 pl-3 text-haven-text-secondary">
      {children}
    </blockquote>
  ),
};

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

  const segments = parseSegments(message.content);

  return (
    <div className="flex justify-start">
      <div
        className={`${maxWidth} rounded-2xl px-4 py-3 text-sm leading-relaxed text-haven-text chat-markdown`}
        style={{ border: '1px solid var(--haven-border)', background: 'var(--haven-surface)' }}
      >
        {segments.map((seg, i) => {
          if (seg.kind === 'text') {
            // Trim leading/trailing whitespace around the marker so there's no orphan newline
            const trimmed = seg.content.replace(/\n{3,}/g, '\n\n');
            if (!trimmed.trim()) return null;
            return (
              <ReactMarkdown key={`t-${i}`} components={MARKDOWN_COMPONENTS}>
                {trimmed}
              </ReactMarkdown>
            );
          }
          return <MarkSafeButton key={`a-${i}`} category={seg.category} id={seg.id} />;
        })}
      </div>
    </div>
  );
}
