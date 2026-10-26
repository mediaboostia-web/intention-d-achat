import { Button, Icon, type IconName } from '@/components/ui';
import { Orbit } from './Orbit';

const GAINS: readonly { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'clock',
    title: 'Moins de 30 secondes',
    text: 'Tes clients répondent sans compte et sans application.',
  },
  {
    icon: 'link',
    title: 'Tout au même endroit',
    text: 'De WhatsApp comme de TikTok, les réponses se rangent toutes seules.',
  },
  {
    icon: 'check',
    title: 'Le bon chiffre',
    text: 'Tamani te dit combien commander, et te montre le calcul.',
  },
];

/** 4. The solution: one link everywhere; each network buzzes as it feeds Tamani. */
export function Solution() {
  return (
    <section
      id="solution"
      className="lp-panel lp-panel--wash lp-section"
      aria-labelledby="lp-orbit-title"
    >
      <div className="lp-wrap">
        <div className="lp-center">
          <h2 id="lp-orbit-title" className="lp-h2">
            Un seul lien. Partout où sont tes clients.
          </h2>
          <p className="lp-lead">
            Avec Tamani, tu demandes à tes clients avant d&apos;acheter. Colle ton lien dans tes
            groupes, tes statuts, tes pages ou tes pubs : chaque réponse arrive chez toi.
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
          <p>Tes clients sont déjà dans tes groupes.</p>
          <Button href="/signup" size="lg" className="lp-press">
            Créer mon lien gratuit
          </Button>
        </div>
      </div>
    </section>
  );
}
