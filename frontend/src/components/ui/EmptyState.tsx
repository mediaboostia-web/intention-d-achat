import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Logo } from './Logo';

/** An empty screen is an invitation to act: say what to do next. */
export function EmptyState({
  title,
  action,
  className,
  children,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-start gap-3 rounded-card border-2 border-dashed border-ink-muted/60 p-6',
        className,
      )}
    >
      <Logo variant="mark" size={40} />
      <h3 className="font-hand text-2xl font-bold text-primary">{title}</h3>
      <div className="text-ink-soft">{children}</div>
      {action}
    </div>
  );
}
