import { Button, Icon, Stamp } from '@/components/ui';
import { EXAMPLE, MARQUEE } from './content';
import { Illustration } from './Illustration';
import { InView } from './InView';
import { PlatformLogo } from './PlatformLogo';

function PlatformList({ hidden = false }: { hidden?: boolean }) {
  return (
    <ul {...(hidden ? { 'aria-hidden': true } : {})}>
      {MARQUEE.map((p) => (
        <li key={p.slug}>
          <PlatformLogo slug={p.slug} />
          {p.label}
        </li>
      ))}
    </ul>
  );
}

/** 1. The promise on the left, the wholesaler receiving her answers on the right. */
export function Hero() {
  return (
    <InView
      as="section"
      threshold={0}
      className="lp-panel lp-panel--paper lp-hero"
      aria-labelledby="lp-hero-title"
    >
      <div className="lp-wrap">
        <div className="lp-hero__grid">
          <div className="lp-hero__text">
            <p className="lp-pill">
              <span className="lp-pill__ic" aria-hidden="true">
                <Icon name="box" className="size-[18px]" />
              </span>
              Pour les grossistes et les importateurs
            </p>
            <h1 id="lp-hero-title" className="lp-hero__title">
              <span>Ta communauté parle.</span>
              <span className="lp-hero__l2">
                Tu sais quoi acheter.
                <svg
                  className="lp-hero__underline"
                  viewBox="0 0 300 16"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path pathLength={1} d="M4 11 C 70 4, 160 3, 296 8" />
                </svg>
              </span>
            </h1>
            <p className="lp-hero__sub">
              Partage un lien sur WhatsApp. Tes clients répondent en moins de 30&nbsp;secondes.
              Tamani te dit combien commander.
            </p>
            <div className="lp-hero__ctas lp-btn-row">
              <Button href="/signup" size="lg" id="lp-hero-cta">
                Essayer gratuitement
              </Button>
              <Button href="#film" size="lg" variant="secondary">
                <span className="lp-playdot" aria-hidden="true">
                  <svg viewBox="0 0 12 12">
                    <path d="M1.5 0.8v10.4L11 6z" />
                  </svg>
                </span>
                Voir la vidéo
              </Button>
            </div>
            <ul className="lp-hero__checks">
              {["3 jours d'essai gratuit", 'Sans carte bancaire', 'Prêt en 3 minutes'].map((c) => (
                <li key={c}>
                  <Icon name="check" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <div className="lp-hero__art">
            <Illustration
              name="hero"
              alt="Une grossiste devant son dépôt, son téléphone à la main. Les réponses de ses clients arrivent en petites bulles jaunes."
              sizes="(min-width: 960px) 560px, 100vw"
              ink
              preload
            />
            <p className="sr-only">
              Exemple : d&apos;après les réponses, Tamani conseille de commander environ{' '}
              {EXAMPLE.advised} cartons.
            </p>
            <div className="lp-hero__stamp" aria-hidden="true">
              <Stamp
                word="Commande"
                figure={`≈${EXAMPLE.advised}`}
                unit="cartons"
                tone="success"
                className="lp-stamp"
              />
            </div>
          </div>
        </div>

        <div className="lp-strip">
          <p>Ton lien s&apos;ouvre partout où tes clients discutent</p>
          <div className="lp-marquee">
            <div className="lp-marquee__track">
              <PlatformList />
              <PlatformList hidden />
            </div>
          </div>
        </div>
      </div>
    </InView>
  );
}
