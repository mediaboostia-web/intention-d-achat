// Rules across product fields, shared by the product form (to show the
// problem under its field) and the API (lib/server/tamani/inputs.ts).

export interface ProductRuleInput {
  unitPrice: number;
  wholesalePrice: number | null;
  wholesaleMinQty: number | null;
  optionLabel: string | null;
  options: readonly string[];
}

export type ProductRuleField = 'wholesalePrice' | 'wholesaleMinQty' | 'optionLabel' | 'options';

export function productRuleViolation(
  p: ProductRuleInput,
): { field: ProductRuleField; message: string } | null {
  if (p.wholesalePrice !== null && p.wholesaleMinQty === null) {
    return {
      field: 'wholesaleMinQty',
      message: "Indique à partir de combien d'articles le prix de gros s'applique.",
    };
  }
  if (p.wholesalePrice === null && p.wholesaleMinQty !== null) {
    return { field: 'wholesalePrice', message: 'Indique le prix de gros.' };
  }
  if (p.wholesalePrice !== null && p.wholesalePrice >= p.unitPrice) {
    return {
      field: 'wholesalePrice',
      message: "Le prix de gros doit être plus bas que le prix à l'unité.",
    };
  }
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
