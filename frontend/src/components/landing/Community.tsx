import { Button, Icon, Logo } from '@/components/ui';
import {
  LANDING_LINKS,
  type LandingLinks,
  LANDING_SIGNUP_HREF,
  LANDING_SIGNUP_LABEL,
} from '@/lib/tamani/landing';
import { Illustration } from './Illustration';

// What the group is for, in the copy brief's words (§5.9); nothing it does not do.
const IN_THE_GROUP = [
  'Pose tes questions aux autres vendeurs.',
  'Échange des conseils de vente.',
  'Découvre des tutoriels.',
  'Partage tes expériences sur WhatsApp, TikTok et Facebook.',
] as const;

/**
 * 7. Join the community (lot 12): the sellers' WhatsApp group. Laid out like
 * the porteur's reference (2026-11-06): one card on the blue panel, the
 * drawing fading in on the right, a dark band at the bottom. Without the
 * group's link the button invites to the waitlist, so no button leads nowhere.
 */
export function Community({ links = LANDING_LINKS }: { links?: LandingLinks }) {
  const group = links.community;

  return (
    <section
      id="communaute"
      className="lp-panel lp-panel--blue lp-club"
      aria-labelledby="lp-club-title"
    >
      <div className="lp-wrap">
        <div className="lp-club__card">
          <div className="lp-club__art">
            <Illustration
              name="communaute"
              alt="Des vendeuses et des vendeurs discutent et rient sous un auvent bleu et jaune au marché. L'une d'elles montre son téléphone."
              sizes="(min-width: 900px) 640px, 100vw"
            />
          </div>
          <div className="lp-club__body">
            <h2 id="lp-club-title">
              <span>Entre vendeurs,</span> partageons ce qui fonctionne.
            </h2>
            <p className="lp-club__text">
              Rejoins la communauté WhatsApp des vendeurs Tamani. Tu peux y échanger des conseils,
              découvrir des tutoriels et partager tes expériences de vente sur WhatsApp, TikTok et
              Facebook.
            </p>
            <ul className="lp-club__list">
              {IN_THE_GROUP.map((line) => (
                <li key={line}>
                  <span aria-hidden="true">
                    <Icon name="check" />
                  </span>
                  {line}
                </li>
              ))}
            </ul>
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
                  Rejoindre le groupe WhatsApp
                </Button>
              ) : (
                <Button href={LANDING_SIGNUP_HREF} size="lg" className="lp-press">
                  {LANDING_SIGNUP_LABEL}
                </Button>
              )}
            </div>
            <p className="lp-club__small">Participation gratuite.</p>
          </div>
          <div className="lp-club__bar">
            <p>Entre vendeurs, on s&apos;entraide.</p>
            <Logo size={26} tone="inverse" />
          </div>
        </div>
      </div>
    </section>
  );
}
