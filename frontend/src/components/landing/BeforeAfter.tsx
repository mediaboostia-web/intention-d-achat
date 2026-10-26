import { Button, Icon } from '@/components/ui';
import { CompareSlider } from './CompareSlider';
import { EXAMPLE } from './content';
import { Illustration } from './Illustration';

const BEFORE = [
  "Tu commandes au feeling, d'après les messages du groupe.",
  `${EXAMPLE.ordered} cartons commandés, ${EXAMPLE.unsold} dorment au dépôt.`,
  `${EXAMPLE.blocked} bloqués pendant des mois.`,
  'Quand tu manques, tes clients vont ailleurs.',
];
const WITH_TAMANI = [
  'Tes clients disent combien ils veulent, en moins de 30 secondes.',
  `Tu commandes ${EXAMPLE.advised} cartons : ceux qui vont vraiment partir.`,
  'Ton argent reste libre pour le prochain arrivage.',
  "À l'arrivée, tu sais qui prévenir sur WhatsApp.",
];
const SIZES = '(min-width: 1180px) 1100px, 100vw';

/** 6. Before / after: the same depot, the same arrival. */
export function BeforeAfter() {
  return (
    <section
      id="avant-apres"
      className="lp-panel lp-panel--paper lp-section"
      aria-labelledby="lp-ba-title"
    >
      <div className="lp-wrap">
        <div className="lp-center">
          <h2 id="lp-ba-title" className="lp-h2">
            Avant, tu devines. Avec Tamani, tu sais.
          </h2>
          <p className="lp-lead">Le même dépôt, le même arrivage. Glisse la barre pour comparer.</p>
        </div>
        <CompareSlider
          label="Comparer le dépôt avant et avec Tamani"
          before={
            <Illustration
              name="avant"
              alt="Avant : le dépôt déborde de cartons invendus et la grossiste est inquiète."
              sizes={SIZES}
              fill
              className="object-cover"
            />
          }
          after={
            <Illustration
              name="apres"
              alt="Avec Tamani : le dépôt est rangé, les cartons partent en livraison et la grossiste sourit."
              sizes={SIZES}
              fill
              className="object-cover"
            />
          }
        />
        <div className="lp-vs">
          <div className="lp-vs__col lp-vs__col--before">
            <h3>Avant</h3>
            <ul>
              {BEFORE.map((line) => (
                <li key={line}>
                  <Icon name="close" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div className="lp-vs__col lp-vs__col--after">
            <h3>Avec Tamani</h3>
            <ul>
              {WITH_TAMANI.map((line) => (
                <li key={line}>
                  <Icon name="check" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="lp-cta-row">
          <p>Fais ce calcul avant ton prochain arrivage.</p>
          <Button href="/signup" size="lg" className="lp-press">
            Essayer gratuitement
          </Button>
        </div>
      </div>
    </section>
  );
}
