import type { Metadata } from 'next';
import '@/components/landing/landing.css';
import { Icon } from '@/components/ui';
import { Faq } from '@/components/landing/Faq';
import { CompareTable } from '@/components/landing/forfaits/CompareTable';
import { DurationSwitch } from '@/components/landing/forfaits/DurationSwitch';
import { PlanGrid } from '@/components/landing/forfaits/PlanGrid';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingNav } from '@/components/landing/LandingNav';
import { prisma } from '@/lib/server/prisma';
import { loadPlatformSettings } from '@/lib/server/tamani/platform-settings';
import { FORFAITS_FAQ, forfaitsJsonLd, forfaitsMetadata } from '@/lib/tamani/landing-forfaits';

const appUrl = () => process.env.APP_URL ?? 'http://localhost:3000';

export function generateMetadata(): Metadata {
  return forfaitsMetadata(appUrl());
}

const TRUST = [
  'Paiement Mobile Money ou carte',
  'Pas de renouvellement automatique',
  "Ton lien ne s'arrête jamais",
  'Réponses gardées après ton pass',
  'Essai sans carte bancaire',
];

/**
 * The pricing page (lot 12, spec §6): reached from the menu, not shown on the
 * home page. Static: the duration switch is two radios, both groups of cards
 * are in the HTML. The links and the contact address are the platform settings (lot 13a).
 */
export default async function ForfaitsPage() {
  const { links, contactEmail } = await loadPlatformSettings(prisma);
  // `<` escaped so the graph can never close its <script> early.
  const jsonLd = JSON.stringify(forfaitsJsonLd(appUrl())).replace(/</g, '\\u003c');
  return (
    <div className="lp">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-4 focus:z-[100] focus:rounded-control focus:bg-ink focus:px-4 focus:py-3 focus:font-bold focus:text-surface"
      >
        Aller au contenu
      </a>
      <LandingNav current="/forfaits" links={links} />
      <main id="contenu">
        <section className="lp-section lp-plans" aria-labelledby="lp-plans-title">
          <div className="lp-wrap">
            <div className="lp-center">
              <h1 id="lp-plans-title" className="lp-h2 lp-plans__title">
                Un forfait à la taille de ton activité
              </h1>
              <p className="lp-lead">
                Que tu postes un produit par mois ou dix par jour, choisis le pass qui suit ton
                rythme. Tu paies une seule fois, par Mobile Money, sans abonnement qui se renouvelle
                tout seul.
              </p>
              <DurationSwitch />
            </div>
            <PlanGrid links={links} />
            <ul className="lp-plans__trust">
              {TRUST.map((line) => (
                <li key={line}>
                  <Icon name="check" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </section>
        <section className="lp-section lp-plans__end" aria-labelledby="lp-end-title">
          <div className="lp-wrap">
            <div className="lp-plans__box">
              <h2 id="lp-end-title">Et quand mon pass se termine ?</h2>
              <p>
                Tes campagnes continuent. Tes clients peuvent toujours répondre, et leurs réponses
                sont gardées. Tu les retrouves, avec les numéros, dès que tu reprends un pass. Si tu
                prends un nouveau pass avant la fin du précédent, tes réponses non utilisées
                s&apos;ajoutent au nouveau.
              </p>
            </div>
          </div>
        </section>
        <section className="lp-section lp-plans__table" aria-labelledby="lp-table-title">
          <div className="lp-wrap">
            <div className="lp-center">
              <h2 id="lp-table-title" className="lp-h2">
                Compare toutes les offres
              </h2>
            </div>
            <CompareTable />
          </div>
        </section>
        <Faq
          items={FORFAITS_FAQ}
          id="questions-forfaits"
          title="Tes questions sur les forfaits"
          links={links}
        />
      </main>
      <LandingFooter links={links} contactEmail={contactEmail} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    </div>
  );
}
