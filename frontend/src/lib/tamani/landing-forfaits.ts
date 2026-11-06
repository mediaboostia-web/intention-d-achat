// The /forfaits page (lot 12, spec §6): which offers each tab shows, the short
// card lines, the comparison table, its questions and what search engines
// read. Pure and shared with the browser; every figure comes from PLANS.
// The « landing » prefix keeps this public copy out of the shop-space word
// guard (no-old-plan-words.test.ts).
import type { Metadata } from 'next';
import { formatPrice } from '@/lib/utils';
import { planFeatures, type CardFeature } from './billing-view';
import { formatMoney } from './currency';
import { pricingOffers, trimBase, type PricingOffer } from './landing';
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

const TALK = 'Sur demande';

/** Who each offer is for, in the copy brief's words (§6.2). The shop space keeps its own. */
const FORFAITS_FOR_WHO: Partial<Record<PlanId, string>> = {
  TRIAL: 'Pour découvrir Tamani sur une première campagne.',
  WEEK: 'Pour tester un arrivage ou recueillir des demandes sur une courte période.',
  TWO_WEEKS:
    'Pour suivre les demandes pendant deux semaines et préparer ton prochain approvisionnement.',
  MONTH: 'Pour gérer tes campagnes et suivre les demandes pendant tout un mois.',
  MONTH_PLUS: 'Pour les boutiques et communautés qui recueillent un volume important de demandes.',
  MONTH_MAX: 'Pour les vendeurs qui recueillent un volume élevé de réponses.',
  UNLIMITED: 'Pour les grossistes qui publient régulièrement dans de grandes communautés.',
};

/** The seven cards of the page, with its own prices and short lines. */
export function forfaitOffers(): PricingOffer[] {
  return pricingOffers().map((o) => ({
    ...o,
    ...(o.id === 'TRIAL' && { price: formatMoney(PLANS.TRIAL.priceXof ?? 0, 'XOF') }),
    ...(o.id === 'UNLIMITED' && { price: TALK }),
    forWho: FORFAITS_FOR_WHO[o.id] ?? o.forWho,
    features: cardLines(o.id),
  }));
}

/** Every line a paid pass opens (copy brief §6.3), from PLANS. */
export function paidPassLines(): string[] {
  return planFeatures('WEEK')
    .filter((f) => f.included)
    .map((f) => f.label);
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

const { TRIAL } = PLANS;

/**
 * The pricing questions (copy brief §6.5), said as the CGU and lot 8 say
 * them: grace, waiting answers and unused ones. No claim about payment fees.
 */
export const FORFAITS_FAQ: readonly { question: string; answer: string }[] = [
  {
    question: 'Comment payer mon pass ?',
    answer:
      "Le paiement se fait à l'avance par Mobile Money ou carte, via SasPay, pour un pass de 7, 14 ou 30 jours.",
  },
  {
    question: 'Le pass se renouvelle-t-il automatiquement ?',
    answer:
      "Non. Aucun montant n'est prélevé automatiquement. Tamani te prévient 3 jours avant la fin de ton pass, pour te laisser le temps de décider si tu en reprends un.",
  },
  {
    question: 'Que se passe-t-il à la fin de mon pass ?',
    answer:
      "Tu gardes les fonctions de ton pass pendant 3 jours de grâce. Tes liens continuent de fonctionner : les nouvelles réponses sont gardées en attente et s'ouvrent quand tu prends un pass. Une fois le pass terminé, grâce comprise, ses réponses non utilisées sont perdues.",
  },
  {
    question: "Que se passe-t-il si j'atteins mon quota de réponses ?",
    answer:
      "Tes clients peuvent toujours répondre. Les nouvelles réponses sont gardées en attente et s'ouvrent quand tu prends un nouveau pass.",
  },
  {
    question: 'Puis-je changer de pass ?',
    answer:
      'Oui. Tu peux prendre un autre pass à tout moment, plus petit ou plus grand. Il démarre tout de suite et, pris avant la fin du pass en cours, il garde tes réponses non utilisées.',
  },
  {
    question: "L'essai gratuit demande-t-il une carte bancaire ?",
    answer: `Non. L'essai gratuit ne demande pas de carte bancaire. Il prend fin après ${TRIAL.durationDays} jours ou ${TRIAL.includedResponses} réponses, selon la première limite atteinte, et permet une campagne à la fois.`,
  },
];

const FORFAITS_TITLE = 'Tarifs Tamani | Forfaits pour grossistes et vendeurs en ligne';

function forfaitsDescription(): string {
  const prices = PASS_IDS.map((id) => PLANS[id].priceXof ?? 0);
  const days = [...new Set(PASS_IDS.map((id) => PLANS[id].durationDays))];
  const durations = `${days.slice(0, -1).join(', ')} ou ${days[days.length - 1]} jours`;
  return `Compare les forfaits Tamani : ${durations}, de ${formatMoney(Math.min(...prices), 'XOF')} à ${formatMoney(Math.max(...prices), 'XOF')}, ou illimité sur demande. Aucun renouvellement automatique.`;
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
