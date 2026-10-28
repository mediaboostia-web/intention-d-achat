// An order typed by hand on /app/commandes/nouvelle (lot 7, spec §5.5.1):
// the values as typed, the body POST /orders takes, and the price the
// server will freeze, previewed with the same rule (orderUnitPrice).
import { formatPrice } from '@/lib/utils';
import { parseCount } from './fcfa-input';
import type { BuyerType } from './labels';
import { orderUnitPrice, type Fulfillment } from './orders-view';

export interface OrderFormValues {
  productId: string;
  firstName: string;
  phone: string;
  buyerType: BuyerType;
  quantity: string;
  fulfillment: Fulfillment;
  /** '' : sans quartier. */
  zoneId: string;
  /** '' : no campaign. */
  campaignId: string;
}

export const emptyOrderForm: OrderFormValues = {
  productId: '',
  firstName: '',
  phone: '',
  buyerType: 'CONSUMER',
  quantity: '1',
  fulfillment: 'PICKUP',
  zoneId: '',
  campaignId: '',
};

export interface OrderBody {
  productId: string;
  firstName: string;
  phone: string;
  buyerType: BuyerType;
  quantity: number;
  fulfillment: Fulfillment;
  zoneId: string | null;
  campaignId: string | null;
}

export type OrderFormErrors = Partial<
  Record<'productId' | 'firstName' | 'phone' | 'quantity', string>
>;

/** The API's bounds (OrderCreate). */
export const ORDER_MAX_QUANTITY = 100_000;
export const ORDER_FIRST_NAME_MAX = 40;

function quantityOf(raw: string): number | null {
  const n = parseCount(raw, 1);
  return n !== null && n <= ORDER_MAX_QUANTITY ? n : null;
}

export interface PricedProduct {
  unitPrice: number;
  wholesalePrice: number | null;
  wholesaleMinQty: number | null;
}

export interface OrderPricePreview {
  wholesale: boolean;
  unitPrice: number;
  quantity: number;
  total: number;
  /** A reseller under the minimum: the quantity the wholesale price starts at. */
  wholesaleFrom: number | null;
}

/** The price the order will be frozen at, once a product and a quantity are given. */
export function orderPricePreview(
  product: PricedProduct | null,
  buyerType: BuyerType,
  quantityRaw: string,
): OrderPricePreview | null {
  const quantity = quantityOf(quantityRaw);
  if (!product || quantity === null) return null;
  const unitPrice = orderUnitPrice(product, buyerType, quantity);
  const hasWholesale =
    buyerType === 'RESELLER' && product.wholesalePrice !== null && product.wholesaleMinQty !== null;
  const wholesale = hasWholesale && quantity >= (product.wholesaleMinQty ?? 0);
  return {
    wholesale,
    unitPrice,
    quantity,
    total: unitPrice * quantity,
    wholesaleFrom: hasWholesale && !wholesale ? product.wholesaleMinQty : null,
  };
}

/** "Prix de gros : 6 000 FCFA × 12 = 72 000 FCFA". */
export function orderPriceText(p: OrderPricePreview): string {
  const kind = p.wholesale ? 'Prix de gros' : "Prix à l'unité";
  return `${kind} : ${formatPrice(p.unitPrice, 'FCFA')} × ${p.quantity} = ${formatPrice(p.total, 'FCFA')}`;
}

/** The body of POST /orders, or what to fix first. The number itself is checked by the server. */
export function orderFormToBody(
  v: OrderFormValues,
): { ok: true; body: OrderBody } | { ok: false; errors: OrderFormErrors } {
  const errors: OrderFormErrors = {};
  const firstName = v.firstName.trim();
  const phone = v.phone.trim();
  const quantity = quantityOf(v.quantity);
  if (!v.productId) errors.productId = 'Choisis un produit.';
  if (!firstName || firstName.length > ORDER_FIRST_NAME_MAX) {
    errors.firstName = 'Écris le prénom du client.';
  }
  if (!phone) errors.phone = 'Écris le numéro WhatsApp du client.';
  if (quantity === null) errors.quantity = 'Écris une quantité entre 1 et 100 000.';
  if (quantity === null || Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    body: {
      productId: v.productId,
      firstName,
      phone,
      buyerType: v.buyerType,
      quantity,
      fulfillment: v.fulfillment,
      zoneId: v.fulfillment === 'DELIVERY' && v.zoneId ? v.zoneId : null,
      campaignId: v.campaignId || null,
    },
  };
}

/**
 * Sends the form once: busy until `send` says it failed (false or a throw).
 * After a success the page is moving to the new order, so the button stays
 * busy and a second tap on a slow network cannot make a second order.
 */
export async function submitOnce(
  send: () => Promise<boolean>,
  setBusy: (busy: boolean) => void,
): Promise<void> {
  setBusy(true);
  let done = false;
  try {
    done = await send();
  } finally {
    if (!done) setBusy(false);
  }
}
