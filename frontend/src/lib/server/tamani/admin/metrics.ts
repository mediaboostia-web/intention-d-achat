// Support-admin figures (lot 11), pure. Definitions agreed with the porteur
// on 2026-11-04 and written in the lot 11 plan: revenue, churn, CAC and MRR
// are read from the activated pass orders and the subscriptions in force.
import { PLANS, isPassId } from '@/lib/tamani/plans';
import { GRACE_DAYS, effectivePlan } from '../subscription';

const DAY_MS = 86_400_000;
/** A month as the address and the forms write it: « 2026-11 ». */
export const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

const pad = (n: number) => String(n).padStart(2, '0');

/** The calendar month of `now`, in UTC: « 2026-11 ». */
export function currentMonth(now: Date): string {
  return `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}`;
}

/** `?mois=` as written, or the current month when it is missing or wrong. */
export function parseMonth(value: string | null | undefined, now: Date): string {
  return value && MONTH.test(value) ? value : currentMonth(now);
}

export function monthRange(month: string): { start: Date; end: Date } {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 1)) };
}

export function shiftMonth(month: string, delta: number): string {
  const { start } = monthRange(month);
  return currentMonth(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + delta, 1)));
}

/** How many months the revenue chart shows, the current one last. */
export const SERIES_MONTHS = 6;

/** What came in each month, for the `count` months ending with `month`, oldest first. */
export function revenueSeries(
  orders: readonly { activatedAt: Date; amount: number }[],
  month: string,
  count = SERIES_MONTHS,
): { month: string; total: number }[] {
  return Array.from({ length: count }, (_, i) => shiftMonth(month, i - count + 1)).map((m) => {
    const { start, end } = monthRange(m);
    const total = orders.reduce(
      (sum, o) => (o.activatedAt >= start && o.activatedAt < end ? sum + o.amount : sum),
      0,
    );
    return { month: m, total };
  });
}

/** An activated pass order: a SasPay payment or a pass granted by hand. */
export interface PassOrder {
  organizationId: string;
  offer: string;
  amount: number;
  provider: string;
  activatedAt: Date;
  days: number;
}

/** A stretch of time a shop had a pass, grace included. */
export interface Coverage {
  start: Date;
  end: Date;
}

const addDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY_MS);

/**
 * Replays each shop's orders in order. One bought before the grace of the
 * last ran out continues the coverage (and ends no sooner than the pass it
 * found running); one bought later opens a new coverage.
 */
export function coverages(orders: readonly PassOrder[]): Map<string, Coverage[]> {
  const sorted = [...orders].sort((a, b) => a.activatedAt.getTime() - b.activatedAt.getTime());
  const byShop = new Map<string, Coverage[]>();
  const passEnd = new Map<string, Date>();
  for (const o of sorted) {
    const list = byShop.get(o.organizationId) ?? [];
    const last = list.at(-1);
    const ownEnd = addDays(o.activatedAt, o.days);
    if (last && o.activatedAt < last.end) {
      const running = passEnd.get(o.organizationId);
      const end = running && running > o.activatedAt && running > ownEnd ? running : ownEnd;
      passEnd.set(o.organizationId, end);
      last.end = addDays(end, GRACE_DAYS);
    } else {
      passEnd.set(o.organizationId, ownEnd);
      list.push({ start: o.activatedAt, end: addDays(ownEnd, GRACE_DAYS) });
    }
    byShop.set(o.organizationId, list);
  }
  return byShop;
}

export interface Churn {
  atStart: number;
  churned: number;
  /** `null` when no shop had a pass at the start of the month. */
  rate: number | null;
}

/**
 * Shops covered at the first instant of the month whose coverage ends within
 * it with no purchase after, over the shops covered at that instant.
 */
export function churnOf(
  covered: Map<string, Coverage[]>,
  orders: readonly PassOrder[],
  range: { start: Date; end: Date },
): Churn {
  let atStart = 0;
  let churned = 0;
  for (const [org, list] of covered) {
    const at = list.find((c) => c.start <= range.start && range.start < c.end);
    if (!at) continue;
    atStart += 1;
    if (at.end >= range.end) continue;
    const back = orders.some(
      (o) => o.organizationId === org && o.activatedAt >= at.end && o.activatedAt < range.end,
    );
    if (!back) churned += 1;
  }
  return { atStart, churned, rate: atStart === 0 ? null : churned / atStart };
}

/** Shops whose first paid pass (not a gift) falls in the month. */
export function newPayers(orders: readonly PassOrder[], range: { start: Date; end: Date }): number {
  const first = new Map<string, Date>();
  for (const o of orders) {
    if (o.amount <= 0) continue;
    const seen = first.get(o.organizationId);
    if (!seen || o.activatedAt < seen) first.set(o.organizationId, o.activatedAt);
  }
  let count = 0;
  for (const at of first.values()) if (at >= range.start && at < range.end) count += 1;
  return count;
}

/** Marketing spend over the new paying shops, in whole FCFA; `null` when either is missing. */
export function cacOf(spend: number | null, payers: number): number | null {
  if (spend === null || payers === 0) return null;
  return Math.round(spend / payers);
}

export interface SubscriptionRow {
  organizationId: string;
  plan: string;
  currentPeriodEnd: Date | null;
  graceUntil: Date | null;
}

/**
 * Monthly recurring revenue at `now`: each running paid pass brought to 30
 * days (price × 30 ÷ days). The trial, the grace and the shops without a pass
 * count 0; the Unlimited pass reads its last grant.
 */
export function mrrOf(
  subs: readonly SubscriptionRow[],
  unlimited: ReadonlyMap<string, { amount: number; days: number }>,
  now: Date,
): number {
  let total = 0;
  for (const sub of subs) {
    const { plan, inGrace } = effectivePlan(sub, now);
    if (inGrace) continue;
    if (isPassId(plan)) {
      const { priceXof, durationDays } = PLANS[plan];
      if (priceXof && durationDays) total += Math.round((priceXof * 30) / durationDays);
    } else if (plan === 'UNLIMITED') {
      const grant = unlimited.get(sub.organizationId);
      if (grant && grant.days > 0) total += Math.round((grant.amount * 30) / grant.days);
    }
  }
  return total;
}
