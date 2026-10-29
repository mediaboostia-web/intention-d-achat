// The pass meter (lot 8): the answers counted against the pass, one bar
// whose colour warns from 80 %, the line under it, and the way to a pass.
// The button says « Prendre un autre pass » once a pass runs: there are no
// top-ups, another pass adds the answers.
import { meterLine, meterTone, passCta, type PassUsageView } from '@/lib/tamani/billing-view';
import { PLANS } from '@/lib/tamani/plans';
import { cn } from '@/lib/utils';
import { Button } from './Button';
import { Card } from './Card';

const BAR = { ok: 'bg-success', warning: 'bg-warning', full: 'bg-danger' } as const;

export function PassMeter({
  usage,
  canBuy,
  now,
  className,
}: {
  usage: PassUsageView;
  /** Shows the button to the pass page; a MEMBER reads it there too. */
  canBuy: boolean;
  now: Date;
  className?: string;
}) {
  const tone = meterTone(usage.used, usage.included);
  const filled =
    usage.included > 0 ? Math.min(100, Math.round((usage.used / usage.included) * 100)) : 100;
  return (
    <section aria-label="Ton pass" className={className}>
      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-hand text-2xl font-bold text-primary">{PLANS[usage.plan].label}</h2>
          {usage.inGrace && <span className="font-bold text-warning">En grâce</span>}
        </div>
        <div
          role="meter"
          aria-label="Réponses du pass"
          aria-valuemin={0}
          aria-valuemax={usage.included}
          aria-valuenow={usage.used}
          data-tone={tone}
          className="mt-3 h-3 overflow-hidden rounded-full bg-grid"
        >
          <div className={cn('h-full rounded-full', BAR[tone])} style={{ width: `${filled}%` }} />
        </div>
        <p className="mt-2 text-ink-soft">{meterLine(usage, now)}</p>
        {canBuy && (
          <Button
            className="mt-4"
            href="/app/abonnement"
            variant={tone === 'ok' ? 'secondary' : 'primary'}
          >
            {passCta(usage.plan)}
          </Button>
        )}
      </Card>
    </section>
  );
}
