import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'info' | 'warning' | 'danger';

// A note pinned on the page: the outline carries the tone, the text stays ink.
const TONES: Record<Tone, { box: string; title: string }> = {
  info: { box: 'border-primary', title: 'text-primary' },
  warning: { box: 'border-warning', title: 'text-warning' },
  danger: { box: 'border-danger', title: 'text-danger' },
};

/** An error is announced at once (alert); anything else politely (status). */
export function Notice({
  tone,
  title,
  action,
  className,
  children,
}: {
  tone: Tone;
  title?: string | undefined;
  action?: ReactNode;
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'rounded-card border-[2.5px] bg-surface px-4 py-3 text-ink',
        TONES[tone].box,
        className,
      )}
    >
      {title && <p className={cn('font-bold', TONES[tone].title)}>{title}</p>}
      <div className={cn('text-base', title && 'mt-0.5')}>{children}</div>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
