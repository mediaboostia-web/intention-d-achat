// The /forfaits page (lot 12, spec §6): which offers each tab shows, the short
// card lines, the comparison table, its questions and what search engines
// read. Pure and shared with the browser; every figure comes from PLANS.
// The « landing » prefix keeps this public copy out of the shop-space word
// guard (no-old-plan-words.test.ts).
import type { Metadata } from 'next';
import { formatPrice } from '@/lib/utils';
import { planFeatures, type CardFeature } from './billing-view';
import { formatMoney } from './currency';
import { PAY_ANSWER, pricingOffers, trimBase, type PricingOffer } from './landing';
import { PASS_IDS, PLANS, type PlanId } from './plans';

export type DurationTab = 'court' | 'mois';

/** The porteur's switch (2026-11-05): short passes or monthly ones, Illimité in both. */
export const FORFAITS_TABS: readonly {
  id: DurationTab;
  label: string;
  offers: readonly PlanId[];
}[] = [
  { id: 'court', label: 'Courte durée', offers: ['TRIAL', 'WEEK', 'TWO_WEEKS', 'UNLIMITED'] },
  { id: 'mois', label: 'Au mois', offers: ['MONTH', 'MONTH_PLUS', 'MONTH_MAX', 'UNLIMITED'] },
];

/** `?duree=mois` opens the monthly passes; anything else the short ones. */
export function tabFromSearch(search: string): DurationTab {
  return new URLSearchParams(search).get('duree') === 'mois' ? 'mois' : 'court';
}

const TRIAL_LINES = [
  '1 campagne à la fois',
  'La quantité à commander et le verdict',
  'Les numéros des intéressés et WhatsApp',
  'Un lien par groupe',
  "L'export pour Excel",
  'Sans « Propulsé par Tamani »',
];
const PASS_LINES = [
  'Campagnes illimitées',
  'La quantité à commander et le verdict',
  'Un lien par groupe',
  "L'export pour Excel",
];

/** A card's few lines: the trial shows what it lacks, a pass four of its benefits. */
export function cardLines(id: PlanId): CardFeature[] {
  const keep = id === 'TRIAL' ? TRIAL_LINES : PASS_LINES;
  const all = planFeatures(id === 'FREE' ? 'TRIAL' : id);
  return keep.flatMap((label) => all.filter((f) => f.label === label));
}

const TALK = 'Parlons-en';
const UNLIMITED_FOR = 'Pour les grossistes qui postent tous les jours dans de grands groupes.';

/** The seven cards of the page, with its own prices and short lines. */
export function forfaitOffers(): PricingOffer[] {
  return pricingOffers().map((o) => ({
    ...o,
    ...(o.id === 'TRIAL' && { price: formatMoney(PLANS.TRIAL.priceXof ?? 0, 'XOF') }),
    ...(o.id === 'UNLIMITED' && { price: TALK, forWho: UNLIMITED_FOR }),
    features: cardLines(o.id),
  }));
}

const COLUMNS = ['TRIAL', ...PASS_IDS, 'UNLIMITED'] as const;

export function compareColumns(): { id: PlanId; label: string }[] {
  return COLUMNS.map((id) => ({ id, label: PLANS[id].label }));
}

/** Every detail, one column per offer, in the grid's order. */
export function compareRows(): { label: string; cells: (string | boolean)[] }[] {
  const plans = COLUMNS.map((id) => PLANS[id]);
  const features = COLUMNS.map((id) => planFeatures(id));
  const head: { label: string; cells: (string | boolean)[] }[] = [
    {
      label: 'Prix',
      cells: plans.map((p) => (p.priceXof === null ? TALK : formatMoney(p.priceXof, 'XOF'))),
    },
    { label: 'Durée', cells: plans.map((p) => `${p.durationDays} jours`) },
    {
      label: 'Réponses incluses',
      cells: plans.map((p) =>
        p.includedResponses === null ? 'Illimitées' : formatPrice(p.includedResponses),
      ),
    },
    {
      label: 'Campagnes à la fois',
      cells: plans.map((p) =>
        p.maxActiveCampaigns === null ? 'Illimitées' : String(p.maxActiveCampaigns),
      ),
    },
  ];
  // Line 0 of planFeatures is the campaign count, already in the head.
  const rows = planFeatures('WEEK')
    .slice(1)
    .map((f, i) => ({
      label: f.label,
      cells: features.map((list) => list[i + 1]?.included ?? false),
    }));
  return [...head, ...rows];
}

/** The pricing questions (spec §6.5), the lot 8 rules in plain words. */
export const FORFAITS_FAQ: readonly { question: string; answer: string }[] = [
  { question: 'Comment je paie ?', answer: PAY_ANSWER },
  {
    question: 'Le pass se renouvelle-t-il tout seul ?',
    answer:
      "Non. Rien n'est prélevé automatiquement. Tamani te prévient 3 jours avant la fin, puis tu as encore 3 jours de grâce pour reprendre un pass. Sans nouveau pass, ton lien continue de marcher et les nouvelles réponses sont gardées.",
  },
  {
    question: "Que se passe-t-il si j'utilise toutes mes réponses ?",
    answer:
      "Aucune réponse n'est perdue et tes clients ne voient aucun blocage. Les nouvelles réponses sont gardées en attente. Prends un autre pass : il démarre tout de suite, ouvre les réponses en attente et garde tes réponses non utilisées.",
  },
  {
    question: 'Puis-je changer de pass ?',
    answer:
      'Oui. À tout moment, tu peux prendre un autre pass, plus petit ou plus grand. Il démarre tout de suite et garde les réponses non utilisées du pass en cours.',
  },
];

const FORFAITS_TITLE = 'Forfaits Tamani : prix des pass et essai gratuit';

function forfaitsDescription(): string {
  const lowest = Math.min(...PASS_IDS.map((id) => PLANS[id].priceXof ?? 0));
  const { durationDays, includedResponses } = PLANS.TRIAL;
  return `Pass dès ${formatMoney(lowest, 'XOF')}, sans renouvellement automatique, payé par Mobile Money. Essai gratuit ${durationDays} jours, ${includedResponses} réponses.`;
}

export function forfaitsMetadata(appUrl: string): Metadata {
  const url = `${trimBase(appUrl)}/forfaits`;
  const description = forfaitsDescription();
  return {
    title: { absolute: FORFAITS_TITLE },
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website',
      siteName: 'Tamani',
      locale: 'fr_FR',
      url,
      title: FORFAITS_TITLE,
      description,
      images: [
        { url: `${trimBase(appUrl)}/brand/og-default.png`, width: 1200, height: 630, alt: '' },
      ],
    },
    twitter: { card: 'summary_large_image', title: FORFAITS_TITLE, description },
  };
}

/** The page's own FAQPage. */
export function forfaitsJsonLd(appUrl: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    url: `${trimBase(appUrl)}/forfaits`,
    mainEntity: FORFAITS_FAQ.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: { '@type': 'Answer', text: q.answer },
    })),
  };
}
