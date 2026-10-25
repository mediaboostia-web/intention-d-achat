// The client book as the shop space reads it (porteur's feedback §3 bis):
// rows like WhatsApp's call list, the prepared WhatsApp message and the
// Free plan's lock. Pure and shared with the browser; the server builds the
// rows in lib/server/tamani/clients.ts.
import type { BuyerType } from './labels';
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

export interface ClientDetail extends ClientRow {
  firstSeenAt: string;
  interests: ClientInterest[];
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
