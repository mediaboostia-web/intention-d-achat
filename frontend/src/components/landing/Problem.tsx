import type { CSSProperties } from 'react';
import { Icon, type IconName } from '@/components/ui';
import { Illustration } from './Illustration';
import { InView } from './InView';

const PAINS: readonly { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'box',
    title: "De l'argent qui dort dans ton stock",
    text: "Tu commandes un carton entier, et une partie reste invendue pendant des semaines. C'est ton argent qui attend sur l'étagère.",
  },
  {
    icon: 'bell',
    title: 'Trop de messages, pas assez de commandes',
    text: "Tu postes tes produits et tout le monde t'écrit : le prix, la taille, la livraison… Tu réponds toute la journée, et les clients prêts à payer se perdent dans la foule.",
  },
  {
    icon: 'search',
    title: 'Le client ne sait pas ce qui reste',
    text: "Il ne sait pas combien de pièces sont disponibles, ni ce qu'il peut vraiment commander. Alors il attend, ou il achète ailleurs.",
  },
  {
    icon: 'receipt',
    title: 'Commander gros sans savoir si ça va plaire',
    text: "Avant une grosse commande, tu n'as aucun moyen simple de savoir si tes clients sont vraiment intéressés.",
  },
  {
    icon: 'people',
    title: 'Tu ne connais pas vraiment tes clients',
    text: 'Qui achète souvent ? Qui commande et ne vient jamais chercher ? Sans liste, impossible de le savoir.',
  },
];

/** 3. What Tamani helps avoid: the five situations the porteur named (lot 12). */
export function Problem() {
  return (
    <section id="probleme" className="lp-section" aria-labelledby="lp-pain-title">
      <div className="lp-wrap">
        <div className="lp-pain">
          <div className="lp-pain__text">
            <h2 id="lp-pain-title" className="lp-h2">
              Tu reconnais ces situations ?
            </h2>
            <p className="lp-lead">Ce sont les galères que Tamani t&apos;aide à éviter.</p>
          </div>
          <div className="lp-pain__art">
            <Illustration
              name="probleme"
              alt="La grossiste assise sur un carton, soucieuse, au milieu de piles de cartons qui ne se vendent pas."
              sizes="(min-width: 960px) 520px, 100vw"
              ink
            />
          </div>
        </div>
        <InView as="ul" className="lp-pains" threshold={0.2}>
          {PAINS.map((p, i) => (
            <li key={p.title} className="lp-pains__card" style={{ '--i': i } as CSSProperties}>
              <span className="lp-tile-ic" aria-hidden="true">
                <Icon name={p.icon} />
              </span>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </li>
          ))}
        </InView>
        <p className="lp-pain__punch">Et si un seul lien réglait tout ça ?</p>
      </div>
    </section>
  );
}
