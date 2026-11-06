import { Button, Stamp } from '@/components/ui';
import { EXAMPLE, type LandingImageName } from './content';
import { Illustration } from './Illustration';
import { InView } from './InView';
import { LANDING_SIGNUP_HREF, LANDING_SIGNUP_LABEL } from '@/lib/tamani/landing';

const STEPS: readonly { image: LandingImageName; alt: string; title: string; text: string }[] = [
  {
    image: 'etape-1',
    alt: 'La grossiste photographie un carton de marmites avec son téléphone.',
    title: 'Crée ton produit',
    text: "Une photo, un prix et les options (taille, couleur…). Dis s'il est déjà en stock ou s'il arrive bientôt.",
  },
  {
    image: 'etape-2',
    alt: 'La grossiste envoie le lien. Une revendeuse, un jeune à moto, une mère de famille et un boutiquier répondent depuis chez eux.',
    title: 'Partage le lien en un clic',
    text: 'Envoie-le dans tes groupes WhatsApp, ton statut, ton live TikTok ou ta page Facebook. Le message est déjà écrit.',
  },
  {
    image: 'etape-3',
    alt: 'La grossiste, sereine, passe sa commande au fournisseur devant une pile de cartons bien dosée.',
    title: 'Reçois les réponses et prépare les commandes',
    text: 'Tu vois qui veut quoi, combien et où livrer. Tu transformes les réponses en commandes, en commençant par les clients que tu connais déjà.',
  },
];

function Arrow() {
  return (
    <svg className="lp-step__arrow" viewBox="0 0 46 26" aria-hidden="true">
      <path
        pathLength={1}
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

/** 5. How it works: one minute to share a product, one picture per step. */
export function Steps() {
  return (
    <section id="comment-ca-marche" className="lp-section" aria-labelledby="lp-steps-title">
      <div className="lp-wrap">
        <div className="lp-center">
          <h2 id="lp-steps-title" className="lp-h2">
            1 minute pour partager ton produit
          </h2>
          <p className="lp-lead">
            Pas de formation, pas de réglages compliqués. Trois étapes, et tes clients répondent.
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
          <Button href={LANDING_SIGNUP_HREF} size="lg" className="lp-press">
            {LANDING_SIGNUP_LABEL}
          </Button>
        </div>
      </div>
    </section>
  );
}
