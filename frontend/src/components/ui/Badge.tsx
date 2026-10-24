import type { ReactNode } from 'react';
import type { VerdictTone } from '@/lib/design/tokens';
import { cn } from '@/lib/utils';

type Tone = VerdictTone | 'accent';

// Outlined like a small stamp; `neutral` is dashed, as the WAIT verdict.
const TONES: Record<Tone, string> = {
  success: 'border-success text-success',
  warning: 'border-warning text-warning',
  danger: 'border-danger text-danger',
  neutral: 'border-dashed border-neutral-verdict text-neutral-verdict',
  primary: 'border-primary text-primary',
  accent: 'border-ink bg-accent text-accent-ink',
};

export function Badge({
  tone,
  className,
  children,
}: {
  tone: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-case border-2 px-2 py-0.5 text-sm font-bold',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
