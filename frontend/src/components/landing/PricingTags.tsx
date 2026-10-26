'use client';

import { useState, type CSSProperties } from 'react';
import { Button, Icon } from '@/components/ui';
import { pricingTiers } from '@/lib/tamani/landing';
import { PLANS, type PlanId } from '@/lib/tamani/plans';
import { cn, formatPrice } from '@/lib/utils';
import { InView } from './InView';

const { FREE, PRO, BUSINESS } = PLANS;

const FOR: Record<PlanId, string> = {
  FREE: 'Pour essayer avec tes premiers produits.',
  PRO: 'Pour commander juste, à chaque arrivage.',
  BUSINESS: 'Pour les très grandes communautés.',
};

const PERKS: Record<PlanId, readonly { text: string; strong?: boolean; off?: boolean }[]> = {
  FREE: [
    { text: `${FREE.maxActiveCampaigns} campagnes en cours` },
    { text: `${FREE.monthlyResponses} réponses par mois` },
    { text: 'Les réponses et leurs totaux' },
    { text: 'Commandes et carnet de clients, numéros masqués' },
    { text: 'La mention « Propulsé par Tamani »', off: true },
  ],
  PRO: [
    { text: 'Le verdict et la quantité conseillée', strong: true },
    { text: 'Campagnes illimitées' },
    { text: `${formatPrice(PRO.monthlyResponses)} réponses par mois` },
    { text: 'Les numéros de tes clients, et WhatsApp en un geste' },
    { text: 'Un lien par groupe, pour voir lequel répond le mieux' },
    { text: 'La fiabilité de chaque client' },
    { text: 'Export des réponses pour Excel' },
  ],
  BUSINESS: [
    { text: "Tout ce qu'offre Pro" },
    { text: `${formatPrice(BUSINESS.monthlyResponses)} réponses par mois` },
    { text: `${BUSINESS.seats} membres d'équipe (bientôt)` },
  ],
};

const CTA: Record<PlanId, string> = {
  FREE: 'Essayer gratuitement',
  PRO: 'Choisir Pro',
  BUSINESS: 'Choisir Business',
};

/** The month / year switch and the three price tags hanging from the stall's wire. */
export function PricingTags() {
  const [months, setMonths] = useState<1 | 12>(1);
  const tiers = pricingTiers(months);

  return (
    <>
      <div className="lp-period" role="group" aria-label="Durée de paiement">
        <button type="button" aria-pressed={months === 1} onClick={() => setMonths(1)}>
          Au mois
        </button>
        <button type="button" aria-pressed={months === 12} onClick={() => setMonths(12)}>
          À l&apos;année <small>2 mois offerts</small>
        </button>
      </div>
      <InView className="lp-stall" threshold={0.3}>
        <span className="lp-stall__wire" aria-hidden="true" />
        <div className="lp-tags">
          {tiers.map((t, k) => {
            const pro = t.id === 'PRO';
            return (
              <article
                key={t.id}
                className={cn('lp-ptag', pro && 'lp-ptag--pro')}
                style={{ '--k': k } as CSSProperties}
              >
                {pro && <span className="lp-ptag__flag">Recommandé</span>}
                <h3>{t.label}</h3>
                <p className="lp-ptag__for">{FOR[t.id]}</p>
                <p className="lp-ptag__price">
                  {/* A new key on each change replays the flip. */}
                  <span key={t.price} className={cn('lp-num', pro && 'lp-hl lp-hl--on')}>
                    {t.price}
                  </span>{' '}
                  <small>{t.unit}</small>
                </p>
                <p className="lp-ptag__per">{t.per}</p>
                {pro && (
                  <p className="lp-ptag__value">Moins qu&apos;un carton qui dort au dépôt.</p>
                )}
                <ul>
                  {PERKS[t.id].map((p) => (
                    <li key={p.text} {...(p.off ? { 'data-off': '' } : {})}>
                      <Icon name={p.off ? 'lock' : 'check'} />
                      {p.strong ? <b>{p.text}</b> : p.text}
                    </li>
                  ))}
                </ul>
                <Button
                  href="/signup"
                  variant={pro ? 'primary' : 'secondary'}
                  size={pro ? 'lg' : 'md'}
                  className={cn(pro && 'lp-press')}
                >
                  {CTA[t.id]}
                </Button>
              </article>
            );
          })}
        </div>
      </InView>
    </>
  );
}
