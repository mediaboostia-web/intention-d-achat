// Tamani passes (spec §5.6, the porteur's grid of 2026-10-29). Pure and
// shared with the browser: the pricing grid, the paywalls, the margin guard
// and the server quota checks all read this table. Prices are integer FCFA,
// the same figure in XOF and XAF.

export type PlanId =
  | 'FREE'
  | 'TRIAL'
  | 'WEEK'
  | 'TWO_WEEKS'
  | 'MONTH'
  | 'MONTH_PLUS'
  | 'MONTH_MAX'
  | 'UNLIMITED';

export interface PlanDefinition {
  id: PlanId;
  label: string;
  /** null = on quote (Illimité). */
  priceXof: number | null;
  /** null = no end (« Sans pass »). */
  durationDays: number | null;
  /** Answers counted over the pass; null = set by the quote or none. */
  includedResponses: number | null;
  /** null = unlimited. */
  maxActiveCampaigns: number | null;
  features: {
    estimate: boolean;
    sourceLinks: boolean;
    respondentContacts: boolean;
    csvExport: boolean;
    reliability: boolean;
    poweredByBadge: boolean;
  };
}

const PASS_FEATURES: PlanDefinition['features'] = {
  estimate: true,
  sourceLinks: true,
  respondentContacts: true,
  csvExport: true,
  reliability: true,
  poweredByBadge: false,
};

function pass(
  id: PlanId,
  label: string,
  priceXof: number,
  durationDays: number,
  includedResponses: number,
): PlanDefinition {
  return {
    id,
    label,
    priceXof,
    durationDays,
    includedResponses,
    maxActiveCampaigns: null,
    features: PASS_FEATURES,
  };
}

export const PLANS: Readonly<Record<PlanId, PlanDefinition>> = {
  // After the trial, or a pass and its grace: new answers wait for a pass.
  FREE: {
    id: 'FREE',
    label: 'Sans pass',
    priceXof: 0,
    durationDays: null,
    includedResponses: 0,
    maxActiveCampaigns: 1,
    features: {
      estimate: false,
      sourceLinks: false,
      respondentContacts: false,
      csvExport: false,
      reliability: false,
      poweredByBadge: true,
    },
  },
  // Everything but the per-group links and the export (porteur, 2026-10-29).
  TRIAL: {
    id: 'TRIAL',
    label: 'Essai gratuit',
    priceXof: 0,
    durationDays: 3,
    includedResponses: 50,
    maxActiveCampaigns: 1,
    features: {
      estimate: true,
      sourceLinks: false,
      respondentContacts: true,
      csvExport: false,
      reliability: true,
      poweredByBadge: true,
    },
  },
  WEEK: pass('WEEK', 'Pass Semaine', 3900, 7, 150),
  TWO_WEEKS: pass('TWO_WEEKS', 'Pass 2 Semaines', 5900, 14, 350),
  MONTH: pass('MONTH', 'Pass Mois', 9900, 30, 1000),
  MONTH_PLUS: pass('MONTH_PLUS', 'Pass Mois Plus', 14900, 30, 2500),
  MONTH_MAX: pass('MONTH_MAX', 'Pass Mois Max', 24900, 30, 5000),
  // On quote, granted by hand from the admin (lot 9).
  UNLIMITED: {
    id: 'UNLIMITED',
    label: 'Pass Illimité',
    priceXof: null,
    durationDays: 30,
    includedResponses: null,
    maxActiveCampaigns: null,
    features: PASS_FEATURES,
  },
};

/** The passes a shop buys online, in the grid's order. No top-ups: another pass adds answers. */
export const PASS_IDS = ['WEEK', 'TWO_WEEKS', 'MONTH', 'MONTH_PLUS', 'MONTH_MAX'] as const;
export type PassId = (typeof PASS_IDS)[number];

export function isPlanId(value: string): value is PlanId {
  return Object.hasOwn(PLANS, value);
}

export function isPassId(value: string): value is PassId {
  return (PASS_IDS as readonly string[]).includes(value);
}

export function passPrice(id: PassId): number {
  return PLANS[id].priceXof ?? 0;
}

export function passResponses(id: PassId): number {
  return PLANS[id].includedResponses ?? 0;
}

/**
 * The margin rule (porteur, 2026-10-25): every paid offer keeps 70 % once
 * SasPay's payin (worst network read on 2026-10-29: 5.7 %), the withdrawal
 * (worst: 4.5 %) and 0.25 FCFA of servers per answer are paid. The payin is
 * now the customer's (fees added on, porteur 2026-10-29); it stays counted
 * so the grid holds if Tamani absorbs the fees again.
 */
export const MARGIN_ASSUMPTIONS = {
  saspayFee: 0.06,
  payoutFee: 0.045,
  costPerResponse: 0.25,
  floor: 0.7,
} as const;

export function marginOf(priceXof: number, responses: number): number {
  const { saspayFee, payoutFee, costPerResponse } = MARGIN_ASSUMPTIONS;
  return 1 - saspayFee - payoutFee - (responses * costPerResponse) / priceXof;
}

export const PAYMENT_CURRENCIES = ['XOF', 'XAF'] as const;

/** FCFA countries where SasPay takes payments (my-rates, 2026-10-29). */
export const PAYMENT_COUNTRIES = [
  'SN',
  'CI',
  'ML',
  'BF',
  'TG',
  'BJ',
  'NE',
  'CM',
  'GA',
  'CG',
] as const;

export function isPaymentCountry(code: string): boolean {
  return (PAYMENT_COUNTRIES as readonly string[]).includes(code);
}
