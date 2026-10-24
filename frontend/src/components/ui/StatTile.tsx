import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function StatTile({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn('frame rounded-card bg-surface p-4', className)}>
      <p className="text-sm font-bold text-ink-soft">{label}</p>
      <p className="mt-1 font-sign text-4xl text-primary">{value}</p>
      {hint && <p className="mt-1 text-sm text-ink-soft">{hint}</p>}
    </div>
  );
}
