import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

// Popup choice: one tap per step (spec §5.3). CSS-only feedback — the popup
// never loads an animation library (no-motion-in-popup.test.ts).
export interface ChoiceButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-pressed'
> {
  selected?: boolean;
  /** The screen's main answer ("Oui"): primary color + pressed shadow. */
  emphasis?: boolean;
}

export function ChoiceButton({
  selected = false,
  emphasis = false,
  type = 'button',
  className,
  children,
  ...rest
}: ChoiceButtonProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        'frame flex min-h-16 w-full items-center justify-center rounded-card px-4 text-xl font-bold',
        'transition-transform active:translate-x-0.5 active:translate-y-0.5 motion-reduce:transition-none',
        selected
          ? 'bg-accent text-accent-ink'
          : emphasis
            ? 'bg-primary text-primary-ink shadow-press active:shadow-none'
            : 'bg-surface text-ink',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
