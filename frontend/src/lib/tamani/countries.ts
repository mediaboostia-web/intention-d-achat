// Countries a shop can pick at creation (spec §5.2, Senegal by default).
// The dial code pre-fills the WhatsApp field; the server normalizes the
// number with the same country (lib/server/tamani/phone.ts).

export const SHOP_COUNTRIES: ReadonlyArray<{ code: string; label: string; dialCode: string }> = [
  { code: 'SN', label: 'Sénégal', dialCode: '+221' },
  { code: 'CI', label: "Côte d'Ivoire", dialCode: '+225' },
  { code: 'ML', label: 'Mali', dialCode: '+223' },
  { code: 'BF', label: 'Burkina Faso', dialCode: '+226' },
  { code: 'TG', label: 'Togo', dialCode: '+228' },
  { code: 'BJ', label: 'Bénin', dialCode: '+229' },
  { code: 'NE', label: 'Niger', dialCode: '+227' },
  { code: 'GN', label: 'Guinée', dialCode: '+224' },
  { code: 'CM', label: 'Cameroun', dialCode: '+237' },
];

export function dialCodeFor(code: string): string {
  return SHOP_COUNTRIES.find((c) => c.code === code)?.dialCode ?? '+221';
}
