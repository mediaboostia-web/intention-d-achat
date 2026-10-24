import type { VerdictTone } from '@/lib/design/tokens';
import { verdictBasis, verdictDisplay, type VerdictCode } from '@/lib/tamani/verdict-display';
import { cn } from '@/lib/utils';

const TONE_TEXT: Record<VerdictTone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  neutral: 'text-neutral-verdict',
  primary: 'text-primary',
};

function HandArrow() {
  return (
    <svg viewBox="0 0 46 26" width="40" height="23" aria-hidden="true" className="-ml-2 block">
      <path
        d="M42 22 C 30 6, 18 4, 6 9 M11 3.5 L5 9 L12 13"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The verdict as a rubber stamp (the screen's one bold element), the
 * sentence that says what to do, and what the estimate rests on.
 */
export function VerdictCard({
  code,
  realistic,
  completedResponses,
  reference,
  unitLabel,
  basis,
  className,
}: {
  code: VerdictCode;
  realistic: number;
  completedResponses: number;
  reference: number | null;
  unitLabel?: string;
  basis?: { low: number; high: number; interestedCount: number };
  className?: string;
}) {
  const unit = unitLabel === undefined ? {} : { unitLabel };
  const d = verdictDisplay({ code, realistic, completedResponses, reference, ...unit });

  return (
    <section aria-label={`Verdict : ${d.stampWord}`} className={cn('relative', className)}>
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
        <div
          className={cn(
            'stamp relative inline-block max-w-full min-w-0 -rotate-[5deg] rounded-card border-[3.5px] px-4 pt-3.5 pb-3 text-center',
            d.tone === 'neutral' ? 'border-dashed' : 'border-solid',
            'border-current',
            TONE_TEXT[d.tone],
          )}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-[5px] rounded-[10px] border-[1.5px] border-current"
          />
          <p className="font-sign text-sm tracking-[0.3em] uppercase">{d.stampWord}</p>
          <p className="mt-1 font-sign text-5xl leading-none break-words">{d.figure}</p>
          <p className="mt-1.5 text-xs font-bold tracking-[0.2em] uppercase">{d.unit}</p>
        </div>
        {d.note && (
          <p className="mt-9 -rotate-[4deg] font-hand text-lg leading-tight whitespace-nowrap text-primary">
            <HandArrow />
            {d.note}
          </p>
        )}
      </div>
      <p className="mt-5 text-lg leading-snug font-bold text-ink">{d.sentence}</p>
      {basis && (
        <p className="mt-1 text-sm text-ink-soft">
          {verdictBasis({ ...basis, completedResponses, ...unit })}
        </p>
      )}
    </section>
  );
}
