import { Fragment, type CSSProperties } from 'react';
import { Button, Icon, Stamp } from '@/components/ui';
import { EXAMPLE, MARQUEE } from './content';
import { Illustration } from './Illustration';
import { InView } from './InView';
import { PlatformLogo } from './PlatformLogo';
import {
  LANDING_REASSURANCE,
  LANDING_SIGNUP_HREF,
  LANDING_SIGNUP_LABEL,
} from '@/lib/tamani/landing';

// The copy brief's promise (§5.2), split by hand so no short word stays alone.
const LINE_1 = "Teste l'intérêt de tes clients";
const LINE_2 = 'avant de commander ton stock.';

/** Each word its own span, so the title rises word by word (landing.css). */
function words(line: string, from: number) {
  const list = line.split(' ');
  return list.map((w, i) => (
    <Fragment key={w + i}>
      <span className="lp-word" style={{ '--i': from + i } as CSSProperties}>
        {w}
      </span>
      {i < list.length - 1 && ' '}
    </Fragment>
  ));
}

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
              Pour les grossistes, importateurs et vendeurs en ligne
            </p>
            <h1 id="lp-hero-title" className="lp-hero__title">
              <span>{words(LINE_1, 0)} </span>
              <span className="lp-hero__l2">
                {words(LINE_2, LINE_1.split(' ').length)}
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
              Crée une fiche pour ton produit, partage son lien sur WhatsApp, TikTok, Facebook ou
              tes autres canaux. Tes clients indiquent ce qu&apos;ils souhaitent et en quelle
              quantité. Tamani rassemble les réponses et t&apos;aide à estimer ce que tu peux
              prévoir auprès de ton fournisseur.
            </p>
            <div className="lp-hero__ctas lp-btn-row">
              <Button
                href={LANDING_SIGNUP_HREF}
                size="lg"
                id="lp-hero-cta"
                className="lp-press lp-go lp-shine lp-nudge"
              >
                {LANDING_SIGNUP_LABEL}
                <Icon name="chevron-right" />
              </Button>
              <Button href="/#comment-ca-marche" size="lg" variant="secondary">
                Voir comment ça marche
              </Button>
            </div>
            <p className="lp-hero__checks">
              <Icon name="check" />
              <span>{LANDING_REASSURANCE}</span>
            </p>
          </div>
          <div className="lp-hero__art">
            <Illustration
              name="hero"
              alt="Commerçante consultant sur son téléphone les réponses reçues pour un produit avant de préparer sa commande de stock."
              sizes="(min-width: 960px) 560px, 100vw"
              ink
              preload
            />
            <p className="sr-only">
              Exemple : d&apos;après les réponses, Tamani estime une demande d&apos;environ{' '}
              {EXAMPLE.advised} cartons.
            </p>
            <div className="lp-hero__stamp" aria-hidden="true">
              <Stamp
                word="Demande"
                figure={`≈${EXAMPLE.advised}`}
                unit="cartons"
                tone="success"
                className="lp-stamp"
              />
            </div>
          </div>
        </div>

        <div className="lp-strip">
          <p>Partage ton lien là où tes clients sont déjà.</p>
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
