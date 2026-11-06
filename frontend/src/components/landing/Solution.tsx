import { Button, Icon, type IconName } from '@/components/ui';
import { Orbit } from './Orbit';
import { LANDING_SIGNUP_HREF, LANDING_SIGNUP_LABEL } from '@/lib/tamani/landing';

const GAINS: readonly { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'clock',
    title: 'Tes clients répondent en moins de 30 secondes',
    text: "Ils touchent le lien, choisissent la quantité, et c'est fait. Pas d'application à installer, pas de compte à créer.",
  },
  {
    icon: 'user',
    title: 'Tu sais qui veut quoi, combien et où',
    text: "Chaque réponse te donne le produit, la quantité, le quartier de livraison et le numéro. Le client accepte d'abord que tu le recontactes.",
  },
  {
    icon: 'link',
    title: "Tu sais quel canal t'apporte des clients",
    text: 'Tu crées un lien par groupe ou par réseau, et tu vois enfin si tes clients viennent de WhatsApp, de TikTok ou de Facebook.',
  },
  {
    icon: 'home',
    title: 'Pas besoin de site web',
    text: 'Ton produit a sa page, prête à partager. Rien à construire, rien à payer en plus.',
  },
  {
    icon: 'eye',
    title: 'Ton client voit ce qui est disponible',
    text: '« Disponible maintenant » ou « bientôt », et, si tu veux, le nombre de pièces en stock.',
  },
  {
    icon: 'check',
    title: 'Tamani te dit combien commander',
    text: 'À partir des réponses, Tamani calcule une quantité réaliste et te donne un avis clair avant que tu commandes.',
  },
];

/** 4. Features: one link for every client; each network buzzes as it feeds Tamani. */
export function Solution() {
  return (
    <section
      id="fonctionnalites"
      className="lp-panel lp-panel--wash lp-section"
      aria-labelledby="lp-orbit-title"
    >
      <div className="lp-wrap">
        <div className="lp-center">
          <h2 id="lp-orbit-title" className="lp-h2">
            Un seul lien pour tous tes clients
          </h2>
          <p className="lp-lead">
            Un produit, un lien. Tu le partages partout où sont tes clients, et toutes les réponses
            arrivent au même endroit.
          </p>
        </div>
        <Orbit />
        <ul className="lp-gains">
          {GAINS.map((g) => (
            <li key={g.title}>
              <span className="lp-tile-ic" aria-hidden="true">
                <Icon name={g.icon} />
              </span>
              <div>
                <b>{g.title}</b>
                <p>{g.text}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="lp-cta-row">
          <Button href={LANDING_SIGNUP_HREF} size="lg" className="lp-press">
            {LANDING_SIGNUP_LABEL}
          </Button>
        </div>
      </div>
    </section>
  );
}
