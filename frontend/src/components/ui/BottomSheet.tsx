import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// The popup's sheet rising from the bottom (spec §5.3). CSS-only slide-in,
// switched off under prefers-reduced-motion. The market-stall awning tells
// the respondent they are at the shop's stall.
export function BottomSheet({
  label,
  awning = true,
  className,
  children,
}: {
  label: string;
  awning?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={label}
      className={cn(
        'relative overflow-hidden rounded-t-sheet bg-paper shadow-sheet',
        'animate-sheet-up motion-reduce:animate-none',
        className,
      )}
    >
      {awning ? (
        <div aria-hidden="true" className="awning" />
      ) : (
        <span aria-hidden="true" className="mx-auto mt-3 block h-1.5 w-11 rounded-full bg-grid" />
      )}
      <div className="px-5 pt-4 pb-6">{children}</div>
    </section>
  );
}
