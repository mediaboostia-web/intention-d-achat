// Quantities per option (porteur, 2026-11-04): on a product with colours or
// sizes, a respondent says how many of each. The answer keeps its total in
// `quantity` (the estimate, the verdict and the money read it) and the split
// in `Response.optionQuantities`; `option` holds the option when only one is
// chosen. Shared by the popup and the server.

export interface OptionQuantity {
  option: string;
  quantity: number;
}

const isEntry = (v: unknown): v is OptionQuantity =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as OptionQuantity).option === 'string' &&
  Number.isInteger((v as OptionQuantity).quantity) &&
  (v as OptionQuantity).quantity > 0;

/** The split of an answer: the stored one, else one line from its single option. */
export function optionSplit(r: {
  option: string | null;
  quantity: number | null;
  optionQuantities: unknown;
}): OptionQuantity[] {
  const stored = r.optionQuantities;
  if (Array.isArray(stored)) return stored.every(isEntry) ? stored : [];
  if (stored !== null && stored !== undefined) return [];
  return r.option !== null && r.quantity !== null
    ? [{ option: r.option, quantity: r.quantity }]
    : [];
}

/** "Rouge × 3, Bleu × 2"; one option alone stays "Rouge" (its quantity is the answer's). */
export function optionText(split: readonly OptionQuantity[]): string | null {
  if (split.length === 0) return null;
  if (split.length === 1) return split[0]!.option;
  return split.map((s) => `${s.option} × ${s.quantity}`).join(', ');
}

/** What the popup sends: the product's order, the zeros dropped. */
export function optionEntries(
  options: readonly string[],
  counts: Readonly<Record<string, number>>,
): OptionQuantity[] {
  return options.flatMap((option) => {
    const quantity = counts[option] ?? 0;
    return quantity > 0 ? [{ option, quantity }] : [];
  });
}

export const splitTotal = (split: readonly OptionQuantity[]) =>
  split.reduce((sum, s) => sum + s.quantity, 0);
