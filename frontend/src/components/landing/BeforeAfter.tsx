import { Button, Icon } from '@/components/ui';
import { CompareSlider } from './CompareSlider';
import { EXAMPLE } from './content';
import { Illustration } from './Illustration';

const BEFORE = [
  'Des dizaines de messages pour des renseignements, et peu de ventes',
  'Tu commandes ton stock sans savoir qui va payer',
  "Tu ne sais pas quel groupe ou quel réseau t'apporte des clients",
  'Tu ne sais pas quels produits vont partir',
  "De l'argent bloqué dans des invendus",
];
const AFTER = [
  'Une liste de clients prêts à être livrés',
  "Tu testes un produit auprès de tes clients avant d'en commander un carton",
  "Tu vois quels canaux t'apportent vraiment des clients",
  'Tu sais quels produits partent, et lesquels attendre',
  'Ton argent reste dans ta poche, pas dans ton stock',
];
const SIZES = '(min-width: 1180px) 1100px, 100vw';

/** 6. Benefits: before / after, the same depot, the same arrival. */
export function BeforeAfter() {
  return (
    <section
      id="benefices"
      className="lp-panel lp-panel--paper lp-section"
      aria-labelledby="lp-ba-title"
    >
      <div className="lp-wrap">
        <div className="lp-center">
          <h2 id="lp-ba-title" className="lp-h2">
            Tu vends comme avant. En mieux.
          </h2>
          <p className="lp-lead">
            Tamani ne change pas ta façon de travailler. Il t&apos;évite de perdre ton temps et ton
            argent.
          </p>
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
        <p className="lp-ba__example">
          Exemple : sans Tamani, {EXAMPLE.ordered} cartons commandés et {EXAMPLE.unsold} invendus,
          soit <span className="lp-hl">{EXAMPLE.blocked}</span> bloqués. Avec Tamani,{' '}
          {EXAMPLE.advised} cartons : ceux que tes clients ont demandés.
        </p>
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
            <h3>Après</h3>
            <ul>
              {AFTER.map((line) => (
                <li key={line}>
                  <Icon name="check" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="lp-cta-row">
          <Button href="/signup" size="lg" className="lp-press">
            Essayer gratuitement
          </Button>
        </div>
      </div>
    </section>
  );
}
