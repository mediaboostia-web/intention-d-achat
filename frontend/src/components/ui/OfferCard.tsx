// One pass in the grid (lot 8): its name, price, length, answers and who it
// is for, an optional badge, what it opens (greyed out: what it leaves out),
// and the action the page gives it (« Choisir », a note, a link). Shared by
// the pass page and the home page.
import type { ReactNode } from 'react';
import type { CardFeature } from '@/lib/tamani/billing-view';
import { cn } from '@/lib/utils';
import { Badge } from './Badge';
import { Card } from './Card';
import { Icon } from './icons';

export function OfferCard({
  name,
  price,
  durationLabel,
  responsesLabel,
  forWho,
  badge,
  features,
  action,
  className,
}: {
  name: string;
  /** Already written in the shop's words: « 9 900 FCFA », « Sur devis ». */
  price: string;
  durationLabel: string;
  responsesLabel: string;
  forWho: string;
  badge?: string | undefined;
  features?: readonly CardFeature[] | undefined;
  action: ReactNode;
  className?: string | undefined;
}) {
  return (
    <Card className={cn('flex h-full flex-col', badge && 'border-accent', className)}>
      {badge && (
        <Badge tone="accent" className="self-start">
          {badge}
        </Badge>
      )}
      <h3 className={cn('font-hand text-2xl font-bold text-primary', badge && 'mt-2')}>{name}</h3>
      {/* Two lines kept, so the prices line up across the grid. */}
      <p className="mt-1 min-h-12 text-ink-soft">{forWho}</p>
      <p className="mt-3 font-sign text-2xl text-ink">{price}</p>
      <p className="text-ink-soft">
        {durationLabel} · {responsesLabel}
      </p>
      {features && (
        <ul className="mt-4 grid gap-2 border-t-2 border-grid pt-4 text-sm">
          {features.map((f) => (
            <li
              key={f.label}
              data-included={f.included}
              className={cn('flex items-start gap-2', f.included ? 'text-ink' : 'text-ink-muted')}
            >
              <Icon
                name={f.included ? 'check' : 'close'}
                className={cn('mt-px size-4 shrink-0', f.included && 'text-success')}
              />
              <span>
                {!f.included && <span className="sr-only">Pas compris : </span>}
                {f.label}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto pt-4">{action}</div>
    </Card>
  );
}
