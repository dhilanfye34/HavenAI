import { FormEvent, KeyboardEvent, useState } from 'react';
import { SendHorizontal } from 'lucide-react';

interface ChatInputProps {
  disabled?: boolean;
  onSend: (message: string) => Promise<void> | void;
}

export function ChatInput({ disabled, onSend }: ChatInputProps) {
  const [value, setValue] = useState('');

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    setValue('');
    await onSend(trimmed);
  };

  const onKeyDown = async (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      await submit();
    }
  };

  return (
    <form onSubmit={submit} className="border-t border-white/[0.06] bg-white/[0.02] p-3">
      <div className="flex items-end gap-2">
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          placeholder="Ask about your security posture, alerts, or recommendations..."
          className="max-h-40 min-h-[52px] w-full resize-y rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition-all duration-300 focus:border-cyan-400/40 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.08)]"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white transition-all duration-300 hover:shadow-[0_0_20px_rgba(34,211,238,0.25)] disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Send message"
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
