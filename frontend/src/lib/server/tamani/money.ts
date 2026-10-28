// The money in a verdict (spec §5.4.0), only with the product's purchase
// price: the dead stock avoided and the profit to expect. Integer FCFA.
import 'server-only';
import type { DemandEstimate } from '@/lib/tamani/results-view';

export function computeMoney(i: {
  reference: number | null;
  estimate: DemandEstimate;
  costPrice: number | null;
  unitPrice: number;
  wholesalePrice: number | null;
  /** In stock: the profit stops at what is on the shelf. */
  cap?: number | null;
}): { avoidedDeadStock: number | null; expectedProfit: number | null } {
  if (i.costPrice === null) return { avoidedDeadStock: null, expectedProfit: null };
  const cost = i.costPrice;
  const avoidedDeadStock =
    i.reference === null ? null : Math.max(i.reference - i.estimate.realistic, 0) * cost;
  const { CONSUMER, RESELLER } = i.estimate.byBuyerType;
  const resellerPrice = i.wholesalePrice ?? i.unitPrice;
  const realistic = i.estimate.realistic;
  const share = i.cap != null && realistic > i.cap ? i.cap / realistic : 1;
  const expectedProfit = Math.round(
    (CONSUMER.realistic * (i.unitPrice - cost) + RESELLER.realistic * (resellerPrice - cost)) *
      share,
  );
  return { avoidedDeadStock, expectedProfit };
}
