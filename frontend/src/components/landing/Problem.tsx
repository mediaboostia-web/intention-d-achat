import type { CSSProperties } from 'react';
import { Icon, type IconName } from '@/components/ui';
import { Illustration } from './Illustration';
import { InView } from './InView';

const PAINS: readonly { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'box',
    title: 'Ton argent peut rester bloqué dans les invendus.',
    text: "Tu commandes une quantité importante sans connaître précisément l'intérêt de tes clients. Si une partie ne se vend pas, ton capital reste immobilisé dans le stock.",
  },
  {
    icon: 'bell',
    title: 'Les demandes se dispersent dans tes messages.',
    text: 'Prix, tailles, couleurs, disponibilité, livraison… Les conversations s’accumulent sur plusieurs groupes et réseaux. Retrouver les demandes devient difficile.',
  },
  {
    icon: 'search',
    title: 'Tu manques de visibilité avant de commander.',
    text: 'Tu envisages un nouvel arrivage, mais tu ne sais pas encore combien de personnes sont intéressées ni quelles quantités elles souhaitent.',
  },
  {
    icon: 'link',
    title: 'Tu ne sais pas toujours quel canal apporte les demandes.',
    text: 'Entre tes groupes WhatsApp, Facebook et TikTok, il peut être difficile de comparer les réponses reçues par canal.',
  },
];

/** 3. The problem before the order (copy brief §5.5): four situations. */
export function Problem() {
  return (
    <section id="probleme" className="lp-section" aria-labelledby="lp-pain-title">
      <div className="lp-wrap">
        <div className="lp-pain">
          <div className="lp-pain__text">
            <h2 id="lp-pain-title" className="lp-h2">
              Avant de commander, tu aimerais savoir ce que tes clients veulent vraiment.
            </h2>
            <p className="lp-lead">
              Tu publies tes produits, les messages arrivent et les questions se multiplient. Mais
              au moment de passer commande auprès de ton fournisseur, tu dois encore estimer la
              quantité à acheter.
            </p>
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
        <p className="lp-pain__punch">
          Et si tu pouvais recueillir ces demandes avant de passer ta commande ?
        </p>
      </div>
    </section>
  );
}
