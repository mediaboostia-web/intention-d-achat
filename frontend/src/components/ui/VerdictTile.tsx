import type { VerdictTone } from '@/lib/design/tokens';
import type { CampaignVerdictLine, VerdictGauge } from '@/lib/tamani/home-view';
import { cn } from '@/lib/utils';
import { Button } from './Button';
import { Icon } from './icons';

const TONE_TEXT: Record<VerdictTone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  neutral: 'text-neutral-verdict',
  primary: 'text-primary',
};

const TONE_FILL: Record<VerdictTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  neutral: 'bg-neutral-verdict',
  primary: 'bg-primary',
};

/**
 * One campaign on the desktop home (lot 7a): its verdict as a small stamp,
 * a gauge, the calculation written by hand, and the same two buttons at the
 * foot of every tile so they line up across the row.
 */
export function VerdictTile({
  line,
  answers,
  calc,
  gauge,
}: {
  line: CampaignVerdictLine;
  /** "34 réponses", ", verdict offert" when the free plan's verdict was given. */
  answers: string;
  calc: string | null;
  gauge: VerdictGauge | null;
}) {
  const filled = gauge ? Math.min(100, Math.round((gauge.value / gauge.max) * 100)) : 0;
  return (
    <article className="frame flex h-full min-w-0 flex-col rounded-card bg-surface p-4">
      <h3 className="leading-snug font-bold break-words text-ink">{line.title}</h3>
      <p className="text-sm text-ink-muted">{answers}</p>
      <div className="mt-4 flex min-h-12 flex-wrap items-center gap-x-3 gap-y-2">
        {line.locked ? (
          <span className="inline-flex items-center gap-1.5 rounded-control border-2 border-dashed border-ink-muted px-2.5 py-1 text-sm font-bold text-ink-muted">
            <Icon name="lock" className="size-4" />
            {line.word}
          </span>
        ) : (
          <span
            className={cn(
              'stamp inline-block -rotate-[4deg] rounded-case border-[3px] border-current px-2.5 pt-1.5 pb-1 font-sign text-base leading-none tracking-[0.12em] uppercase',
              line.tone === 'neutral' && 'border-dashed',
              TONE_TEXT[line.tone],
            )}
          >
            {line.word}
          </span>
        )}
        {line.figure && (
          <span className="font-sign text-2xl leading-none break-words text-ink">
            {line.figure}
          </span>
        )}
      </div>
      {gauge && (
        <div
          role="meter"
          aria-label={gauge.label}
          aria-valuemin={0}
          aria-valuemax={gauge.max}
          aria-valuenow={gauge.value}
          className="mt-4 h-2.5 overflow-hidden rounded-full bg-grid"
        >
          <div
            className={cn('h-full rounded-full', TONE_FILL[line.tone])}
            style={{ width: `${filled}%` }}
          />
        </div>
      )}
      {calc && <p className="mt-2 font-hand text-lg leading-snug text-ink-soft">{calc}</p>}
      <div className="mt-auto flex gap-2 pt-4">
        <Button href={line.href} variant="secondary" className="min-w-0 flex-1 px-3">
          Voir le détail
        </Button>
        <Button
          href={`${line.href}?onglet=interesses`}
          variant="ghost"
          aria-label="Voir les intéressés"
          title="Voir les intéressés"
          className="px-3"
        >
          <Icon name="people" />
        </Button>
      </div>
    </article>
  );
}
