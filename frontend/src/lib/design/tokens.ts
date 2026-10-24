// Tamani design tokens — "Cahier du marché" (docs/brand/tamani-brand.md).
// This file is the tested source of truth; the @theme block in
// app/globals.css mirrors it (tokens-sync.test.ts keeps them identical).

export const colors = {
  bg: '#FDFDF8',
  surface: '#FFFFFF',
  grid: '#DDE6F4',
  margin: '#E2878A',
  ink: '#10204A',
  inkSoft: '#3E4660',
  inkMuted: '#596071',
  primary: '#1A4FBF',
  primaryInk: '#FFFFFF',
  accent: '#FFCC1F',
  accentInk: '#10204A',
  success: '#1B7344',
  warning: '#B8520A',
  danger: '#B42318',
  neutralVerdict: '#596071',
  whatsapp: '#25D366',
  whatsappInk: '#073B1F',
} as const satisfies Record<string, `#${string}`>;

export type ColorToken = keyof typeof colors;
