import { Button, Icon } from '@/components/ui';
import { InView } from './InView';
import {
  LANDING_FINAL_LABEL,
  LANDING_FINAL_NOTE,
  LANDING_SIGNUP_HREF,
  LANDING_SLOGAN,
} from '@/lib/tamani/landing';

/** 9. The last call before the footer (copy brief §5.11), then the signature. */
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
          Prépare ta prochaine commande avec de meilleures informations.
        </h2>
        <p className="lp-lead">
          Recueille les intentions de tes clients avant de commander. Partage ton lien, consulte les
          réponses et utilise l’estimation de Tamani pour préparer ton approvisionnement.
        </p>
        <div className="lp-final__cta">
          <Button href={LANDING_SIGNUP_HREF} size="lg" className="lp-press lp-go">
            {LANDING_FINAL_LABEL}
            <Icon name="chevron-right" />
          </Button>
        </div>
        <p className="lp-final__small">{LANDING_FINAL_NOTE}</p>
        <p className="lp-final__small">Tamani. {LANDING_SLOGAN}</p>
      </div>
    </InView>
  );
}
