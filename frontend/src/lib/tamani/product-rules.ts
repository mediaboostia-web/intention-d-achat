// Rules across product fields, shared by the product form (to show the
// problem under its field) and the API (lib/server/tamani/inputs.ts).
import { offerViolation, type Offer } from './offers';

export interface ProductRuleInput {
  unitPrice: number;
  offers: readonly Offer[];
  optionLabel: string | null;
  options: readonly string[];
}

export type ProductRuleField = 'offers' | 'optionLabel' | 'options';

export function productRuleViolation(
  p: ProductRuleInput,
): { field: ProductRuleField; message: string; offerIndex?: number } | null {
  const offer = offerViolation(p.offers, p.unitPrice);
  if (offer) return { field: 'offers', message: offer.message, offerIndex: offer.index };
  if (p.options.length > 0 && p.optionLabel === null) {
    return { field: 'optionLabel', message: "Donne un nom à l'option, par exemple Couleur." };
  }
  if (p.optionLabel !== null && p.options.length === 0) {
    return { field: 'options', message: 'Ajoute au moins un choix.' };
  }
  return null;
}

/** The rule broken, as a message, or null. */
export function checkProductRules(p: ProductRuleInput): string | null {
  return productRuleViolation(p)?.message ?? null;
}
