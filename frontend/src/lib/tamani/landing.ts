// The public home page (lot 9a, mockup docs/brand/mockups/2026-10-25-page-accueil-v3.html):
// the copy used twice (questions, prices, structured data), the links the porteur
// still has to provide, and the pure rules behind the page's moving parts.
// Pure and shared with the browser.
import type { Metadata } from 'next';
import { formatPrice } from '@/lib/utils';
import { BEST_VALUE_LABEL, FOR_WHO, offerCards, unlimitedCard } from './billing-view';
import { PASS_IDS, PLANS, type PlanId } from './plans';

export const LANDING_TITLE = 'Tamani : demande à ta communauté WhatsApp avant de commander';
export const LANDING_DESCRIPTION =
  "Partage un lien sur WhatsApp, tes clients répondent en moins de 30 secondes et Tamani te dit combien commander. Pour grossistes et importateurs. 3 jours d'essai gratuit.";
export const LANDING_SLOGAN = 'Ta communauté parle. Tu sais quoi acheter.';
const SHARE_TITLE = "Tamani : sache combien commander avant d'acheter";
const SHARE_DESCRIPTION =
  'Partage un lien sur WhatsApp. Tes clients répondent en moins de 30 secondes. Tamani te dit combien commander.';

export type LandingLinkName = 'whatsappContact' | 'community' | 'facebook' | 'instagram' | 'tiktok';

/**
 * Links the porteur has not given yet. A null link hides its button, so the
 * page never sends anyone to a dead end. whatsappContact is a wa.me link,
 * community the WhatsApp group invite.
 */
export type LandingLinks = Readonly<Record<LandingLinkName, string | null>>;

export const LANDING_LINKS: LandingLinks = {
  whatsappContact: null,
  community: null,
  facebook: null,
  instagram: null,
  tiktok: null,
};

export interface LandingVideo {
  src: string;
  /** French captions (WebVTT). */
  captions?: string;
}

/** The presentation video, once it exists (MP4 16:9, about 90 seconds). */
export const LANDING_VIDEO: LandingVideo | null = null;

const { TRIAL } = PLANS;

export const LANDING_FAQ: readonly { question: string; answer: string }[] = [
  {
    question: 'Mes clients doivent-ils installer une application ?',
    answer:
      "Non. Le lien s'ouvre dans le navigateur du téléphone, directement depuis WhatsApp. Pas de compte, pas de mot de passe. Répondre prend moins de 30 secondes.",
  },
  {
    question: 'Où est-ce que je peux partager le lien ?',
    answer:
      'Partout où on peut coller un lien : groupes et statuts WhatsApp, Telegram, Facebook, Instagram, TikTok, Messenger, SMS, et même tes publicités Facebook et Instagram.',
  },
  {
    question: 'Mes clients voient-ils les réponses des autres ?',
    answer:
      'Non. Chacun ne voit que sa propre réponse. Les numéros ne sont visibles que par ta boutique.',
  },
  {
    question: 'Comment Tamani calcule-t-il la quantité à commander ?',
    answer:
      "Tout le monde n'achète pas ce qu'il annonce. Tamani applique donc un coefficient : 0,7 pour un revendeur, 0,5 pour un usager. Tu peux les changer, et avec un pass, Tamani les apprend de tes vraies ventes. Le calcul est toujours affiché.",
  },
  {
    question: "L'essai gratuit, comment ça marche ?",
    answer: `Ta boutique a ${TRIAL.durationDays} jours ou ${TRIAL.includedResponses} réponses, la première limite atteinte, pour une campagne, sans carte bancaire. Tu as le verdict et les numéros de tes clients. Ensuite, tes nouvelles réponses t'attendent : tu les ouvres en prenant un pass.`,
  },
  {
    question: 'Que se passe-t-il si je dépasse les réponses de mon pass ?',
    answer:
      "Aucune réponse n'est perdue, et tes clients ne voient aucun blocage. Les réponses en plus sont gardées : tu les vois dès que tu prends un autre pass, qui garde aussi les réponses non utilisées.",
  },
  {
    question: 'Comment je paie ?',
    answer:
      "Par mobile money ou par carte, pour un pass de 7, 14 ou 30 jours payé d'avance. Rien n'est prélevé automatiquement : trois jours avant la fin, Tamani te prévient.",
  },
];

export interface PricingOffer {
  id: PlanId;
  name: string;
  /** Written as the card shows it: « Gratuit », « 3 900 FCFA », « Sur devis ». */
  price: string;
  durationLabel: string;
  responsesLabel: string;
  forWho: string;
  badge?: string;
}

/** The home page grid: the trial, the five passes (prices in FCFA), the Illimité on quote. */
export function pricingOffers(): PricingOffer[] {
  return [
    {
      id: 'TRIAL',
      name: TRIAL.label,
      price: 'Gratuit',
      durationLabel: `${TRIAL.durationDays} jours`,
      responsesLabel: `${formatPrice(TRIAL.includedResponses ?? 0)} réponses`,
      forWho: FOR_WHO.TRIAL,
    },
    ...offerCards('XOF').map(({ bestValue, ...card }) => ({
      ...card,
      ...(bestValue && { badge: BEST_VALUE_LABEL }),
    })),
    { id: 'UNLIMITED', ...unlimitedCard() },
  ];
}

/** The bar stays put near the top of the page. */
export const NAV_TOP_ZONE = 120;
const NAV_JITTER = 6;

/**
 * The floating bar after a scroll to y: hidden on the way down, back on the
 * way up, always shown near the top, never hidden while busy (menu open or
 * keyboard focus inside). Moves under 6 px are ignored.
 */
export function navStep(
  prev: { lastY: number; hidden: boolean },
  y: number,
  busy: boolean,
): { lastY: number; hidden: boolean } {
  if (y <= NAV_TOP_ZONE) return { lastY: y, hidden: false };
  const delta = y - prev.lastY;
  if (Math.abs(delta) < NAV_JITTER) return prev;
  if (delta > 0) return { lastY: y, hidden: !busy };
  return { lastY: y, hidden: false };
}

/** Index drawn from weights for r in [0, 1). */
export function pickWeighted(weights: readonly number[], r: number): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let rest = r * total;
  for (let k = 0; k < weights.length; k++) {
    rest -= weights[k] ?? 0;
    if (rest < 0) return k;
  }
  return weights.length - 1;
}

export function clampPercent(n: number): number {
  return Math.min(100, Math.max(0, n));
}

const trimBase = (appUrl: string) => appUrl.replace(/\/+$/, '');

/** schema.org graph of the home page: who we are, what we sell, the questions. */
export function landingJsonLd(appUrl: string): Record<string, unknown> {
  const base = trimBase(appUrl);
  const home = `${base}/`;
  const org = { '@id': `${base}/#organisation` };
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        ...org,
        name: 'Tamani',
        url: home,
        logo: `${base}/brand/tamani-logo.svg`,
        slogan: LANDING_SLOGAN,
      },
      {
        '@type': 'WebSite',
        '@id': `${base}/#site`,
        url: home,
        name: 'Tamani',
        inLanguage: 'fr',
        publisher: org,
      },
      {
        '@type': 'SoftwareApplication',
        name: 'Tamani',
        url: home,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web, Android, iOS',
        inLanguage: 'fr',
        description:
          'Les grossistes et importateurs partagent un lien sur WhatsApp, Telegram ou Facebook. Leur communauté dit en moins de 30 secondes qui veut quoi et combien, et Tamani conseille la quantité à commander.',
        publisher: org,
        offers: (['TRIAL', ...PASS_IDS] as const).map((id) => ({
          '@type': 'Offer',
          name: PLANS[id].label,
          price: String(PLANS[id].priceXof ?? 0),
          priceCurrency: 'XOF',
        })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: LANDING_FAQ.map((q) => ({
          '@type': 'Question',
          name: q.question,
          acceptedAnswer: { '@type': 'Answer', text: q.answer },
        })),
      },
    ],
  };
}

export function landingMetadata(appUrl: string): Metadata {
  const base = trimBase(appUrl);
  const image = {
    url: `${base}/brand/og-default.png`,
    width: 1200,
    height: 630,
    alt: `La bulle jaune de Tamani et la phrase : ${LANDING_SLOGAN}`,
  };
  return {
    title: { absolute: LANDING_TITLE },
    description: LANDING_DESCRIPTION,
    alternates: { canonical: `${base}/` },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website',
      siteName: 'Tamani',
      locale: 'fr_FR',
      url: `${base}/`,
      title: SHARE_TITLE,
      description: SHARE_DESCRIPTION,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: SHARE_TITLE,
      description: SHARE_DESCRIPTION,
      images: [image.url],
    },
  };
}
