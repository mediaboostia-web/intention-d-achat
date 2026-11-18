// Wholesale offers (porteur, 2026-11-18): a product carries as many offers as
// the wholesaler wants, of two kinds — a price per piece from N pieces
// (FROM) or a fixed price for a pack of N (PACK). A reseller picks offers one
// or more times and mixes them with the unit price. The picks are stored as a
// frozen copy, so editing the product never changes an answer or an order.
// Shared by the product form, the popup, the order form, the server and the
// stats, like option-split.ts.
import { formatMoney } from './currency';

export type OfferKind = 'FROM' | 'PACK';

export interface Offer {
  kind: OfferKind;
  /** FROM: the minimum pieces; PACK: the pieces in the pack. */
  qty: number;
  /** FROM: per piece; PACK: for the whole pack. */
  price: number;
  /** PACK only, optional: « Demi-lot ». */
  name: string | null;
}

export const OFFERS_MAX = 10;
export const OFFER_QTY_MAX = 100_000;
export const OFFER_PRICE_MAX = 100_000_000;
export const OFFER_NAME_MAX = 30;

/** What the popup and the order form send: an offer's index, or the unit price. */
export interface PickInput {
  offer: number | 'UNIT';
  /** PACK: how many packs; FROM and UNIT: how many pieces. */
  count: number;
}

/** What is stored: the pick with a copy of its offer at the time. */
export interface OfferPick {
  offer: number | 'UNIT';
  kind: OfferKind | 'UNIT';
  qty: number;
  price: number;
  name: string | null;
  count: number;
}

const isInt = (v: unknown, min: number, max: number): v is number =>
  Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

function asOffer(v: unknown): Offer | null {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  if (o.kind !== 'FROM' && o.kind !== 'PACK') return null;
  if (!isInt(o.qty, 2, OFFER_QTY_MAX) || !isInt(o.price, 1, OFFER_PRICE_MAX)) return null;
  const name =
    o.kind === 'PACK' && typeof o.name === 'string' && o.name.trim() !== ''
      ? o.name.trim().slice(0, OFFER_NAME_MAX)
      : null;
  return { kind: o.kind, qty: o.qty, price: o.price, name };
}

/** The offers stored on a product; a malformed entry is dropped. */
export function readOffers(json: unknown): Offer[] {
  if (!Array.isArray(json)) return [];
  return json.map(asOffer).filter((o): o is Offer => o !== null);
}

/** The products saved before 2026-11-18: one wholesale price from N pieces. */
export function legacyOffers(
  wholesalePrice: number | null,
  wholesaleMinQty: number | null,
): Offer[] {
  if (wholesalePrice === null || wholesaleMinQty === null) return [];
  return [{ kind: 'FROM', qty: wholesaleMinQty, price: wholesalePrice, name: null }];
}

/** The stored picks of an answer or an order; null when there are none (or they are malformed). */
export function readPicks(json: unknown): OfferPick[] | null {
  if (!Array.isArray(json) || json.length === 0) return null;
  const ok = json.every((v) => {
    if (typeof v !== 'object' || v === null) return false;
    const p = v as Record<string, unknown>;
    return (
      (p.offer === 'UNIT' || isInt(p.offer, 0, OFFERS_MAX)) &&
      (p.kind === 'UNIT' || p.kind === 'FROM' || p.kind === 'PACK') &&
      isInt(p.qty, 1, OFFER_QTY_MAX) &&
      isInt(p.price, 0, OFFER_PRICE_MAX) &&
      isInt(p.count, 1, OFFER_QTY_MAX) &&
      (p.name === null || typeof p.name === 'string')
    );
  });
  return ok ? (json as OfferPick[]) : null;
}

/** The first broken rule, under the offer that breaks it. */
export function offerViolation(
  offers: readonly Offer[],
  unitPrice: number,
): { index: number; message: string } | null {
  const seen = new Set<string>();
  for (const [index, o] of offers.entries()) {
    if (index >= OFFERS_MAX) return { index, message: '10 offres au plus.' };
    if (o.kind === 'FROM' && o.price >= unitPrice) {
      return { index, message: "Le prix de gros doit être plus bas que le prix à l'unité." };
    }
    const key = `${o.kind}:${o.qty}`;
    if (seen.has(key)) return { index, message: `Tu as déjà une offre pour ${o.qty}.` };
    seen.add(key);
  }
  return null;
}

/** Checks what was sent against the product's offers and freezes a copy of each. */
export function freezePicks(
  offers: readonly Offer[],
  unitPrice: number,
  picks: readonly PickInput[],
): { ok: true; picks: OfferPick[] } | { ok: false; message: string } {
  if (picks.length === 0) return { ok: false, message: 'Choisis au moins une offre.' };
  const seen = new Set<number | 'UNIT'>();
  const out: OfferPick[] = [];
  for (const p of picks) {
    if (!isInt(p.count, 1, OFFER_QTY_MAX)) return { ok: false, message: 'Quantité invalide.' };
    if (seen.has(p.offer)) return { ok: false, message: 'Une offre est choisie deux fois.' };
    seen.add(p.offer);
    if (p.offer === 'UNIT') {
      out.push({
        offer: 'UNIT',
        kind: 'UNIT',
        qty: 1,
        price: unitPrice,
        name: null,
        count: p.count,
      });
      continue;
    }
    const o = offers[p.offer];
    if (!o) return { ok: false, message: "Cette offre n'existe plus." };
    if (o.kind === 'FROM' && p.count < o.qty) {
      return { ok: false, message: `À partir de ${o.qty} pour cette offre.` };
    }
    out.push({
      offer: p.offer,
      kind: o.kind,
      qty: o.qty,
      price: o.price,
      name: o.name,
      count: p.count,
    });
  }
  return { ok: true, picks: out };
}

export const pickPieces = (p: OfferPick): number => (p.kind === 'PACK' ? p.count * p.qty : p.count);

export const pickAmount = (p: OfferPick): number => p.count * p.price;

export function picksTotal(picks: readonly OfferPick[]): { pieces: number; amount: number } {
  return picks.reduce(
    (t, p) => ({ pieces: t.pieces + pickPieces(p), amount: t.amount + pickAmount(p) }),
    { pieces: 0, amount: 0 },
  );
}

/** « Lot de 12 · 26 000 FCFA », « Demi-lot (45) · 175 000 FCFA », « 10 000 FCFA l'unité dès 12 ». */
export function offerLabel(o: Offer, currency: string): string {
  if (o.kind === 'FROM') return `${formatMoney(o.price, currency)} l'unité dès ${o.qty}`;
  const name = o.name ? `${o.name} (${o.qty})` : `Lot de ${o.qty}`;
  return `${name} · ${formatMoney(o.price, currency)}`;
}

const SHOWN_IN_LINE = 2;

/** The WhatsApp price: the unit price, two offers at most, then « + N offres ». */
export function priceLine(unitPrice: number, offers: readonly Offer[], currency: string): string {
  const parts = [
    formatMoney(unitPrice, currency),
    ...offers.slice(0, SHOWN_IN_LINE).map((o) => offerLabel(o, currency)),
  ];
  const more = offers.length - SHOWN_IN_LINE;
  if (more > 0) parts.push(`+ ${more} ${more > 1 ? 'offres' : 'offre'}`);
  return parts.join(' · ');
}

/** « 2 × Lot de 12, 15 à 10 000 FCFA, 3 à l'unité ». */
export function picksText(picks: readonly OfferPick[], currency: string): string {
  return picks
    .map((p) => {
      if (p.kind === 'UNIT') return `${p.count} à l'unité`;
      if (p.kind === 'FROM') return `${p.count} à ${formatMoney(p.price, currency)}`;
      return `${p.count} × ${p.name ?? `Lot de ${p.qty}`}`;
    })
    .join(', ');
}

/** The cheapest piece a reseller can get: what the profit estimate counts on. */
export function lowestPiecePrice(unitPrice: number, offers: readonly Offer[]): number {
  return offers.reduce(
    (low, o) => Math.min(low, Math.round(o.kind === 'PACK' ? o.price / o.qty : o.price)),
    unitPrice,
  );
}
