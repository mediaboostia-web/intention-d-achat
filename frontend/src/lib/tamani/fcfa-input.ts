// Amounts and counts typed by a wholesaler. FCFA has no decimals: "7 500",
// "7.500" (dot as thousands separator) and "7500 F" all mean 7500, while
// "7,5" or "7500.50" are refused rather than guessed.

const MAX_FCFA = 100_000_000;

/** Whole FCFA from 1 to 100 000 000, or null. */
export function parseFcfa(raw: string): number | null {
  const compact = raw
    .trim()
    .replace(/\s*(f\s*cfa|cfa|f)$/i, '')
    // \s covers the no-break spaces Intl and phone keyboards insert.
    .replace(/\s/g, '');
  if (!/^\d{1,3}(\.\d{3})+$|^\d+$/.test(compact)) return null;
  const n = Number(compact.replace(/\./g, ''));
  return n >= 1 && n <= MAX_FCFA ? n : null;
}

/** A whole number at or above `min` (spaces allowed), or null. */
export function parseCount(raw: string, min = 0): number | null {
  const compact = raw.replace(/\s/g, '');
  if (!/^\d+$/.test(compact)) return null;
  const n = Number(compact);
  return n >= min && n <= MAX_FCFA ? n : null;
}
