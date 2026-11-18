// The product form keeps what the wholesaler typed (strings); this turns
// it into the API body, or into one message per field to fix.
import { formatPrice } from '@/lib/utils';
import { currencyLabel } from './currency';
import { parseCount, parseAmount } from './fcfa-input';
import { OFFER_NAME_MAX, type Offer, type OfferKind } from './offers';
import { productRuleViolation } from './product-rules';

/** One wholesale offer as typed (2026-11-18): « 12 » pour « 26 000 ». */
export interface OfferRow {
  kind: OfferKind;
  qty: string;
  price: string;
  name: string;
}

export const emptyOfferRow = (kind: OfferKind = 'FROM'): OfferRow => ({
  kind,
  qty: '',
  price: '',
  name: '',
});

export interface ProductFormValues {
  name: string;
  description: string;
  unitLabel: string;
  unitPrice: string;
  offers: OfferRow[];
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
  offers: [],
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
  offers: Offer[];
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
    offers: p.offers.map((o) => ({
      kind: o.kind,
      qty: String(o.qty),
      price: typed(o.price),
      name: o.name ?? '',
    })),
    costPrice: typed(p.costPrice),
    photos: [...p.photos],
    optionLabel: p.optionLabel ?? '',
    options: [...p.options],
  };
}

const priceHint = (currency: string) =>
  `Écris le prix en ${currencyLabel(currency)}, sans virgule, par exemple 7 500.`;

const isBlank = (r: OfferRow) => r.qty.trim() === '' && r.price.trim() === '';

/** « Offre 2 : le prix… »: the message names the row it is about. */
const aboutOffer = (index: number, message: string) =>
  `Offre ${index + 1} : ${message.charAt(0).toLocaleLowerCase('fr')}${message.slice(1)}`;

/** The typed offers, the empty rows dropped; or the first row to fix. */
function offersOf(
  rows: readonly OfferRow[],
  currency: string,
): { ok: true; offers: Offer[] } | { ok: false; message: string } {
  const offers: Offer[] = [];
  for (const [index, row] of rows.filter((r) => !isBlank(r)).entries()) {
    const qty = parseCount(row.qty, 2);
    if (qty === null)
      return { ok: false, message: aboutOffer(index, 'Écris une quantité de 2 au moins.') };
    const price = parseAmount(row.price);
    if (price === null) return { ok: false, message: aboutOffer(index, priceHint(currency)) };
    const name = row.kind === 'PACK' ? row.name.trim().slice(0, OFFER_NAME_MAX) || null : null;
    offers.push({ kind: row.kind, qty, price, name });
  }
  return { ok: true, offers };
}

export function productFormToBody(
  v: ProductFormValues,
  currency: string,
): { ok: true; body: ProductBody } | { ok: false; errors: ProductFormErrors } {
  const errors: ProductFormErrors = {};

  const name = v.name.trim();
  if (name === '') errors.name = 'Donne un nom à ton produit.';
  else if (name.length > 80) errors.name = '80 caractères au plus.';

  const unitPrice = parseAmount(v.unitPrice);
  if (unitPrice === null) errors.unitPrice = priceHint(currency);
  let costPrice: number | null = null;
  if (v.costPrice.trim() !== '') {
    costPrice = parseAmount(v.costPrice);
    if (costPrice === null) errors.costPrice = priceHint(currency);
  }

  const typedOffers = offersOf(v.offers, currency);
  if (!typedOffers.ok) errors.offers = typedOffers.message;

  const optionLabel = v.optionLabel.trim() || null;
  const options = [...new Set(v.options.map((o) => o.trim()).filter(Boolean))];

  if (Object.keys(errors).length > 0 || unitPrice === null || !typedOffers.ok) {
    return { ok: false, errors };
  }

  const broken = productRuleViolation({
    unitPrice,
    offers: typedOffers.offers,
    optionLabel,
    options,
  });
  if (broken) {
    const message =
      broken.offerIndex === undefined
        ? broken.message
        : aboutOffer(broken.offerIndex, broken.message);
    return { ok: false, errors: { [broken.field]: message } };
  }

  return {
    ok: true,
    body: {
      name,
      description: v.description.trim() || null,
      unitLabel: v.unitLabel.trim() || 'pièce',
      unitPrice,
      offers: typedOffers.offers,
      costPrice,
      photos: v.photos,
      optionLabel,
      options,
    },
  };
}
