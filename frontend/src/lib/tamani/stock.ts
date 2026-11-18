// The stock left of a campaign (porteur, 2026-11-18): what the wholesaler
// wrote, minus what clients paid for. Answers are intentions and never lower
// it; an order un-paid or cancelled gives its pieces back, since nothing is
// stored. Per option when the product has colours or sizes.
import type { OptionQuantity } from './option-split';

export interface OptionStock {
  option: string;
  count: number;
}

/** The counts stored on a campaign; null when none (or malformed). */
export function readOptionStock(json: unknown): OptionStock[] | null {
  if (!Array.isArray(json) || json.length === 0) return null;
  const ok = json.every(
    (v) =>
      typeof v === 'object' &&
      v !== null &&
      typeof (v as OptionStock).option === 'string' &&
      Number.isInteger((v as OptionStock).count) &&
      (v as OptionStock).count >= 0,
  );
  return ok ? (json as OptionStock[]) : null;
}

/** Each option's count minus its paid pieces, never below zero. */
export function optionStockLeft(
  declared: readonly OptionStock[],
  paid: readonly (readonly OptionQuantity[])[],
): Record<string, number> {
  const left: Record<string, number> = {};
  for (const d of declared) left[d.option] = d.count;
  for (const split of paid) {
    for (const s of split) {
      if (s.option in left) left[s.option] = Math.max(0, left[s.option]! - s.quantity);
    }
  }
  return left;
}

/** The stock minus the paid quantities, never below zero; null: no stock written. */
export function stockLeft(
  declared: number | null,
  paidQuantities: readonly number[],
): number | null {
  if (declared === null) return null;
  return Math.max(
    0,
    paidQuantities.reduce((left, q) => left - q, declared),
  );
}
