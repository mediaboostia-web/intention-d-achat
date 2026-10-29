'use client';

import type { CSSProperties } from 'react';
import { Button, Icon } from '@/components/ui';
import { pricingTiers } from '@/lib/tamani/landing';
import type { PlanId } from '@/lib/tamani/plans';
import { cn } from '@/lib/utils';
import { InView } from './InView';

// Lot 8, task 2: the trial and the five passes as price tags. Task 12
// replaces this with the porteur's scrollable rail of cards.
const FOR: Partial<Record<PlanId, string>> = {
  TRIAL: 'Pour voir Tamani marcher sur un produit.',
  WEEK: 'Pour un arrivage à écouler vite.',
  TWO_WEEKS: 'Pour deux semaines de ventes.',
  MONTH: 'Pour vendre tout le mois.',
  MONTH_PLUS: 'Pour un groupe actif.',
  MONTH_MAX: 'Pour les grands groupes.',
};

/** The price tags hanging from the stall's wire. */
export function PricingTags() {
  return (
    <InView className="lp-stall" threshold={0.3}>
      <span className="lp-stall__wire" aria-hidden="true" />
      <div className="lp-tags">
        {pricingTiers().map((t, k) => {
          const trial = t.id === 'TRIAL';
          return (
            <article key={t.id} className="lp-ptag" style={{ '--k': k } as CSSProperties}>
              <h3>{t.label}</h3>
              <p className="lp-ptag__for">{FOR[t.id]}</p>
              <p className="lp-ptag__price">
                <span className="lp-num">{t.price}</span> <small>{t.unit}</small>
              </p>
              <p className="lp-ptag__per">{t.per}</p>
              <ul>
                <li>
                  <Icon name="check" />
                  {trial ? 'Sans liens par groupe ni export' : 'Tout Tamani, campagnes illimitées'}
                </li>
              </ul>
              <Button
                href="/signup"
                variant={trial ? 'primary' : 'secondary'}
                className={cn(trial && 'lp-press')}
              >
                {trial ? 'Essayer gratuitement' : 'Choisir'}
              </Button>
            </article>
          );
        })}
      </div>
    </InView>
  );
}
