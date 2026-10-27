import type { VerdictTone } from '@/lib/design/tokens';
import { cn } from '@/lib/utils';

const TONE_TEXT: Record<VerdictTone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  neutral: 'text-neutral-verdict',
  primary: 'text-primary',
};

/**
 * The rubber stamp: a word, a figure and a unit, in ink, tilted -5 degrees
 * inside a double border. A neutral stamp has a dashed border.
 */
export function Stamp({
  word,
  figure,
  unit,
  tone,
  className,
}: {
  word: string;
  figure: string;
  unit: string;
  tone: VerdictTone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'stamp relative inline-block max-w-full min-w-0 -rotate-[5deg] rounded-card border-[3.5px] px-4 pt-3.5 pb-3 text-center',
        tone === 'neutral' ? 'border-dashed' : 'border-solid',
        'border-current',
        TONE_TEXT[tone],
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-[5px] rounded-[10px] border-[1.5px] border-current"
      />
      <p className="font-sign text-sm tracking-[0.3em] uppercase">{word}</p>
      <p className="mt-1 font-sign text-5xl leading-none break-words">{figure}</p>
      <p className="mt-1.5 text-xs font-bold tracking-[0.2em] uppercase">{unit}</p>
    </div>
  );
}
