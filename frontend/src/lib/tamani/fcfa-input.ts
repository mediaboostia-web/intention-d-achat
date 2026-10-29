// Amounts and counts typed by a wholesaler. FCFA, the Guinean franc and the
// Congolese franc have no decimals: "7 500", "7.500" (dot as thousands
// separator), "7500 F", "65 000 FG" or "18 000 FC" all read as whole units,
// while "7,5" or "7500.50" are refused rather than guessed.

const MAX_FCFA = 100_000_000;

/** Whole units from 1 to 100 000 000, the local currency name typed after it dropped, or null. */
export function parseAmount(raw: string): number | null {
  const compact = raw
    .trim()
    .replace(/\s*(f\s*cfa|cfa|gnf|fg|cdf|fc|f)$/i, '')
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
