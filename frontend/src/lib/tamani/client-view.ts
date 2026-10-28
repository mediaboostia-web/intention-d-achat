// The client book as the shop space reads it (porteur's feedback §3 bis):
// rows like WhatsApp's call list, the prepared WhatsApp message and the
// Free plan's lock. Pure and shared with the browser; the server builds the
// rows in lib/server/tamani/clients.ts.
import type { BuyerType } from './labels';
import type { OrderRow } from './orders-view';
import { pluralizeUnit } from './verdict-display';

/** The client's latest counted answer. */
export interface ClientLast {
  campaignId: string;
  productName: string;
  unitLabel: string;
  interested: boolean;
  quantity: number | null;
  at: string;
}

export interface ClientRow {
  id: string;
  firstName: string | null;
  /** For reading: the full number on a plan with contacts, masked otherwise. */
  phone: string | null;
  /** The number WhatsApp needs; null on a plan without contacts (Free). */
  phoneE164: string | null;
  kind: BuyerType | null;
  last: ClientLast | null;
}

export interface ClientInterest extends ClientLast {
  responseId: string;
  campaignTitle: string;
  buyerType: BuyerType | null;
  option: string | null;
  timing: string | null;
  wantsDelivery: boolean | null;
  zoneName: string | null;
}

/** « a dit oui 5 fois, a acheté 4 fois · 80 % » (spec §5.5.3): finished campaigns only. */
export interface ClientReliabilityView {
  /** Yes answers on finished campaigns. */
  yesCount: number;
  /** Those followed by a fulfilled order (delivered or picked up). */
  fulfilledCount: number;
  /** fulfilledCount / yesCount; null under 2 finished yes answers. */
  rate: number | null;
}

export interface ClientDetail extends ClientRow {
  firstSeenAt: string;
  interests: ClientInterest[];
  /** The wholesaler's free note (lot 7), 1 000 characters at most. */
  notes: string | null;
  /** Newest first; numbers masked like the client's on a plan without contacts. */
  orders: OrderRow[];
  /** Σ totalAmount of the fulfilled orders, in FCFA. */
  totalSpent: number;
  /** Null on a plan without `reliability` (Free). */
  reliability: ClientReliabilityView | null;
}

export interface ClientCounts {
  all: number;
  RESELLER: number;
  CONSUMER: number;
}

/** The message the WhatsApp button prepares; the wholesaler reads it and sends it. */
export function clientWhatsappMessage(p: {
  firstName: string | null;
  shopName: string;
  productName: string | null;
}): string {
  const hello = p.firstName ? `Bonjour ${p.firstName}` : 'Bonjour';
  const about = p.productName ? ` Tu m'as répondu pour ${p.productName}.` : '';
  return `${hello}, c'est ${p.shopName}.${about}`;
}

/** Free plan: why the WhatsApp button is locked (spec §5.6). */
export function lockedContactText(firstName: string | null): string {
  return `Passe au Pro pour contacter ${firstName ?? 'ce client'}.`;
}

/** "Riz parfumé, 3 sacs" for a yes, "Riz parfumé, non" for a no. */
export function lastInterestText(last: ClientLast): string {
  if (!last.interested) return `${last.productName}, non`;
  if (last.quantity === null) return `${last.productName}, oui`;
  return `${last.productName}, ${last.quantity} ${pluralizeUnit(last.unitLabel, last.quantity)}`;
}
