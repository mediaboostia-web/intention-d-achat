import type { Metadata } from 'next';
import '@/components/landing/landing.css';
import { Button, Icon, type IconName } from '@/components/ui';
import { Film } from '@/components/landing/Film';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingNav } from '@/components/landing/LandingNav';
import { WaitlistForm } from '@/components/landing/waitlist/WaitlistForm';
import { log } from '@/lib/server/observability/log';
import { prisma } from '@/lib/server/prisma';
import { waitlistCount } from '@/lib/server/tamani/waitlist';
import { LANDING_FINAL_LABEL, LANDING_LINKS, LANDING_VIDEO } from '@/lib/tamani/landing';
import { WAITLIST_COUNTER_FROM, WAITLIST_PATH, waitlistMetadata } from '@/lib/tamani/waitlist';

const appUrl = () => process.env.APP_URL ?? 'http://localhost:3000';

// The counter moves with the list: the page is rebuilt every 10 minutes at most.
export const revalidate = 600;

export function generateMetadata(): Metadata {
  return waitlistMetadata(appUrl());
}

// Copy brief §7: what the seller will find, nothing the product does not do.
const DISCOVER: readonly { icon: IconName; line: string }[] = [
  { icon: 'link', line: 'Créer une fiche produit et son lien de partage.' },
  { icon: 'box', line: 'Recueillir les quantités souhaitées par tes clients.' },
  { icon: 'rows', line: 'Retrouver les réponses au même endroit.' },
  { icon: 'eye', line: 'Consulter une estimation pour préparer ton approvisionnement.' },
];

async function sellersOnList(): Promise<number> {
  try {
    return await waitlistCount(prisma);
  } catch (err) {
    // An unreachable database must never stop the page: it shows no counter.
    log.warn('waitlist count unavailable', { code: (err as { code?: string }).code ?? 'unknown' });
    return 0;
  }
}

/**
 * /liste-attente (lot 14): the one place every video and message leads to
 * before launch. The form comes right under the promise on a phone.
 */
export default async function WaitlistPage() {
  const count = await sellersOnList();
  return (
    <div className="lp">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-4 focus:z-[100] focus:rounded-control focus:bg-ink focus:px-4 focus:py-3 focus:font-bold focus:text-surface"
      >
        Aller au contenu
      </a>
      <LandingNav current={WAITLIST_PATH} />
      <main id="contenu">
        <section className="lp-panel lp-panel--paper lp-wait" aria-labelledby="lp-wait-title">
          <div className="lp-wrap lp-wait__grid">
            <div className="lp-wait__text">
              <p className="lp-pill">
                <span className="lp-pill__ic" aria-hidden="true">
                  <Icon name="clock" className="size-[18px]" />
                </span>
                Accès à venir · vendeurs et commerçants
              </p>
              <h1 id="lp-wait-title" className="lp-wait__title">
                Prépare tes prochaines commandes avec une meilleure visibilité sur la demande.
              </h1>
              <p className="lp-wait__sub">
                Tu vends sur WhatsApp, TikTok, Facebook ou dans une boutique ? Rejoins la liste
                d&apos;attente de Tamani. Nous te préviendrons lorsque les accès seront ouverts pour
                que tu puisses découvrir l&apos;outil et recueillir les intentions d&apos;achat de
                tes clients avant de commander ton stock.
              </p>
              <p className="lp-wait__free">
                <Icon name="check" />
                C&apos;est gratuit. Sans engagement. Aucune carte bancaire demandée.
              </p>
              {count >= WAITLIST_COUNTER_FROM && (
                <p className="lp-wait__count">
                  <Icon name="people" />
                  {count} vendeurs sont déjà inscrits sur la liste d&apos;attente
                </p>
              )}
            </div>
            <div id="reserver" className="lp-wait__card">
              <WaitlistForm appUrl={appUrl()} community={LANDING_LINKS.community} />
            </div>
          </div>
        </section>

        <Film video={LANDING_VIDEO} />

        <section className="lp-section" aria-labelledby="lp-wait-why">
          <div className="lp-wrap">
            <div className="lp-center">
              <h2 id="lp-wait-why" className="lp-h2">
                Ce que tu découvriras avec Tamani
              </h2>
            </div>
            <ul className="lp-wait__benefits">
              {DISCOVER.map((b) => (
                <li key={b.line} className="lp-wait__benefit">
                  <span className="lp-wait__benefit-ic" aria-hidden="true">
                    <Icon name={b.icon} className="size-6" />
                  </span>
                  <p className="lp-wait__benefit-line">{b.line}</p>
                </li>
              ))}
            </ul>
            <div className="lp-btn-row lp-wait__end-cta">
              <Button href="/#comment-ca-marche" variant="secondary" size="lg">
                Voir comment fonctionne Tamani
              </Button>
            </div>
          </div>
        </section>

        <section className="lp-section lp-wait__end" aria-labelledby="lp-wait-end">
          <div className="lp-wrap lp-center">
            <h2 id="lp-wait-end" className="lp-h2">
              Sois prévenu à l&apos;ouverture.
            </h2>
            <p className="lp-lead">
              L&apos;inscription est gratuite et sans engagement. Nous t&apos;écrirons au sujet de
              l&apos;ouverture de Tamani, par le moyen de contact que tu as accepté.
            </p>
            <div className="lp-btn-row lp-wait__end-cta">
              <Button href="#reserver" size="lg" className="lp-press lp-go">
                {LANDING_FINAL_LABEL}
                <Icon name="chevron-right" />
              </Button>
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
