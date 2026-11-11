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
import { LANDING_LAUNCH_MODE } from '@/lib/tamani/landing';
import {
  FORFAITS_FAQ,
  forfaitsJsonLd,
  forfaitsMetadata,
  paidPassLines,
} from '@/lib/tamani/landing-forfaits';

const appUrl = () => process.env.APP_URL ?? 'http://localhost:3000';

export function generateMetadata(): Metadata {
  return forfaitsMetadata(appUrl());
}

// Copy brief §6.4, without « frais affichés avant validation », not checked yet.
const TRUST = [
  'Paiement par Mobile Money ou carte via SasPay',
  'Paiement à l’avance',
  'Aucun renouvellement automatique',
  'Essai gratuit sans carte bancaire',
  'Les liens produit continuent de fonctionner après la fin d’un pass',
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
                Des forfaits adaptés au volume de tes demandes.
              </h1>
              <p className="lp-lead">
                Commence par découvrir Tamani, puis choisis un pass selon la durée de ton activité
                et le nombre de réponses que tu souhaites consulter. Les pass sont payés à l’avance
                et ne se renouvellent pas automatiquement.
              </p>
              {LANDING_LAUNCH_MODE === 'waitlist' && (
                <p className="lp-plans__notice">
                  L&apos;accès public est actuellement sur liste d&apos;attente. Inscris-toi pour
                  être prévenu lorsque tu pourras utiliser Tamani.
                </p>
              )}
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
        <section className="lp-section lp-plans__end" aria-labelledby="lp-paid-title">
          <div className="lp-wrap">
            <div className="lp-plans__box lp-plans__box--paid">
              <h2 id="lp-paid-title">Inclus dans les pass payants</h2>
              <ul className="lp-plans__paid">
                {paidPassLines().map((line) => (
                  <li key={line}>
                    <Icon name="check" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
            <div className="lp-plans__box">
              <h2 id="lp-end-title">Et quand mon pass se termine ?</h2>
              <p>
                Une période de grâce de 3 jours est prévue. Tes liens continuent de fonctionner et
                les nouvelles réponses sont gardées en attente : elles s&apos;ouvrent quand tu
                reprends un pass. Si tu prends un nouveau pass avant la fin du précédent, tu gardes
                tes réponses non utilisées ; après la fin, grâce comprise, elles sont perdues.
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
          title="Questions sur les forfaits"
          links={links}
        />
      </main>
      <LandingFooter links={links} contactEmail={contactEmail} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    </div>
  );
}
