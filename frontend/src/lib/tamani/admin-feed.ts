// The support-admin notifications (lot 13a, spec §6): a feed of what
// happened, computed from the accounts, the shops and the pass orders.
// Nothing is plugged into sign-up or payment. Shared with the browser.
import { ADMIN_HOME } from './admin-nav';

export type FeedType = 'SIGNUP' | 'SHOP' | 'PAYMENT' | 'PAYMENT_FAILED';

export interface FeedItem {
  /** `${type}:${source id}`, unique across the four sources. */
  id: string;
  type: FeedType;
  at: Date;
  title: string;
  /** First name, shop, pass, amount, method. Never an e-mail or a phone. */
  detail: string;
  href: string;
}

export const FEED_DAYS = 30;
export const FEED_PAGE_SIZE = 50;
export const FEED_UNREAD_CAP = 99;
export const FEED_HOME = `${ADMIN_HOME}/notifications`;

const ALL: readonly FeedType[] = ['SIGNUP', 'SHOP', 'PAYMENT', 'PAYMENT_FAILED'];

export const FEED_FILTERS = [
  { key: 'tout', label: 'Tout', types: ALL },
  { key: 'inscriptions', label: 'Inscriptions', types: ['SIGNUP', 'SHOP'] },
  { key: 'paiements', label: 'Paiements', types: ['PAYMENT', 'PAYMENT_FAILED'] },
] as const satisfies readonly { key: string; label: string; types: readonly FeedType[] }[];

export type FeedFilter = (typeof FEED_FILTERS)[number]['key'];

const TITLES: Record<FeedType, string> = {
  SIGNUP: 'Nouvelle inscription',
  SHOP: 'Nouvelle boutique',
  PAYMENT: 'Paiement reçu',
  PAYMENT_FAILED: 'Paiement non abouti',
};

export function feedTitle(type: FeedType): string {
  return TITLES[type];
}

export function feedTypes(filter: FeedFilter): readonly FeedType[] {
  return FEED_FILTERS.find((f) => f.key === filter)?.types ?? ALL;
}

const isFilter = (v: string): v is FeedFilter => FEED_FILTERS.some((f) => f.key === v);
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export interface FeedQuery {
  type: FeedFilter;
  before: Date | null;
}

/** The filter and the page from the address; anything unknown falls back. */
export function parseFeedQuery(sp: Record<string, string | string[] | undefined>): FeedQuery {
  const type = first(sp.type) ?? '';
  const raw = first(sp.before);
  const before = raw ? new Date(raw) : null;
  return {
    type: isFilter(type) ? type : 'tout',
    before: before && !Number.isNaN(before.getTime()) ? before : null,
  };
}

export function feedHref(q: FeedQuery): string {
  const params = new URLSearchParams();
  if (q.type !== 'tout') params.set('type', q.type);
  if (q.before) params.set('before', q.before.toISOString());
  const s = params.toString();
  return s ? `${FEED_HOME}?${s}` : FEED_HOME;
}

const METHODS: Record<string, string> = {
  WAVE: 'Wave',
  ORANGE_MONEY: 'Orange Money',
  FREE_MONEY: 'Free Money',
  MTN_MONEY: 'MTN Mobile Money',
  MOOV_MONEY: 'Moov Money',
  CARD: 'Carte',
};

/** « ORANGE_MONEY » → « Orange Money »; an unknown method keeps a readable form. */
export function paymentMethodLabel(method: string | null): string | null {
  if (!method) return null;
  return (
    METHODS[method] ??
    method
      .toLowerCase()
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  );
}

/** The badge's spoken name. */
export function unreadLabel(n: number): string {
  if (n >= FEED_UNREAD_CAP) return `${FEED_UNREAD_CAP} nouvelles notifications ou plus`;
  return n === 1 ? '1 nouvelle notification' : `${n} nouvelles notifications`;
}
