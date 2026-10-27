// Realistic demand (spec §5.4.1): announced quantities times the share
// that historically turns into a purchase, per buyer type, with a ±0.1
// range on the coefficient.
import 'server-only';
import { BUYER_TYPES, type BuyerType } from '@/lib/tamani/labels';
import type { DemandEstimate } from '@/lib/tamani/results-view';

export type { DemandEstimate };

const RANGE = 0.1;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

type Totals = Record<BuyerType, { respondents: number; announced: number }>;

/** The estimate from per-type totals (the home page sums them in the database). */
export function estimateFromTotals(
  sums: Totals,
  coefs: { consumer: number; reseller: number },
): DemandEstimate {
  const coef: Record<BuyerType, number> = { CONSUMER: coefs.consumer, RESELLER: coefs.reseller };
  const total = (pick: (t: BuyerType) => number) =>
    Math.round(BUYER_TYPES.reduce((acc, t) => acc + sums[t].announced * pick(t), 0));

  const byBuyerType = Object.fromEntries(
    BUYER_TYPES.map((t) => [t, { ...sums[t], realistic: Math.round(sums[t].announced * coef[t]) }]),
  ) as DemandEstimate['byBuyerType'];

  return {
    announced: sums.CONSUMER.announced + sums.RESELLER.announced,
    realistic: total((t) => coef[t]),
    low: total((t) => clamp01(coef[t] - RANGE)),
    high: total((t) => clamp01(coef[t] + RANGE)),
    byBuyerType,
  };
}

export function estimateDemand(
  rows: ReadonlyArray<{ buyerType: BuyerType; quantity: number }>,
  coefs: { consumer: number; reseller: number },
): DemandEstimate {
  const sums: Totals = {
    CONSUMER: { respondents: 0, announced: 0 },
    RESELLER: { respondents: 0, announced: 0 },
  };
  for (const r of rows) {
    sums[r.buyerType].respondents += 1;
    sums[r.buyerType].announced += r.quantity;
  }
  return estimateFromTotals(sums, coefs);
}
