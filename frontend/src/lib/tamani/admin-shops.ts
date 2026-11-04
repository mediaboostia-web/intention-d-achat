// Support-admin shops (lot 11): what the list and the card show, and the
// list's filters as the address writes them (?q=&forfait=&page=).
import { ADMIN_HOME } from './admin-nav';
import { isPlanId } from './plans';
import { parseAmount } from './fcfa-input';

export interface AdminShopRow {
  id: string;
  name: string;
  country: string;
  ownerEmail: string | null;
  businessType: string | null;
  salesChannel: string | null;
  /** The plan in force now (`FREE` once a trial or a grace is over). */
  plan: string;
  inGrace: boolean;
  endsAt: string | null;
  createdAt: string;
}

export interface AdminShopList {
  items: AdminShopRow[];
  /** Shops matching the search and the filter. */
  total: number;
  page: number;
  pages: number;
}

export interface AdminShop {
  id: string;
  name: string;
  slug: string;
  country: string;
  businessType: string | null;
  salesChannel: string | null;
  createdAt: string;
  members: { email: string; name: string | null; role: string }[];
  pass: {
    plan: string;
    inGrace: boolean;
    endsAt: string | null;
    used: number;
    included: number;
    pending: number;
  };
  campaigns: { running: number; drafts: number; finished: number; archived: number };
  purchases: {
    id: string;
    offer: string;
    amount: number;
    currency: string;
    status: string;
    provider: string;
    at: string;
  }[];
}

export interface ShopQuery {
  q: string;
  plan: string | null;
  page: number;
}

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '');

/** A wrong plan or page reads as none: the whole list, page 1. */
export function parseShopQuery(search: Search): ShopQuery {
  const plan = one(search.forfait);
  const page = Number.parseInt(one(search.page), 10);
  return {
    q: one(search.q).trim().slice(0, 100),
    plan: isPlanId(plan) ? plan : null,
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

export function shopsHref(query: Partial<ShopQuery>): string {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.plan) params.set('forfait', query.plan);
  if (query.page && query.page > 1) params.set('page', String(query.page));
  const search = params.toString();
  return `${ADMIN_HOME}/boutiques${search ? `?${search}` : ''}`;
}

const ZERO = /^\s*0+\s*(f\s*cfa|cfa|f)?\s*$/i;

/**
 * The amount received for a pass granted by hand: 0 is a gift, anything
 * else reads like a price (spaces, « FCFA »). parseAmount alone refuses 0,
 * since a product price never is.
 */
export function parseGrantAmount(raw: string): number | null {
  return ZERO.test(raw) ? 0 : parseAmount(raw);
}
