import { Button, Icon } from '@/components/ui';
import { CompareSlider } from './CompareSlider';
import { Illustration } from './Illustration';
import { LANDING_SIGNUP_HREF, LANDING_SIGNUP_LABEL } from '@/lib/tamani/landing';

const BEFORE = [
  'Les demandes arrivent dans plusieurs conversations.',
  'Tu estimes les quantités à commander avec peu d’informations.',
  'Tu as du mal à comparer les réponses de tes différents groupes.',
  'Tu retrouves difficilement les informations utiles pour recontacter les clients.',
];
const AFTER = [
  'Les réponses liées à un produit sont regroupées.',
  'Tu visualises les quantités souhaitées.',
  'Tu peux distinguer les canaux grâce aux liens par groupe inclus dans les pass concernés.',
  'Tu retrouves les informations des clients ayant accepté d’être recontactés.',
  'Tu disposes d’une estimation pour préparer ton approvisionnement.',
];
const SIZES = '(min-width: 1180px) 1100px, 100vw';

/**
 * 6. Benefits (copy brief §5.8): before / with Tamani, the same depot. No
 * money example: nothing proves one, so the page tells none (§2.4).
 */
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
            Tu gardes tes habitudes de vente. Tu gagnes en visibilité.
          </h2>
          <p className="lp-lead">
            Tamani s&apos;ajoute à tes canaux habituels pour t&apos;aider à centraliser les demandes
            et à mieux préparer tes achats.
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
          <span className="lp-hl">Une intention d’achat n’est pas une vente garantie.</span> Tamani
          t&apos;apporte des informations pour mieux décider ; la confirmation de la commande et la
          vente restent entre le commerçant et son client.
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
            <h3>Avec Tamani</h3>
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
          <Button href={LANDING_SIGNUP_HREF} size="lg" className="lp-press">
            {LANDING_SIGNUP_LABEL}
          </Button>
        </div>
      </div>
    </section>
  );
}
