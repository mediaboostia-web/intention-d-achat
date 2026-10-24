// Tamani plans (spec §5.6). Pure and shared with the browser: the pricing
// page, the paywalls and the server quota checks all read this table.

export type PlanId = 'FREE' | 'PRO' | 'BUSINESS';

export interface PlanDefinition {
  id: PlanId;
  label: string;
  monthlyPriceXof: number;
  /** null = unlimited. */
  maxActiveCampaigns: number | null;
  /** Completed responses per calendar month (UTC). */
  monthlyResponses: number;
  seats: number;
  features: {
    estimate: boolean;
    sourceLinks: boolean;
    respondentContacts: boolean;
    csvExport: boolean;
    reliability: boolean;
    poweredByBadge: boolean;
  };
}

const PAID_FEATURES: PlanDefinition['features'] = {
  estimate: true,
  sourceLinks: true,
  respondentContacts: true,
  csvExport: true,
  reliability: true,
  poweredByBadge: false,
};

export const PLANS: Readonly<Record<PlanId, PlanDefinition>> = {
  FREE: {
    id: 'FREE',
    label: 'Gratuit',
    monthlyPriceXof: 0,
    maxActiveCampaigns: 3,
    monthlyResponses: 150,
    seats: 1,
    features: {
      estimate: false,
      sourceLinks: false,
      respondentContacts: false,
      csvExport: false,
      reliability: false,
      poweredByBadge: true,
    },
  },
  PRO: {
    id: 'PRO',
    label: 'Pro',
    monthlyPriceXof: 9900,
    maxActiveCampaigns: null,
    monthlyResponses: 3000,
    seats: 1,
    features: PAID_FEATURES,
  },
  BUSINESS: {
    id: 'BUSINESS',
    label: 'Business',
    monthlyPriceXof: 24900,
    maxActiveCampaigns: null,
    monthlyResponses: 15000,
    seats: 3,
    features: PAID_FEATURES,
  },
};

export function isPlanId(value: string): value is PlanId {
  return Object.hasOwn(PLANS, value);
}

/** A year costs ten months. Amounts are integer FCFA. */
export function priceFor(plan: 'PRO' | 'BUSINESS', months: 1 | 12): number {
  const monthly = PLANS[plan].monthlyPriceXof;
  return months === 12 ? monthly * 10 : monthly;
}
