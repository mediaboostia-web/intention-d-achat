// The public home page (lot 9a, mockup docs/brand/mockups/2026-10-25-page-accueil-v3.html):
// the copy used twice (questions, prices, structured data), the links the porteur
// still has to provide, and the pure rules behind the page's moving parts.
// Pure and shared with the browser.
import type { Metadata } from 'next';
import { formatPrice } from '@/lib/utils';
import {
  BEST_VALUE_LABEL,
  FOR_WHO,
  offerCards,
  planFeatures,
  unlimitedCard,
  type CardFeature,
} from './billing-view';
import { SHOP_COUNTRIES } from './countries';
import { PASS_IDS, PLANS, type PlanId } from './plans';

export const LANDING_TITLE = "Tamani : sache quoi commander avant d'acheter ton stock";
export const LANDING_DESCRIPTION =
  "Partage un lien produit sur WhatsApp, TikTok ou Facebook. Tes clients disent ce qu'ils veulent en 30 s, Tamani te dit quoi commander. Essai gratuit.";
export const LANDING_SLOGAN = 'Ta communauté parle. Tu sais quoi acheter.';
const SHARE_TITLE = LANDING_TITLE;
const SHARE_DESCRIPTION =
  'Partage un lien sur WhatsApp, TikTok ou Facebook. Tes clients répondent en moins de 30 secondes. Tamani te dit quoi commander.';

/**
 * The menu of the public pages (lot 12, porteur's words). Sections are
 * /#anchors so the same menu works from /forfaits.
 */
export const LANDING_NAV: readonly { href: string; label: string }[] = [
  { href: '/#comment-ca-marche', label: 'Comment ça marche' },
  { href: '/#fonctionnalites', label: 'Fonctionnalités' },
  { href: '/#benefices', label: 'Bénéfices' },
  { href: '/forfaits', label: 'Forfaits' },
  { href: '/#faq', label: 'FAQ' },
  { href: '/#contact', label: 'Contact' },
];

export type LandingLinkName = 'whatsappContact' | 'community' | 'facebook' | 'instagram' | 'tiktok';

/**
 * Links the porteur has not given yet. A null link hides its button, so the
 * page never sends anyone to a dead end. whatsappContact is a wa.me link,
 * community the WhatsApp group invite.
 */
export type LandingLinks = Readonly<Record<LandingLinkName, string | null>>;

export const LANDING_LINKS: LandingLinks = {
  whatsappContact: 'https://wa.me/2290195831126',
  community: 'https://chat.whatsapp.com/I7fReiTTlvO8WAyAjLVEu5',
  facebook: null,
  instagram: null,
  tiktok: null,
};

/** Tamani's contact address, shown in the footer (porteur, 2026-10-30). */
export const LANDING_CONTACT_EMAIL = 'hullysdesire@gmail.com';

export interface LandingVideo {
  src: string;
  /** French captions (WebVTT). */
  captions?: string;
}

/** The presentation video, once it exists (MP4 16:9, about 90 seconds). */
export const LANDING_VIDEO: LandingVideo | null = null;

const { TRIAL } = PLANS;

/** "A, B et C". */
function frenchList(items: readonly string[]): string {
  return items.length < 2
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`;
}

/** How to pay, the same on the home page and on /forfaits. */
export const PAY_ANSWER =
  "Par mobile money ou par carte, pour un pass de 7, 14 ou 30 jours payé d'avance. Rien n'est prélevé automatiquement : trois jours avant la fin, Tamani te prévient.";

/**
 * The home page questions (lot 12, spec §5.9): each answer comes first and
 * stays short, the shape search engines and AI answers quote.
 */
export const LANDING_FAQ: readonly { question: string; answer: string }[] = [
  {
    question: "C'est quoi, Tamani ?",
    answer:
      "Tamani est un outil pour les grossistes et les vendeurs en ligne d'Afrique francophone. Tu partages un lien produit sur WhatsApp, TikTok ou Facebook, et tes clients disent en moins de 30 secondes ce qu'ils veulent acheter. Tamani te dit combien commander, et à qui livrer.",
  },
  {
    question: 'Mes clients doivent-ils installer une application ?',
    answer:
      "Non. Le lien s'ouvre dans le navigateur du téléphone. Ton client choisit la quantité et son quartier, puis laisse son numéro s'il accepte que tu le recontactes. Il n'a ni compte à créer, ni application à télécharger.",
  },
  {
    question: 'Où est-ce que je peux partager le lien ?',
    answer:
      "Partout où sont tes clients : groupes et statut WhatsApp, lives et bio TikTok, groupes et pages Facebook, Instagram, Telegram, Messenger, SMS, et même tes publicités. Avec un pass, tu crées un lien par groupe pour savoir lequel t'apporte des clients.",
  },
  {
    question: 'Comment tester un produit avant de le commander en gros ?',
    answer:
      "Crée le produit dans Tamani en indiquant qu'il arrive bientôt, puis partage le lien. Les réponses te montrent combien de clients sont intéressés, et pour quelle quantité. Tu commandes ensuite la bonne quantité, pas un carton au hasard.",
  },
  {
    question: "Puis-je vendre un produit que je n'ai pas encore en stock ?",
    answer:
      "Oui. Indique que le produit arrive bientôt. Tes clients disent ce qu'ils veulent, tu commandes chez ton fournisseur ce qui est demandé, puis tu livres. C'est le principe de la précommande, sans site web.",
  },
  {
    question: 'Comment Tamani calcule-t-il la quantité à commander ?',
    answer:
      "Tout le monde n'achète pas ce qu'il annonce. Tamani applique donc un coefficient : 0,7 pour un revendeur, 0,5 pour un usager. Tu peux les changer, et avec un pass, Tamani les apprend de tes vraies ventes. Le calcul est toujours affiché.",
  },
  {
    question: 'Mes clients voient-ils les réponses des autres ?',
    answer:
      'Non. Chacun ne voit que sa propre réponse. Les numéros ne sont visibles que par ta boutique.',
  },
  {
    question: "L'essai gratuit, comment ça marche ?",
    answer: `Tu as ${TRIAL.durationDays} jours pour essayer, jusqu'à ${TRIAL.includedResponses} réponses, avec une campagne, sans carte bancaire. Tu vois les numéros de tes clients et l'avis sur la quantité à commander. Ensuite, tu choisis un pass si tu veux continuer.`,
  },
  {
    question: 'Que se passe-t-il quand mon pass se termine ?',
    answer:
      'Ton lien continue de marcher. Tes clients peuvent toujours répondre, et leurs réponses sont gardées. Pour voir les nouvelles réponses et les numéros, il suffit de reprendre un pass.',
  },
  { question: 'Comment je paie ?', answer: PAY_ANSWER },
  {
    question: 'Dans quels pays marche Tamani ?',
    answer: `Tamani marche dans ${SHOP_COUNTRIES.length} pays d'Afrique francophone : ${frenchList(SHOP_COUNTRIES.map((c) => c.label))}. Ta boutique affiche ses prix dans la monnaie de ton pays.`,
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
  /** What the card lists (porteur, 2026-10-30), greyed out where the plan leaves it out. */
  features: CardFeature[];
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
      features: planFeatures('TRIAL'),
    },
    ...offerCards('XOF').map(({ bestValue, ...card }) => ({
      ...card,
      ...(bestValue && { badge: BEST_VALUE_LABEL }),
      features: planFeatures(card.id),
    })),
    { id: 'UNLIMITED', ...unlimitedCard(), features: planFeatures('UNLIMITED') },
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

export const trimBase = (appUrl: string) => appUrl.replace(/\/+$/, '');

/** schema.org graph of the home page: who we are, what we sell, the questions. */
export function landingJsonLd(
  appUrl: string,
  links: LandingLinks = LANDING_LINKS,
): Record<string, unknown> {
  const base = trimBase(appUrl);
  const sameAs = [links.facebook, links.instagram, links.tiktok].filter((l): l is string =>
    Boolean(l),
  );
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
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          email: LANDING_CONTACT_EMAIL,
          availableLanguage: 'fr',
          ...(links.whatsappContact && { url: links.whatsappContact }),
        },
        ...(sameAs.length > 0 && { sameAs }),
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
          "Les grossistes et les vendeurs en ligne partagent un lien produit sur WhatsApp, TikTok ou Facebook. Leurs clients disent en moins de 30 secondes ce qu'ils veulent et combien, et Tamani conseille la quantité à commander.",
        publisher: org,
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'XOF',
          lowPrice: String(PLANS.TRIAL.priceXof ?? 0),
          highPrice: String(Math.max(...PASS_IDS.map((id) => PLANS[id].priceXof ?? 0))),
          offerCount: PASS_IDS.length + 1,
        },
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
