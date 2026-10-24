import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Ledger rows: label, dotted leader, value. Two grid squares (36px) per row. */
export function DataList({
  items,
  className,
}: {
  items: ReadonlyArray<{ id: string; label: ReactNode; value: ReactNode }>;
  className?: string;
}) {
  return (
    <dl className={cn('flex flex-col', className)}>
      {items.map((item) => (
        <div key={item.id} className="flex h-9 items-baseline gap-1.5 leading-9">
          <dt className="flex min-w-0 flex-1 items-baseline gap-1.5">
            <span className="truncate">{item.label}</span>
            <span
              aria-hidden="true"
              className="min-w-4 flex-1 -translate-y-1.5 border-b-2 border-dotted border-ink-muted/45"
            />
          </dt>
          <dd className="shrink-0 font-bold tabular-nums">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
