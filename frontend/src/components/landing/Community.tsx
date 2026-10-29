import { Button, Icon } from '@/components/ui';
import { LANDING_LINKS, type LandingLinks } from '@/lib/tamani/landing';
import { Illustration } from './Illustration';

/**
 * 8. Join the community. With the WhatsApp group link it invites to the group
 * and to the account; without it, to the account only, so no button leads nowhere.
 */
export function Community({ links = LANDING_LINKS }: { links?: LandingLinks }) {
  const group = links.community;
  const perks = group
    ? [
        'Des astuces pour que tes clients répondent',
        'Les nouveautés de Tamani en premier',
        "Une vraie personne pour t'aider",
      ]
    : ["3 jours d'essai gratuit", 'Sans carte bancaire', 'Ton premier lien en 3 minutes'];

  return (
    <section
      id="communaute"
      className="lp-panel lp-panel--blue lp-club"
      aria-labelledby="lp-club-title"
    >
      <div className="lp-wrap lp-club__in">
        <div>
          <h2 id="lp-club-title">Rejoins les grossistes qui demandent avant d&apos;acheter.</h2>
          <p className="lp-club__text">
            {group
              ? "Dans le groupe WhatsApp de Tamani, des grossistes et des importateurs partagent leurs astuces, posent leurs questions et découvrent les nouveautés en premier. C'est gratuit."
              : "Crée ton compte et lance ta première campagne aujourd'hui. Tes clients répondent en moins de 30 secondes."}
          </p>
          <ul className="lp-club__list">
            {perks.map((p) => (
              <li key={p}>
                <Icon name="check" />
                {p}
              </li>
            ))}
          </ul>
          <div className="lp-club__ctas lp-btn-row">
            <Button href="/signup" size="lg" className="lp-press bg-accent text-ink">
              Essayer gratuitement
            </Button>
            {group && (
              <Button href={group} variant="whatsapp" size="lg" target="_blank" rel="noopener">
                Rejoindre le groupe
              </Button>
            )}
          </div>
          <p className="lp-club__small">
            3 jours d&apos;essai gratuit, sans carte bancaire. Ton premier lien est prêt en 3
            minutes.
          </p>
        </div>
        <div className="lp-club__photo">
          <Illustration
            name="communaute"
            alt="Des grossistes, femmes et hommes, discutent et rient sous un auvent bleu et jaune au marché. L'une d'elles montre son téléphone."
            sizes="(min-width: 960px) 540px, 100vw"
          />
          <p>Entre grossistes, on s&apos;entraide.</p>
        </div>
      </div>
    </section>
  );
}
