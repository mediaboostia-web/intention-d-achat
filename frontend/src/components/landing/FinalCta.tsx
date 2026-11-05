import { Button, Icon } from '@/components/ui';
import { PLANS } from '@/lib/tamani/plans';
import { InView } from './InView';

const { TRIAL } = PLANS;

/** 9. The last call before the footer (lot 12): the trial, its figures from PLANS. */
export function FinalCta() {
  return (
    <InView
      as="section"
      id="final"
      className="lp-panel lp-panel--paper lp-final"
      aria-labelledby="lp-final-title"
      threshold={0.3}
    >
      <div className="lp-wrap lp-center">
        <h2 id="lp-final-title" className="lp-h2">
          Ton prochain stock, commande-le en sachant qui va l&apos;acheter.
        </h2>
        <div className="lp-final__cta">
          <Button href="/signup" size="lg" className="lp-press lp-go">
            Essayer gratuitement
            <Icon name="chevron-right" />
          </Button>
        </div>
        <p className="lp-final__small">
          {TRIAL.durationDays} jours · {TRIAL.includedResponses} réponses · sans carte bancaire
        </p>
      </div>
    </InView>
  );
}
