import { Icon } from '@/components/ui';
import { EXAMPLE } from './content';
import { Illustration } from './Illustration';
import { InView } from './InView';

/** 3. What they live: the problem, told as the wholesaler lived it. */
export function Problem() {
  return (
    <section id="probleme" className="lp-section" aria-labelledby="lp-pain-title">
      <div className="lp-wrap lp-pain">
        <InView className="lp-pain__text" threshold={0.5}>
          <h2 id="lp-pain-title" className="lp-h2">
            Tu as déjà commandé à l&apos;aveugle.
          </h2>
          <ul className="lp-pain__list">
            <li>
              <span className="lp-tile-ic" aria-hidden="true">
                <Icon name="box" />
              </span>
              <p>
                Dans le groupe, trente personnes ont écrit « moi je prends ». Tu as commandé{' '}
                {EXAMPLE.ordered} cartons. Trois mois plus tard, {EXAMPLE.unsold} dorment encore au
                dépôt.
              </p>
            </li>
            <li>
              <span className="lp-tile-ic" aria-hidden="true">
                <Icon name="people" />
              </span>
              <p>
                La fois d&apos;après, par peur, tu as pris trop peu. Tout est parti en deux jours,
                et tes clients sont allés chez le voisin.
              </p>
            </li>
            <li>
              <span className="lp-tile-ic" aria-hidden="true">
                <Icon name="receipt" />
              </span>
              <p>
                Et pendant ce temps, ton argent dort dans les cartons : {EXAMPLE.unsold} ×{' '}
                {EXAMPLE.cartonPriceText}, c&apos;est{' '}
                <span className="lp-hl">{EXAMPLE.blocked}</span> bloqués.
              </p>
            </li>
          </ul>
          <p className="lp-pain__punch">
            Ce n&apos;est pas un manque de flair. C&apos;est un manque de chiffres.
          </p>
        </InView>
        <div className="lp-pain__art">
          <Illustration
            name="probleme"
            alt="La grossiste assise sur un carton, soucieuse, au milieu de piles de cartons qui ne se vendent pas."
            sizes="(min-width: 960px) 520px, 100vw"
            ink
          />
        </div>
      </div>
    </section>
  );
}
