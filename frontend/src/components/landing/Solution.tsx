import { Button, Icon, type IconName } from '@/components/ui';
import { twoDigits } from './content';
import { Illustration } from './Illustration';
import { Orbit } from './Orbit';

const GAINS: readonly { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'box',
    title: 'Tu recueilles les quantités souhaitées.',
    text: 'Les clients indiquent ce qu’ils veulent et en quelle quantité. Tu retrouves les réponses au même endroit.',
  },
  {
    icon: 'user',
    title: 'Tu identifies les clients qui acceptent d’être recontactés.',
    text: 'Les coordonnées sont accessibles à ta boutique lorsque le client donne son accord pour être recontacté.',
  },
  {
    icon: 'link',
    title: 'Tu compares tes canaux.',
    text: 'Avec les pass qui incluent les liens par groupe, tu peux distinguer les réponses provenant de différents groupes ou réseaux.',
  },
  {
    icon: 'check',
    title: 'Tu prépares ton approvisionnement avec une estimation.',
    text: 'Tamani calcule une quantité conseillée à partir des réponses et affiche un avis pour t’aider à décider. Cette estimation ne garantit pas les ventes.',
  },
  {
    icon: 'home',
    title: 'Tu n’imposes pas d’application à tes clients.',
    text: 'Ils ouvrent le lien dans le navigateur de leur téléphone. Ils n’ont pas besoin de créer un compte ni de télécharger une application.',
  },
];

/**
 * 4. The solution (copy brief §5.6): one product link, every answer in one
 * place. Under the orbit, the five benefits are numbered beside the drawing of
 * the answers coming in, kept in view while they scroll by (no phone mockup:
 * the porteur's rule since lot 9a).
 */
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
            Un lien produit. Des demandes regroupées au même endroit.
          </h2>
          <p className="lp-lead">
            Avec Tamani, tu présentes ton produit sur une page simple et tu partages le lien avec ta
            communauté. Les réponses sont centralisées dans ton espace pour t&apos;aider à
            comprendre ce que les clients souhaitent.
          </p>
        </div>
        <Orbit />
        <div className="lp-feat">
          <div className="lp-feat__art">
            <Illustration
              name="inscription"
              alt="La grossiste assise sur ses cartons lit sur son téléphone les messages de ses clients, chacun depuis son propre lieu."
              sizes="(min-width: 960px) 380px, 300px"
              ink
            />
          </div>
          <ol className="lp-feat__list">
            {GAINS.map((g, i) => (
              <li key={g.title}>
                <span className="lp-feat__num" aria-hidden="true">
                  {twoDigits(i + 1)}
                </span>
                <span className="lp-tile-ic" aria-hidden="true">
                  <Icon name={g.icon} />
                </span>
                <div>
                  <h3>{g.title}</h3>
                  <p>{g.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="lp-cta-row">
          <Button href="/#comment-ca-marche" size="lg" variant="secondary" className="lp-press">
            Découvrir comment ça marche
          </Button>
        </div>
      </div>
    </section>
  );
}
