import { verdictBasis, verdictDisplay, type VerdictCode } from '@/lib/tamani/verdict-display';
import { cn } from '@/lib/utils';
import { Stamp } from './Stamp';

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
        <Stamp word={d.stampWord} figure={d.figure} unit={d.unit} tone={d.tone} />
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
