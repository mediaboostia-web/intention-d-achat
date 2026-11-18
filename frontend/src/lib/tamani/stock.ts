// The stock left of a campaign (porteur, 2026-11-18): what the wholesaler
// wrote, minus what clients paid for. Answers are intentions and never lower
// it; an order un-paid or cancelled gives its pieces back, since nothing is
// stored. Per option when the product has colours or sizes.
import { parseCount } from './fcfa-input';
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

/** The first count naming an option the product does not have, or null. */
export function unknownStockOption(
  stock: readonly OptionStock[] | null | undefined,
  options: readonly string[],
): string | null {
  return stock?.find((s) => !options.includes(s.option))?.option ?? null;
}

/** The campaign forms: one field per option, the saved count or blank. */
export function optionStockToForm(
  options: readonly string[],
  stored: readonly OptionStock[] | null,
): Record<string, string> {
  return Object.fromEntries(
    options.map((option) => {
      const saved = stored?.find((s) => s.option === option);
      return [option, saved ? String(saved.count) : ''];
    }),
  );
}

/** The typed counts in the product's order; a blank option has no count; null when none. */
export function optionStockFromForm(
  options: readonly string[],
  typed: Readonly<Record<string, string>>,
): { ok: true; stock: OptionStock[] | null } | { ok: false; option: string } {
  const stock: OptionStock[] = [];
  for (const option of options) {
    const raw = (typed[option] ?? '').trim();
    if (raw === '') continue;
    const count = parseCount(raw, 0);
    if (count === null) return { ok: false, option };
    stock.push({ option, count });
  }
  return { ok: true, stock: stock.length > 0 ? stock : null };
}
