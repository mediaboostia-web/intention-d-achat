// Countries a shop can pick (spec §5.2, Senegal by default; lot 7b: the CFA
// zone, Guinea and DR Congo). The dial code pre-fills the WhatsApp field; the
// server normalizes the number with the same country
// (lib/server/tamani/phone.ts). The currency follows the country.
import type { CurrencyCode } from './currency';

export interface ShopCountry {
  code: string;
  label: string;
  dialCode: string;
  currency: CurrencyCode;
}

export const SHOP_COUNTRIES: ReadonlyArray<ShopCountry> = [
  // UEMOA: FCFA of West Africa.
  { code: 'SN', label: 'Sénégal', dialCode: '+221', currency: 'XOF' },
  { code: 'CI', label: "Côte d'Ivoire", dialCode: '+225', currency: 'XOF' },
  { code: 'ML', label: 'Mali', dialCode: '+223', currency: 'XOF' },
  { code: 'BF', label: 'Burkina Faso', dialCode: '+226', currency: 'XOF' },
  { code: 'TG', label: 'Togo', dialCode: '+228', currency: 'XOF' },
  { code: 'BJ', label: 'Bénin', dialCode: '+229', currency: 'XOF' },
  { code: 'NE', label: 'Niger', dialCode: '+227', currency: 'XOF' },
  { code: 'GW', label: 'Guinée-Bissau', dialCode: '+245', currency: 'XOF' },
  // CEMAC: FCFA of Central Africa.
  { code: 'CM', label: 'Cameroun', dialCode: '+237', currency: 'XAF' },
  { code: 'GA', label: 'Gabon', dialCode: '+241', currency: 'XAF' },
  { code: 'CG', label: 'Congo', dialCode: '+242', currency: 'XAF' },
  { code: 'TD', label: 'Tchad', dialCode: '+235', currency: 'XAF' },
  { code: 'CF', label: 'Centrafrique', dialCode: '+236', currency: 'XAF' },
  { code: 'GQ', label: 'Guinée équatoriale', dialCode: '+240', currency: 'XAF' },
  { code: 'GN', label: 'Guinée', dialCode: '+224', currency: 'GNF' },
  { code: 'CD', label: 'RD Congo', dialCode: '+243', currency: 'CDF' },
];

export function isShopCountry(code: string): boolean {
  return SHOP_COUNTRIES.some((c) => c.code === code);
}

export function dialCodeFor(code: string): string {
  return SHOP_COUNTRIES.find((c) => c.code === code)?.dialCode ?? '+221';
}

/** The currency of a shop's country, Senegal's (XOF) when unknown. */
export function currencyForCountry(code: string): CurrencyCode {
  return SHOP_COUNTRIES.find((c) => c.code === code)?.currency ?? 'XOF';
}

/** "+221771234567" → "771234567" for the phone field, which shows "+221" itself. */
export function nationalNumber(e164: string, country: string): string {
  const dial = dialCodeFor(country);
  return e164.startsWith(dial) ? e164.slice(dial.length) : e164;
}
