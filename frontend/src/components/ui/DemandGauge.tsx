import { cn } from '@/lib/utils';

/**
 * Demand against the reference (the planned order, else the stock),
 * coloured in like notebook squares: ten squares up to the reference, the
 * realistic demand in ink, the announced one hatched beyond it.
 */
export function DemandGauge({
  realistic,
  announced,
  reference,
  className,
}: {
  realistic: number;
  announced: number;
  reference: number;
  className?: string;
}) {
  const per = reference / 10;
  const fill = (n: number, i: number) => Math.min(Math.max((n - i * per) / per, 0), 1) * 100;
  return (
    <div className={cn(className)}>
      <div className="pen grid grid-cols-10 gap-[3px]" aria-hidden="true">
        {Array.from({ length: 10 }, (_, i) => {
          const r = fill(realistic, i);
          const a = fill(announced, i);
          return (
            <span
              key={i}
              className="h-[26px] rounded-case border-2 border-ink"
              style={{
                background: [
                  `linear-gradient(90deg, var(--color-primary) ${r}%, transparent ${r}%)`,
                  `linear-gradient(90deg, transparent ${a}%, var(--color-surface) ${a}%)`,
                  'repeating-linear-gradient(-55deg, var(--color-primary) 0 1.5px, var(--color-surface) 1.5px 6px)',
                ].join(', '),
              }}
            />
          );
        })}
      </div>
      <p className="mt-1.5 flex flex-wrap justify-between gap-x-3 font-hand text-base text-ink-muted">
        <span>
          réaliste <b className="text-primary">{realistic}</b>
        </span>
        <span>
          annoncé <b className="text-primary">{announced}</b>
        </span>
        <span>
          prévu <b className="text-primary">{reference}</b>
        </span>
      </p>
      <p className="sr-only">
        Demande réaliste {realistic}, annoncée {announced}, pour {reference} prévues.
      </p>
    </div>
  );
}
