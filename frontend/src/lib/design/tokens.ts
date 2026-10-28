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
  /** The notebook's cover (sidebar, ink cards): dark in both themes. */
  deep: '#10204A',
  deepInk: '#FFFFFF',
} as const satisfies Record<string, `#${string}`>;

export type ColorToken = keyof typeof colors;

/**
 * "Carnet de nuit", the shop space's night theme: navy paper, faint squares,
 * the ink turns to chalk. Same keys as the day; globals.css redefines them
 * under :root[data-theme='dark'] (tokens-sync.test.ts).
 */
export const nightColors = {
  bg: '#0C1430',
  surface: '#131F45',
  grid: '#18264B',
  margin: '#6E3A52',
  ink: '#EEF1FA',
  inkSoft: '#C6CDE2',
  inkMuted: '#9EA8C4',
  primary: '#93B2FF',
  primaryInk: '#0C1430',
  accent: '#FFCC1F',
  accentInk: '#10204A',
  success: '#5FD39A',
  warning: '#F4A867',
  danger: '#FF8F85',
  neutralVerdict: '#9EA8C4',
  whatsapp: '#25D366',
  whatsappInk: '#073B1F',
  deep: '#070D24',
  deepInk: '#EEF1FA',
} as const satisfies Record<ColorToken, `#${string}`>;

/** Color family of a verdict stamp (see lib/tamani/verdict-display.ts). */
export type VerdictTone = 'success' | 'warning' | 'danger' | 'neutral' | 'primary';

export const verdictToneColor: Readonly<Record<VerdictTone, ColorToken>> = {
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  neutral: 'neutralVerdict',
  primary: 'primary',
};

/** Every text/background pairing the UI uses. Each must reach 4.5:1, by day and by night. */
export const contrastPairs: ReadonlyArray<{ fg: ColorToken; bg: ColorToken; use: string }> = [
  { fg: 'ink', bg: 'bg', use: 'texte sur le papier' },
  { fg: 'ink', bg: 'surface', use: 'texte sur une carte' },
  { fg: 'inkSoft', bg: 'bg', use: 'texte secondaire sur le papier' },
  { fg: 'inkSoft', bg: 'surface', use: 'texte secondaire sur une carte' },
  { fg: 'inkMuted', bg: 'bg', use: 'notes au crayon' },
  { fg: 'inkMuted', bg: 'surface', use: 'légendes sur une carte' },
  { fg: 'primary', bg: 'bg', use: 'titres à la main' },
  { fg: 'primary', bg: 'surface', use: 'liens sur une carte' },
  { fg: 'primaryInk', bg: 'primary', use: 'bouton principal' },
  { fg: 'primaryInk', bg: 'success', use: 'badge plein Commande' },
  { fg: 'primaryInk', bg: 'warning', use: 'badge plein Prudence' },
  { fg: 'primaryInk', bg: 'danger', use: "badge plein N'achète pas" },
  { fg: 'accentInk', bg: 'accent', use: 'onglet actif, choix sélectionné' },
  { fg: 'whatsappInk', bg: 'whatsapp', use: 'bouton WhatsApp' },
  { fg: 'surface', bg: 'ink', use: 'texte sur un bouton encre' },
  { fg: 'deepInk', bg: 'deep', use: 'texte sur la couverture du cahier' },
  { fg: 'accent', bg: 'deep', use: 'montant et lien sur la couverture' },
  ...(['bg', 'surface'] as const).flatMap((bg) =>
    Object.values(verdictToneColor).map((fg) => ({ fg, bg, use: 'tampon de verdict' })),
  ),
];

const HEX = /^#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/;

/** WCAG 2.1 relative luminance of a `#RRGGBB` color. */
export function relativeLuminance(hex: string): number {
  const m = HEX.exec(hex);
  if (!m) throw new Error(`not a #RRGGBB color: ${hex}`);
  const [r, g, b] = m.slice(1).map((h) => {
    const c = parseInt(h, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.1 contrast ratio between two `#RRGGBB` colors (1 to 21). */
export function contrastRatio(hexA: string, hexB: string): number {
  const [hi, lo] = [relativeLuminance(hexA), relativeLuminance(hexB)].sort((a, b) => b - a) as [
    number,
    number,
  ];
  return (hi + 0.05) / (lo + 0.05);
}
