// The ready-made WhatsApp message of a campaign (spec §5.2) and the price
// and availability lines it is built from.
import { priceLine, type Offer } from './offers';
import type { Availability } from './timing';

export const DEFAULT_SHARE_TEMPLATE =
  '🔔 Nouveau : *{produit}* à {prix}. {disponibilite}. Tu en veux ? Réponds en moins de 30 secondes 👉 {lien}';

export interface ShareMessageVars {
  produit: string;
  prix: string;
  disponibilite: string;
  lien: string;
}

/** Fills {produit}, {prix}, {disponibilite} (or {disponibilité}) and {lien}; leaves any other {…} as typed. */
export function renderShareMessage(template: string, vars: ShareMessageVars): string {
  const values: Record<string, string> = { ...vars, disponibilité: vars.disponibilite };
  return template.replace(/\{([^{}\s]+)\}/g, (match, key: string) => values[key] ?? match);
}

/**
 * "7 500 FCFA (gros : 6 000 FCFA dès 12)", or the unit price alone, in the
 * shop's currency (lot 7b: "65 000 FG" in Guinea); many offers since
 * 2026-11-18 (lib/tamani/offers.ts priceLine).
 */
export function formatPriceLine(
  p: { unitPrice: number; offers: readonly Offer[] },
  currency: string,
): string {
  return priceLine(p.unitPrice, p.offers, currency);
}

const DAY_MS = 86_400_000;

export function formatAvailability(
  c: { availability: Availability; availableAt: Date | null },
  now: Date,
): string {
  if (c.availability === 'IN_STOCK') return 'Disponible maintenant';
  if (c.availableAt === null) return 'Arrivage prochainement';
  const days = Math.ceil((c.availableAt.getTime() - now.getTime()) / DAY_MS);
  if (days <= 0) return 'Arrivage imminent';
  if (days === 1) return 'Arrivage demain';
  return `Arrivage dans ${days} jours`;
}
