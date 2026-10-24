// Realistic demand (spec §5.4.1): announced quantities times the share
// that historically turns into a purchase, per buyer type, with a ±0.1
// range on the coefficient.
import 'server-only';
import { BUYER_TYPES, type BuyerType } from '@/lib/tamani/labels';

export interface DemandEstimate {
  announced: number;
  realistic: number;
  low: number;
  high: number;
  byBuyerType: Record<BuyerType, { respondents: number; announced: number; realistic: number }>;
}

const RANGE = 0.1;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function estimateDemand(
  rows: ReadonlyArray<{ buyerType: BuyerType; quantity: number }>,
  coefs: { consumer: number; reseller: number },
): DemandEstimate {
  const coef: Record<BuyerType, number> = { CONSUMER: coefs.consumer, RESELLER: coefs.reseller };
  const sums: Record<BuyerType, { respondents: number; announced: number }> = {
    CONSUMER: { respondents: 0, announced: 0 },
    RESELLER: { respondents: 0, announced: 0 },
  };
  for (const r of rows) {
    sums[r.buyerType].respondents += 1;
    sums[r.buyerType].announced += r.quantity;
  }

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
