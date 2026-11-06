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
import { WAITLIST_PATH } from './waitlist';

// The words of the copy brief (copywriting and SEO brief, 2026-11-06): an
// intention is never a sale, the advice is an estimate.
export const LANDING_TITLE = 'Tamani | Teste la demande avant de commander ton stock';
export const LANDING_DESCRIPTION =
  "Recueille les intentions d'achat avec un lien à partager sur WhatsApp, TikTok ou Facebook. Estime les quantités à prévoir avant ton approvisionnement.";
export const LANDING_SLOGAN = 'Ta communauté parle. Tu sais quoi acheter.';
const SHARE_TITLE = "Teste l'intérêt de tes clients avant de commander ton stock | Tamani";
const SHARE_DESCRIPTION =
  'Partage un lien produit, recueille les demandes et estime les quantités à prévoir avec Tamani.';

/**
 * The menu of the public pages (lot 12, porteur's words). Sections are
 * /#anchors so the same menu works from /forfaits.
 */
export const LANDING_NAV: readonly { href: string; label: string }[] = [
  { href: '/#comment-ca-marche', label: 'Comment ça marche' },
  { href: '/#fonctionnalites', label: 'Fonctionnalités' },
  { href: '/#benefices', label: 'Avantages' },
  { href: '/forfaits', label: 'Tarifs' },
  { href: '/#faq', label: 'Questions fréquentes' },
  { href: '/#contact', label: 'Contact' },
];

/** The computer bar keeps three of them (porteur, 2026-11-06); the phone's drawer keeps all six. */
const BAR_HREFS = new Set(['/#comment-ca-marche', '/#fonctionnalites', '/forfaits']);
export const LANDING_BAR_NAV: readonly { href: string; label: string }[] = LANDING_NAV.filter((n) =>
  BAR_HREFS.has(n.href),
);

export type LandingLinkName = 'whatsappContact' | 'community' | 'facebook' | 'instagram' | 'tiktok';

/**
 * Links the porteur has not given yet. A null link hides its button, so the
 * page never sends anyone to a dead end. whatsappContact is a wa.me link,
 * community the WhatsApp group invite.
 */
export type LandingLinks = Readonly<Record<LandingLinkName, string | null>>;

const { TRIAL } = PLANS;

export type LaunchMode = 'waitlist' | 'open';

/**
 * The one switch of the public site's buttons (copy brief §2.3, §4.2): the
 * waitlist until the porteur says sign-up is open, then 'open'. Sign-up
 * itself stays reachable at /signup.
 */
export const LANDING_LAUNCH_MODE: LaunchMode = 'waitlist';

const LAUNCH: Record<
  LaunchMode,
  {
    href: string;
    label: string;
    finalLabel: string;
    finalNote: string;
    planLabel: string;
    reassurance: string;
  }
> = {
  waitlist: {
    href: WAITLIST_PATH,
    label: "Rejoindre la liste d'attente",
    finalLabel: "Rejoindre gratuitement la liste d'attente",
    finalNote: "Sans engagement. Nous te prévenons à l'ouverture.",
    planLabel: "Être prévenu à l'ouverture",
    reassurance: "Gratuit · Sans engagement · Nous te prévenons à l'ouverture.",
  },
  open: {
    href: '/signup',
    label: 'Créer mon compte gratuit',
    finalLabel: 'Créer mon compte gratuit',
    finalNote: 'Sans carte bancaire.',
    planLabel: 'Choisir ce pass',
    reassurance: `${TRIAL.durationDays} jours ou ${TRIAL.includedResponses} réponses · Sans carte bancaire.`,
  },
};
const launch = LAUNCH[LANDING_LAUNCH_MODE];

/** Where every sign-up button of the public site leads, and what it says. */
export const LANDING_SIGNUP_HREF: string = launch.href;
export const LANDING_SIGNUP_LABEL: string = launch.label;
/** The last call's button, a little longer. */
export const LANDING_FINAL_LABEL: string = launch.finalLabel;
/** The line under it. */
export const LANDING_FINAL_NOTE: string = launch.finalNote;
/** The pricing cards' button. */
export const LANDING_PLAN_LABEL: string = launch.planLabel;
/** The line under the hero's buttons. */
export const LANDING_REASSURANCE: string = launch.reassurance;

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
  /** Its length, shown on the play button. */
  seconds: number;
}

/** The presentation film « Le jour de la commande » (C01, 16:9, porteur 2026-11-06). */
export const LANDING_VIDEO: LandingVideo | null = {
  src: '/video/tamani-presentation.mp4',
  captions: '/video/tamani-presentation.vtt',
  seconds: 61,
};

/** A film's length to the half minute: « 1 min » on the button, « 1 minute » read aloud. */
export function filmLength(seconds: number): { label: string; spoken: string } {
  const halves = Math.max(1, Math.round(seconds / 30));
  const minutes = Math.floor(halves / 2);
  const half = halves % 2 === 1;
  if (minutes === 0) return { label: '30 s', spoken: '30 secondes' };
  return {
    label: `${minutes} min${half ? ' 30' : ''}`,
    spoken: `${minutes} minute${minutes > 1 ? 's' : ''}${half ? ' 30' : ''}`,
  };
}

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
 * The home page questions (copy brief §5.10): each answer comes first and
 * stays short, the shape search engines and AI answers quote.
 */
export const LANDING_FAQ: readonly { question: string; answer: string }[] = [
  {
    question: "C'est quoi, Tamani ?",
    answer:
      "Tamani est un outil web destiné aux grossistes, importateurs et vendeurs en ligne. Tu crées une fiche produit, tu partages son lien et tes clients indiquent ce qu'ils souhaitent acheter. Tamani centralise les réponses et t'aide à estimer la quantité à prévoir avant de commander ton stock.",
  },
  {
    question: 'Mes clients doivent-ils installer une application ?',
    answer:
      "Non. Tes clients ouvrent le lien dans le navigateur de leur téléphone. Ils n'ont pas besoin de créer un compte ni de télécharger une application pour répondre.",
  },
  {
    question: 'Où puis-je partager mon lien ?',
    answer:
      'Tu peux partager ton lien sur les canaux que tu utilises déjà, notamment WhatsApp, Facebook, TikTok, Instagram, Telegram, Messenger et par SMS. Les pass payants incluent la possibilité de créer un lien distinct par groupe.',
  },
  {
    question: "Puis-je tester l'intérêt pour un produit qui n'est pas encore en stock ?",
    answer:
      "Oui. Tu peux indiquer que le produit arrive bientôt, partager son lien et recueillir les intentions d'achat avant de passer commande auprès de ton fournisseur.",
  },
  {
    question: "Une intention d'achat garantit-elle une vente ?",
    answer:
      "Non. Une intention indique qu'une personne est intéressée, mais elle ne garantit pas qu'elle achètera. La quantité conseillée par Tamani est une aide à la décision, pas une promesse de vente. Tu peux ensuite recontacter les personnes qui ont accepté et confirmer avec elles.",
  },
  {
    question: 'Comment Tamani estime-t-il la quantité à commander ?',
    answer:
      'Tamani applique des coefficients aux réponses, car toutes les intentions ne deviennent pas des ventes. Par défaut : 0,7 pour un revendeur et 0,5 pour un usager final. Tu peux les modifier. Avec un pass, Tamani peut les ajuster à partir de tes ventes réelles. La quantité affichée reste une estimation.',
  },
  {
    question: 'Les numéros de mes clients sont-ils visibles par tout le monde ?',
    answer:
      "Non. Les autres clients ne voient pas les réponses de ta boutique. Les coordonnées d'un répondant ne sont accessibles à ta boutique que si cette personne a accepté d'être recontactée.",
  },
  {
    question: 'Dans quels pays Tamani est-il disponible ?',
    answer: `Tamani est prévu pour ${SHOP_COUNTRIES.length} pays d'Afrique francophone : ${frenchList(SHOP_COUNTRIES.map((c) => c.label))}. La boutique affiche les prix dans la monnaie de son pays.`,
  },
  {
    question: 'Comment essayer Tamani ?',
    answer: `Pour l'instant, tu peux rejoindre la liste d'attente pour être prévenu à l'ouverture. Quand l'accès sera ouvert, l'essai gratuit durera ${TRIAL.durationDays} jours ou ${TRIAL.includedResponses} réponses, selon la première limite atteinte, pour une campagne et sans carte bancaire.`,
  },
  {
    question: "Comment contacter l'équipe Tamani ?",
    answer: `Écris à l'équipe avec le bouton WhatsApp du site, ou envoie un e-mail à ${LANDING_CONTACT_EMAIL}.`,
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

/**
 * The value a counting number shows at t in [0, 1] of its run: an ease-out
 * (fast start, gentle landing), rounded, never past the target.
 */
export function countFrame(target: number, t: number): number {
  const k = Math.min(1, Math.max(0, t));
  return Math.min(target, Math.round(target * (1 - (1 - k) ** 3)));
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
        operatingSystem: 'Web',
        inLanguage: 'fr',
        description:
          "Un outil web pour les grossistes, importateurs et vendeurs en ligne : un lien produit à partager sur WhatsApp, TikTok ou Facebook recueille les intentions d'achat des clients, et Tamani estime la quantité à prévoir avant de commander le stock.",
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
