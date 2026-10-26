import { Button, Stamp } from '@/components/ui';
import { EXAMPLE, type LandingImageName } from './content';
import { Illustration } from './Illustration';
import { InView } from './InView';

const STEPS: readonly { image: LandingImageName; alt: string; title: string; text: string }[] = [
  {
    image: 'etape-1',
    alt: 'La grossiste photographie un carton de marmites avec son téléphone.',
    title: 'Ajoute ton produit',
    text: "Une photo, un prix, la date d'arrivage. C'est prêt en 3 minutes.",
  },
  {
    image: 'etape-2',
    alt: 'La grossiste envoie le lien. Une revendeuse, un jeune à moto, une mère de famille et un boutiquier répondent depuis chez eux.',
    title: 'Partage le lien',
    text: 'Dans tes groupes, tes statuts et tes pages. Tes clients répondent en moins de 30 secondes, sans rien installer.',
  },
  {
    image: 'etape-3',
    alt: 'La grossiste, sereine, passe sa commande au fournisseur devant une pile de cartons bien dosée.',
    title: 'Commande la bonne quantité',
    text: 'Tamani compte les vrais acheteurs et te dit combien commander. Le calcul est toujours affiché.',
  },
];

function Arrow() {
  return (
    <svg className="lp-step__arrow" viewBox="0 0 46 26" aria-hidden="true">
      <path
        d="M42 22 C 30 6, 18 4, 6 9 M11 3.5 L5 9 L12 13"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 5. How it works: three gestures, one picture each; the verdict lands on the last. */
export function Steps() {
  return (
    <section id="comment-ca-marche" className="lp-section" aria-labelledby="lp-steps-title">
      <div className="lp-wrap">
        <div className="lp-center">
          <h2 id="lp-steps-title" className="lp-h2">
            Trois gestes, et tu sais quoi commander.
          </h2>
          <p className="lp-lead">
            Si tu sais envoyer un message sur WhatsApp, tu sais utiliser Tamani.
          </p>
        </div>
        <InView as="ol" className="lp-steps" threshold={0.4}>
          {STEPS.map((s, i) => (
            <li key={s.image} className="lp-step">
              <span className="lp-step__n" aria-hidden="true">
                {i + 1}
              </span>
              <div className="lp-step__media">
                <Illustration name={s.image} alt={s.alt} sizes="(min-width: 900px) 340px, 120px" />
                {i === STEPS.length - 1 && (
                  <div className="lp-step__stamp" aria-hidden="true">
                    <Stamp
                      word="Commande"
                      figure={`≈${EXAMPLE.advised}`}
                      unit="cartons"
                      tone="success"
                      className="lp-stamp"
                    />
                  </div>
                )}
              </div>
              <div className="lp-step__text">
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
              {i < STEPS.length - 1 && <Arrow />}
            </li>
          ))}
        </InView>
        <div className="lp-cta-row">
          <p>Ta première campagne est prête en 3 minutes.</p>
          <Button href="/signup" size="lg" className="lp-press">
            Essayer gratuitement
          </Button>
        </div>
      </div>
    </section>
  );
}
