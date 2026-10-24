import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Top of a page: the title written by hand, a pencil note, one action. */
export function PageHeader({
  title,
  note,
  action,
  className,
}: {
  title: string;
  note?: ReactNode;
  action?: ReactNode;
  className?: string | undefined;
}) {
  return (
    <header
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6',
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="font-hand text-3xl leading-tight font-bold text-primary sm:text-4xl">
          {title}
        </h1>
        {note && <p className="mt-1 text-sm text-ink-muted">{note}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
