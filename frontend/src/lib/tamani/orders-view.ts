// Orders as the shop space shows them (lot 7, spec §5.5.1): statuses and
// their words, the list's filters kept in the address, the frozen price
// rule and the WhatsApp message of a confirmed order. Pure and shared: the
// server freezes the price with the same rule the form previews.
import { formatPrice } from '@/lib/utils';
import type { BuyerType } from './labels';
import { pluralizeUnit } from './verdict-display';

export const ORDER_STATUSES = ['TO_CONFIRM', 'CONFIRMED', 'FULFILLED', 'CANCELLED'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type Fulfillment = 'DELIVERY' | 'PICKUP';

export function orderStatusLabel(status: OrderStatus, fulfillment: Fulfillment): string {
  if (status === 'TO_CONFIRM') return 'À confirmer';
  if (status === 'CONFIRMED') return 'Confirmée';
  if (status === 'CANCELLED') return 'Annulée';
  return fulfillment === 'PICKUP' ? 'Récupérée' : 'Livrée';
}

/** Moves a wholesaler may make; FULFILLED and CANCELLED are final. The server checks the same table. */
export const ORDER_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  TO_CONFIRM: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['FULFILLED', 'CANCELLED'],
  FULFILLED: [],
  CANCELLED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

/** The buttons of an order's page, in ORDER_TRANSITIONS order. */
export function orderActions(
  status: OrderStatus,
  fulfillment: Fulfillment,
): Array<{ to: OrderStatus; label: string }> {
  return ORDER_TRANSITIONS[status].map((to) => ({
    to,
    label:
      to === 'CONFIRMED'
        ? 'Confirmer'
        : to === 'CANCELLED'
          ? 'Annuler'
          : fulfillment === 'PICKUP'
            ? 'Marquer récupérée'
            : 'Marquer livrée',
  }));
}

/** "24 sacs de Riz parfumé". */
export function productQuantity(o: {
  quantity: number;
  unitLabel: string;
  productName: string;
}): string {
  return `${o.quantity} ${pluralizeUnit(o.unitLabel, o.quantity)} de ${o.productName}`;
}

/** "Retrait à la boutique", "Livraison à Médina", "Livraison, sans quartier". */
export function fulfillmentText(fulfillment: Fulfillment, zoneName: string | null): string {
  if (fulfillment === 'PICKUP') return 'Retrait à la boutique';
  return zoneName ? `Livraison à ${zoneName}` : 'Livraison, sans quartier';
}

/** The wholesale price for a reseller who reaches the minimum, else the unit price. */
export function orderUnitPrice(
  product: { unitPrice: number; wholesalePrice: number | null; wholesaleMinQty: number | null },
  buyerType: BuyerType,
  quantity: number,
): number {
  const { unitPrice, wholesalePrice, wholesaleMinQty } = product;
  if (buyerType !== 'RESELLER' || wholesalePrice === null || wholesaleMinQty === null) {
    return unitPrice;
  }
  return quantity >= wholesaleMinQty ? wholesalePrice : unitPrice;
}

export interface OrderClient {
  id: string;
  firstName: string | null;
  /** For reading: the full number on a plan with contacts, masked otherwise. */
  phone: string | null;
  /** The number WhatsApp needs; null on a plan without contacts (Free). */
  phoneE164: string | null;
}

export interface OrderRow {
  id: string;
  status: OrderStatus;
  paid: boolean;
  paidAt: string | null;
  createdAt: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  fulfillment: Fulfillment;
  zoneId: string | null;
  zoneName: string | null;
  productId: string;
  productName: string;
  unitLabel: string;
  campaignId: string | null;
  campaignTitle: string | null;
  responseId: string | null;
  buyerType: BuyerType;
  notes: string | null;
  client: OrderClient;
}

/** The confirmed deliveries of one zone (null: « Sans quartier »), with the pieces per product. */
export interface ToDeliverGroup {
  zoneId: string | null;
  zoneName: string | null;
  orders: OrderRow[];
  totals: Array<{ productId: string; productName: string; unitLabel: string; quantity: number }>;
}

export interface OrderFilters {
  status: OrderStatus | null;
  campaignId: string | null;
  productId: string | null;
  zoneId: string | null;
  view: 'list' | 'to-deliver';
}

export const NO_ORDER_FILTERS: OrderFilters = {
  status: null,
  campaignId: null,
  productId: null,
  zoneId: null,
  view: 'list',
};

const STATUS_PARAMS: Readonly<Record<OrderStatus, string>> = {
  TO_CONFIRM: 'a-confirmer',
  CONFIRMED: 'confirmees',
  FULFILLED: 'livrees',
  CANCELLED: 'annulees',
};
const ID = /^[A-Za-z0-9_-]{1,40}$/;

/** ?statut, ?campagne, ?produit, ?quartier and ?vue=a-livrer; null when one is unknown (400). */
export function parseOrderSearch(params: URLSearchParams): OrderFilters | null {
  const rawStatus = params.get('statut');
  const view = params.get('vue');
  const ids = ['campagne', 'produit', 'quartier'].map((k) => params.get(k));
  const status = ORDER_STATUSES.find((s) => STATUS_PARAMS[s] === rawStatus) ?? null;
  if (rawStatus !== null && status === null) return null;
  if (view !== null && view !== 'a-livrer') return null;
  if (ids.some((id) => id !== null && !ID.test(id))) return null;
  const [campaignId = null, productId = null, zoneId = null] = ids;
  return { status, campaignId, productId, zoneId, view: view ? 'to-deliver' : 'list' };
}

/** The filters as an address query, in a stable order. */
export function orderSearch(f: OrderFilters): string {
  const out = new URLSearchParams();
  if (f.status) out.set('statut', STATUS_PARAMS[f.status]);
  if (f.campaignId) out.set('campagne', f.campaignId);
  if (f.productId) out.set('produit', f.productId);
  if (f.zoneId) out.set('quartier', f.zoneId);
  if (f.view === 'to-deliver') out.set('vue', 'a-livrer');
  return out.toString();
}

/** The message the WhatsApp button prepares once an order is confirmed. */
export function orderWhatsappMessage(o: {
  firstName: string | null;
  shopName: string;
  productName: string;
  unitLabel: string;
  quantity: number;
  totalAmount: number;
  fulfillment: Fulfillment;
  zoneName: string | null;
}): string {
  const hello = o.firstName ? `Bonjour ${o.firstName},` : 'Bonjour,';
  const where =
    o.fulfillment === 'PICKUP'
      ? 'Retrait à la boutique.'
      : o.zoneName
        ? `Livraison à ${o.zoneName}.`
        : 'Livraison.';
  return `${hello} ta commande de ${o.quantity} ${pluralizeUnit(o.unitLabel, o.quantity)} de ${o.productName} est confirmée. Total : ${formatPrice(o.totalAmount, 'FCFA')}. ${where} À bientôt, ${o.shopName}.`;
}
