// The pass as the shop space shows it (lot 8): the meter, its line, the
// five passes to choose from, a purchase's state. Pure: the screens and
// their tests read the same words. There are no top-ups: more answers come
// with another pass, which starts now and keeps the unused answers.
import { formatPrice } from '@/lib/utils';
import { formatMoney } from './currency';
import { formatDateFr } from './dates';
import { PASS_IDS, PLANS, type PassId, type PlanId } from './plans';

const DAY_MS = 86_400_000;

/** GET /api/shops/[orgId]/billing. */
export interface BillingData {
  pass: {
    plan: PlanId;
    label: string;
    endsAt: string | null;
    inGrace: boolean;
    used: number;
    included: number;
    pending: number;
  };
  perCampaign: Array<{ campaignId: string; title: string; used: number }>;
  purchases: Array<{
    id: string;
    offer: string | null;
    amount: number;
    status: string;
    createdAt: string;
    activated: boolean;
  }>;
  paymentAvailable: boolean;
}

/** The meter's input: the pass in force and its answers (shop route or billing route). */
export type PassUsageView = Pick<
  BillingData['pass'],
  'plan' | 'used' | 'included' | 'endsAt' | 'inGrace' | 'pending'
>;

export type MeterTone = 'ok' | 'warning' | 'full';

/** 80 % used warns; a full pass (or none) makes new answers wait. */
export function meterTone(used: number, included: number): MeterTone {
  if (included <= 0 || used >= included) return 'full';
  return used / included >= 0.8 ? 'warning' : 'ok';
}

const answers = (n: number) => `${formatPrice(n)} ${n > 1 ? 'réponses' : 'réponse'}`;

/** « 1 240 / 3 000 réponses · pass jusqu'au 12 novembre », or « Sans pass · 87 réponses en attente ». */
export function meterLine(u: PassUsageView, now: Date): string {
  if (u.plan === 'FREE') {
    return u.pending > 0 ? `Sans pass · ${answers(u.pending)} en attente` : 'Sans pass';
  }
  const count = `${formatPrice(u.used)} / ${formatPrice(u.included)} réponses`;
  if (!u.endsAt) return count;
  const day = formatDateFr(new Date(u.endsAt), now);
  if (u.inGrace) return `${count} · pass terminé, à racheter avant le ${day}`;
  return `${count} · ${u.plan === 'TRIAL' ? 'essai' : 'pass'} jusqu'au ${day}`;
}

/** The pending answers' banner, or null. */
export function pendingLine(pending: number): string | null {
  if (pending <= 0) return null;
  return pending > 1
    ? `${formatPrice(pending)} réponses t'attendent. Prends un pass pour les voir.`
    : "1 réponse t'attend. Prends un pass pour la voir.";
}

/** Whole days left before the grace ends (at least 1 while it runs). */
export function graceDaysLeft(graceUntil: string | null, now: Date): number {
  if (!graceUntil) return 0;
  const ms = new Date(graceUntil).getTime() - now.getTime();
  return ms > 0 ? Math.max(1, Math.ceil(ms / DAY_MS)) : 0;
}

export function graceLine(days: number): string {
  return `Ton pass est terminé. Il te reste ${days} jour${days > 1 ? 's' : ''} pour le racheter.`;
}

/** Who each pass is for, on the pass page and the home page grid. */
export const FOR_WHO: Readonly<Record<'TRIAL' | PassId | 'UNLIMITED', string>> = {
  TRIAL: 'Pour voir Tamani marcher sur un produit.',
  WEEK: 'Pour un arrivage à écouler vite.',
  TWO_WEEKS: 'Pour deux semaines de ventes.',
  MONTH: 'Pour vendre tout le mois.',
  MONTH_PLUS: 'Pour un groupe actif.',
  MONTH_MAX: 'Pour les grands groupes.',
  UNLIMITED: 'Pour les très grandes communautés.',
};

/**
 * What every pass holds, listed once under the cards (home page and « Mon
 * pass ») so a visitor sees the value; the passes differ only in length and
 * answers.
 */
export const PASS_FEATURES: readonly string[] = [
  'Un lien à partager sur WhatsApp, Telegram ou Facebook',
  'Tes clients répondent en moins de 30 secondes, sans appli',
  'La quantité à commander, avec le calcul affiché',
  "Le verdict et l'argent évité avant de commander",
  'Les numéros des intéressés et un bouton WhatsApp',
  'Les commandes et les livraisons par quartier',
  'Le carnet de clients et leur fiabilité',
  'Un lien par groupe pour savoir qui répond où',
  "L'export pour Excel des réponses et des clients",
  'Une alerte sur ton téléphone à chaque réponse',
  'Campagnes illimitées, sans « Propulsé par Tamani »',
];

export const TRIAL_LIMITS = "L'essai ouvre tout, sauf les liens par groupe et l'export pour Excel.";

/** The lowest price per answer of the grid (porteur, 2026-10-29). */
export const BEST_VALUE: PassId = 'MONTH_MAX';
export const BEST_VALUE_LABEL = 'Le meilleur prix par réponse';

export interface OfferCardData {
  id: PassId;
  name: string;
  price: string;
  durationLabel: string;
  responsesLabel: string;
  forWho: string;
  bestValue: boolean;
}

/** The five passes, in the grid's order. Prices are FCFA, written in the shop's words. */
export function offerCards(currency: string): OfferCardData[] {
  return PASS_IDS.map((id) => {
    const plan = PLANS[id];
    return {
      id,
      name: plan.label,
      price: formatMoney(plan.priceXof ?? 0, currency),
      durationLabel: `${plan.durationDays ?? 0} jours`,
      responsesLabel: answers(plan.includedResponses ?? 0),
      forWho: FOR_WHO[id],
      bestValue: id === BEST_VALUE,
    };
  });
}

/** The Illimité: on quote, through the support (its button needs Tamani's WhatsApp). */
export function unlimitedCard() {
  return {
    name: PLANS.UNLIMITED.label,
    price: 'Sur devis',
    durationLabel: `${PLANS.UNLIMITED.durationDays ?? 30} jours`,
    responsesLabel: "autant de réponses qu'il te faut",
    forWho: FOR_WHO.UNLIMITED,
  };
}

/**
 * The return page's wait before asking again: every 3 s while a payment
 * usually lands, then every 10 s. Each ask is two SasPay calls, and the
 * account has 300 a minute for every shop.
 */
export function pollDelay(elapsedMs: number): number {
  return elapsedMs < 30_000 ? 3_000 : 10_000;
}

export type ReturnState = 'checking' | 'active' | 'failed';

/**
 * The return page reads the purchase. An EXPIRED one may still be paid
 * late: it stays « checking » while SasPay is asked.
 */
export function returnState(purchase: { status: string; activated: boolean } | null): ReturnState {
  if (!purchase) return 'checking';
  if (purchase.activated) return 'active';
  return purchase.status === 'FAILED' ? 'failed' : 'checking';
}

export function purchaseStatusLabel(p: { status: string; activated: boolean }): string {
  if (p.activated) return 'Actif';
  if (p.status === 'FAILED') return 'Échoué';
  if (p.status === 'EXPIRED') return 'Non payé';
  return 'En attente';
}

/** The meter's button: another pass once one runs (no top-up). */
export function passCta(plan: PlanId): string {
  return plan === 'FREE' || plan === 'TRIAL' ? 'Prendre un pass' : 'Prendre un autre pass';
}
