import { Button } from '@/components/ui';
import {
  LANDING_LINKS,
  type LandingLinks,
  LANDING_SIGNUP_HREF,
  LANDING_SIGNUP_LABEL,
} from '@/lib/tamani/landing';
import { Illustration } from './Illustration';

/**
 * 7. Join the community (lot 12): the sellers' WhatsApp group. Without its
 * link the section invites to the account instead, so no button leads nowhere.
 */
export function Community({ links = LANDING_LINKS }: { links?: LandingLinks }) {
  const group = links.community;

  return (
    <section
      id="communaute"
      className="lp-panel lp-panel--blue lp-club"
      aria-labelledby="lp-club-title"
    >
      <div className="lp-wrap lp-club__in">
        <div>
          <h2 id="lp-club-title">Rejoins la communauté des vendeurs Tamani</h2>
          <p className="lp-club__text">
            Un groupe WhatsApp de vendeurs qui partagent ce qui marche : des astuces pour vendre sur
            WhatsApp, TikTok et Facebook, les tutoriels Tamani, des idées pour faire grandir ton
            audience et des recommandations entre vendeurs.
          </p>
          <div className="lp-club__ctas lp-btn-row">
            {group ? (
              <Button
                href={group}
                variant="whatsapp"
                size="lg"
                target="_blank"
                rel="noopener"
                className="lp-press"
              >
                Rejoindre le groupe
              </Button>
            ) : (
              <Button href={LANDING_SIGNUP_HREF} size="lg" className="lp-press bg-accent text-ink">
                {LANDING_SIGNUP_LABEL}
              </Button>
            )}
          </div>
          <p className="lp-club__small">C&apos;est gratuit.</p>
        </div>
        <div className="lp-club__photo">
          <Illustration
            name="communaute"
            alt="Des vendeuses et des vendeurs discutent et rient sous un auvent bleu et jaune au marché. L'une d'elles montre son téléphone."
            sizes="(min-width: 960px) 540px, 100vw"
          />
          <p>Entre vendeurs, on s&apos;entraide.</p>
        </div>
      </div>
    </section>
  );
}
