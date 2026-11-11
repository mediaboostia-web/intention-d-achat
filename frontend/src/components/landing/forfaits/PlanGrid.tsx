import type { CSSProperties } from 'react';
import { Button, OfferCard } from '@/components/ui';
import {
  LANDING_LINKS,
  type LandingLinks,
  type PricingOffer,
  LANDING_LAUNCH_MODE,
  LANDING_PLAN_LABEL,
  LANDING_SIGNUP_HREF,
  LANDING_SIGNUP_LABEL,
} from '@/lib/tamani/landing';

// Waitlist mode: every card says « Être prévenu à l'ouverture » (copy brief §6.2).
const TRIAL_LABEL = LANDING_LAUNCH_MODE === 'waitlist' ? LANDING_PLAN_LABEL : LANDING_SIGNUP_LABEL;
import { FORFAITS_TABS, forfaitOffers } from '@/lib/tamani/landing-forfaits';

function CardAction({ offer, links }: { offer: PricingOffer; links: LandingLinks }) {
  if (offer.id === 'TRIAL')
    return (
      <Button href={LANDING_SIGNUP_HREF} className="lp-press lp-go w-full">
        {TRIAL_LABEL}
      </Button>
    );
  if (offer.id === 'UNLIMITED')
    return links.whatsappContact ? (
      <Button
        href={links.whatsappContact}
        variant="whatsapp"
        className="w-full"
        target="_blank"
        rel="noopener noreferrer"
      >
        Demander les informations sur WhatsApp
      </Button>
    ) : null;
  return (
    <>
      <p className="lp-plans__rest">Et tout le reste est inclus</p>
      <Button
        href={LANDING_SIGNUP_HREF}
        variant={offer.badge ? 'primary' : 'secondary'}
        className={offer.badge ? 'lp-press lp-go w-full' : 'w-full'}
      >
        {LANDING_PLAN_LABEL}
      </Button>
    </>
  );
}

/**
 * The cards of both tabs, rendered by the server; landing.css shows the
 * group whose radio is checked (and both where :has is unknown).
 */
export function PlanGrid({ links = LANDING_LINKS }: { links?: LandingLinks }) {
  const offers = new Map(forfaitOffers().map((o) => [o.id, o]));
  return (
    <>
      {FORFAITS_TABS.map((t) => (
        <ul key={t.id} className="lp-plans__grid" data-tab={t.id} aria-label={`Pass : ${t.label}`}>
          {t.offers.flatMap((id, i) => {
            const o = offers.get(id);
            if (!o) return [];
            return [
              <li key={id} style={{ '--i': i } as CSSProperties}>
                <OfferCard
                  name={o.name}
                  price={o.price}
                  durationLabel={o.durationLabel}
                  responsesLabel={o.responsesLabel}
                  forWho={o.forWho}
                  badge={o.badge}
                  features={o.features}
                  action={<CardAction offer={o} links={links} />}
                  className="lp-plans__card"
                />
              </li>,
            ];
          })}
        </ul>
      ))}
    </>
  );
}
