// The shops' currencies (lot 7b, porteur 2026-10-29). Prices show the local
// name, the one read at the market; the ISO code stays internal (SasPay,
// lot 8). None of them uses decimals: amounts are whole units.
import { formatPrice } from '@/lib/utils';

export type CurrencyCode = 'XOF' | 'XAF' | 'GNF' | 'CDF';

export const CURRENCY_LABEL: Readonly<Record<CurrencyCode, string>> = {
  XOF: 'FCFA',
  XAF: 'FCFA',
  GNF: 'FG',
  CDF: 'FC',
};

const isCurrency = (c: string): c is CurrencyCode => Object.hasOwn(CURRENCY_LABEL, c);

/** "FCFA", "FG", "FC"; an unknown stored currency reads FCFA. */
export function currencyLabel(currency: string): string {
  return isCurrency(currency) ? CURRENCY_LABEL[currency] : CURRENCY_LABEL.XOF;
}

/** 65000, "GNF" → "65 000 FG". */
export function formatMoney(amount: number, currency: string): string {
  return formatPrice(amount, currencyLabel(currency));
}
