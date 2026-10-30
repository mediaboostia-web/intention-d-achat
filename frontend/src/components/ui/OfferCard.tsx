// One pass in the grid (lot 8): its name, price, length, answers and who it
// is for, an optional badge, and the action the page gives it (« Choisir »,
// a note, a link). Shared by the pass page and the home page.
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from './Badge';
import { Card } from './Card';

export function OfferCard({
  name,
  price,
  durationLabel,
  responsesLabel,
  forWho,
  badge,
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
      <p className="mt-1 text-ink-soft">{forWho}</p>
      <p className="mt-3 font-sign text-2xl text-ink">{price}</p>
      <p className="text-ink-soft">
        {durationLabel} · {responsesLabel}
      </p>
      <div className="mt-auto pt-4">{action}</div>
    </Card>
  );
}
