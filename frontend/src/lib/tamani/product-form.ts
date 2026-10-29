// The product form keeps what the wholesaler typed (strings); this turns
// it into the API body, or into one message per field to fix.
import { formatPrice } from '@/lib/utils';
import { currencyLabel } from './currency';
import { parseCount, parseAmount } from './fcfa-input';
import { productRuleViolation } from './product-rules';

export interface ProductFormValues {
  name: string;
  description: string;
  unitLabel: string;
  unitPrice: string;
  wholesalePrice: string;
  wholesaleMinQty: string;
  costPrice: string;
  photos: string[];
  optionLabel: string;
  options: string[];
}

export const emptyProductForm: ProductFormValues = {
  name: '',
  description: '',
  unitLabel: 'pièce',
  unitPrice: '',
  wholesalePrice: '',
  wholesaleMinQty: '',
  costPrice: '',
  photos: [],
  optionLabel: '',
  options: [],
};

export interface ProductBody {
  name: string;
  description: string | null;
  unitLabel: string;
  unitPrice: number;
  wholesalePrice: number | null;
  wholesaleMinQty: number | null;
  costPrice: number | null;
  photos: string[];
  optionLabel: string | null;
  options: string[];
}

/** A product as the shop sees it (lib/server/tamani/serializers.ts toShopProduct). */
export interface ShopProduct extends ProductBody {
  id: string;
  archivedAt: string | null;
  createdAt: string;
}

export type ProductFormErrors = Partial<Record<keyof ProductFormValues, string>>;

const typed = (n: number | null) => (n === null ? '' : formatPrice(n));

/** The saved product as the form shows it: amounts written "7 500". */
export function productToForm(p: ShopProduct): ProductFormValues {
  return {
    name: p.name,
    description: p.description ?? '',
    unitLabel: p.unitLabel,
    unitPrice: typed(p.unitPrice),
    wholesalePrice: typed(p.wholesalePrice),
    wholesaleMinQty: p.wholesaleMinQty === null ? '' : String(p.wholesaleMinQty),
    costPrice: typed(p.costPrice),
    photos: [...p.photos],
    optionLabel: p.optionLabel ?? '',
    options: [...p.options],
  };
}

const priceHint = (currency: string) =>
  `Écris le prix en ${currencyLabel(currency)}, sans virgule, par exemple 7 500.`;

export function productFormToBody(
  v: ProductFormValues,
  currency: string,
): { ok: true; body: ProductBody } | { ok: false; errors: ProductFormErrors } {
  const errors: ProductFormErrors = {};
  const optionalPrice = (raw: string, field: keyof ProductFormValues) => {
    if (raw.trim() === '') return null;
    const n = parseAmount(raw);
    if (n === null) errors[field] = priceHint(currency);
    return n;
  };

  const name = v.name.trim();
  if (name === '') errors.name = 'Donne un nom à ton produit.';
  else if (name.length > 80) errors.name = '80 caractères au plus.';

  const unitPrice = parseAmount(v.unitPrice);
  if (unitPrice === null) errors.unitPrice = priceHint(currency);
  const wholesalePrice = optionalPrice(v.wholesalePrice, 'wholesalePrice');
  const costPrice = optionalPrice(v.costPrice, 'costPrice');

  let wholesaleMinQty: number | null = null;
  if (v.wholesaleMinQty.trim() !== '') {
    wholesaleMinQty = parseCount(v.wholesaleMinQty, 2);
    if (wholesaleMinQty === null) errors.wholesaleMinQty = 'À partir de 2 articles au moins.';
  }

  const optionLabel = v.optionLabel.trim() || null;
  const options = [...new Set(v.options.map((o) => o.trim()).filter(Boolean))];

  if (Object.keys(errors).length > 0 || unitPrice === null) return { ok: false, errors };

  const broken = productRuleViolation({
    unitPrice,
    wholesalePrice,
    wholesaleMinQty,
    optionLabel,
    options,
  });
  if (broken) return { ok: false, errors: { [broken.field]: broken.message } };

  return {
    ok: true,
    body: {
      name,
      description: v.description.trim() || null,
      unitLabel: v.unitLabel.trim() || 'pièce',
      unitPrice,
      wholesalePrice,
      wholesaleMinQty,
      costPrice,
      photos: v.photos,
      optionLabel,
      options,
    },
  };
}
