// The public home page (lot 9a, mockup docs/brand/mockups/2026-10-25-page-accueil-v3.html):
// the copy used twice (questions, prices, structured data), the links the porteur
// still has to provide, and the pure rules behind the page's moving parts.
// Pure and shared with the browser.
import type { Metadata } from 'next';
import { formatPrice } from '@/lib/utils';
import { PLANS, priceFor, type PlanId } from './plans';

export const LANDING_TITLE = 'Tamani : demande à ta communauté WhatsApp avant de commander';
export const LANDING_DESCRIPTION =
  'Partage un lien sur WhatsApp, tes clients répondent en moins de 30 secondes et Tamani te dit combien commander. Pour grossistes et importateurs. Gratuit pour commencer.';
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
export const LANDING_LINKS: Readonly<Record<LandingLinkName, string | null>> = {
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

const FREE = PLANS.FREE;

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
      "Tout le monde n'achète pas ce qu'il annonce. Tamani applique donc un coefficient : 0,7 pour un revendeur, 0,5 pour un usager. Tu peux les changer, et avec Pro, Tamani les apprend de tes vraies ventes. Le calcul est toujours affiché.",
  },
  {
    question: "Le forfait Gratuit, c'est pour combien de temps ?",
    answer: `Pour toujours : ${FREE.maxActiveCampaigns} campagnes en cours et ${FREE.monthlyResponses} réponses par mois. Le verdict et la quantité conseillée sont dans Pro.`,
  },
  {
    question: 'Que se passe-t-il si je dépasse mes réponses du mois ?',
    answer:
      "Aucune réponse n'est perdue, et tes clients ne voient aucun blocage. Les réponses en plus sont gardées : tu les vois dès que tu passes au forfait du dessus.",
  },
  {
    question: 'Comment je paie ?',
    answer:
      "Par mobile money ou par carte, pour 1 mois ou 12 mois d'avance. Rien n'est prélevé automatiquement : trois jours avant la fin, Tamani te prévient.",
  },
];

export interface PricingTier {
  id: PlanId;
  label: string;
  /** The big figure: the monthly price, or a year's monthly share. */
  price: string;
  unit: string;
  /** The line under the price. */
  per: string;
}

const TIER_ORDER: readonly PlanId[] = ['FREE', 'PRO', 'BUSINESS'];

/** The three price tags, paid by the month or for 12 months (a year costs ten months). */
export function pricingTiers(months: 1 | 12): PricingTier[] {
  return TIER_ORDER.map((id) => {
    const label = PLANS[id].label;
    if (id === 'FREE') return { id, label, price: '0', unit: 'FCFA', per: 'Pour toujours' };
    const monthly = priceFor(id, 1);
    if (months === 1) {
      return {
        id,
        label,
        price: formatPrice(monthly),
        unit: 'FCFA par mois',
        per: 'Sans engagement',
      };
    }
    const year = priceFor(id, 12);
    return {
      id,
      label,
      price: formatPrice(Math.round(year / 12)),
      unit: 'FCFA par mois',
      per: `Payé ${formatPrice(year)} FCFA pour 12 mois, au lieu de ${formatPrice(monthly * 12)}.`,
    };
  });
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
        offers: TIER_ORDER.map((id) => {
          const price = String(PLANS[id].monthlyPriceXof);
          const offer = { '@type': 'Offer', name: PLANS[id].label, price, priceCurrency: 'XOF' };
          if (id === 'FREE') return offer;
          return {
            ...offer,
            priceSpecification: {
              '@type': 'UnitPriceSpecification',
              price,
              priceCurrency: 'XOF',
              unitText: 'MONTH',
            },
          };
        }),
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
