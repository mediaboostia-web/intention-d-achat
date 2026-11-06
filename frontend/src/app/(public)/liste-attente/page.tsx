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
import { LANDING_LINKS, LANDING_VIDEO } from '@/lib/tamani/landing';
import { WAITLIST_COUNTER_FROM, WAITLIST_PATH, waitlistMetadata } from '@/lib/tamani/waitlist';

const appUrl = () => process.env.APP_URL ?? 'http://localhost:3000';

// The counter moves with the list: the page is rebuilt every 10 minutes at most.
export const revalidate = 600;

export function generateMetadata(): Metadata {
  return waitlistMetadata(appUrl());
}

const BENEFITS: readonly { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'box',
    title: 'Tu sais qui achète, avant de commander',
    text: 'Tes abonnés touchent « Je veux » et disent combien. Tamani te dit quelle quantité commander.',
  },
  {
    icon: 'link',
    title: 'Un lien qui marche partout',
    text: 'Dans ta chaîne WhatsApp, ton statut, sur TikTok, en live ou sur Facebook. Sans site web, sans appli pour tes clients.',
  },
  {
    icon: 'whatsapp',
    title: 'Les acheteurs prêts, avec leur WhatsApp',
    text: "Tu écris seulement à ceux qui veulent vraiment acheter. Fini les « c'est combien ? » sans suite.",
  },
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
                Liste d&apos;attente : les premiers vendeurs entrent en premier
              </p>
              <h1 id="lp-wait-title" className="lp-wait__title">
                Sache qui veut acheter, avant de commander ton stock.
              </h1>
              <p className="lp-wait__sub">
                Tes abonnés WhatsApp, TikTok et Facebook te disent ce qu&apos;ils veulent et
                combien, en moins de 30 secondes. Réserve ta place parmi les premiers vendeurs.
              </p>
              {count >= WAITLIST_COUNTER_FROM && (
                <p className="lp-wait__count">
                  <Icon name="people" />
                  {count} vendeurs ont déjà réservé leur place
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
                Ce qui change pour toi
              </h2>
            </div>
            <ul className="lp-wait__benefits">
              {BENEFITS.map((b) => (
                <li key={b.title} className="lp-wait__benefit">
                  <span className="lp-wait__benefit-ic" aria-hidden="true">
                    <Icon name={b.icon} className="size-6" />
                  </span>
                  <h3>{b.title}</h3>
                  <p>{b.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="lp-section lp-wait__end" aria-labelledby="lp-wait-end">
          <div className="lp-wrap lp-center">
            <h2 id="lp-wait-end" className="lp-h2">
              Fini le stock qui dort.
            </h2>
            <p className="lp-lead">
              Réserve ta place maintenant : on t&apos;écrit dès que ton accès est prêt.
            </p>
            <div className="lp-btn-row lp-wait__end-cta">
              <Button href="#reserver" size="lg" className="lp-press lp-go">
                Réserver ma place
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
