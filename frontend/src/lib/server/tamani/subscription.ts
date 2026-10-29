// Prepaid plans with a grace period (spec §5.6, §5.7). The plan in force is
// computed from the period dates at read time; nothing downgrades a row.
import 'server-only';
import { isPlanId, type PlanId } from '@/lib/tamani/plans';

export const GRACE_DAYS = 5;

const DAY_MS = 86_400_000;

type SubscriptionDates = {
  plan: string;
  currentPeriodEnd: Date | null;
  graceUntil: Date | null;
};

/** A paid plan without an end date, or an unknown plan, reads FREE (fail closed). */
export function effectivePlan(
  sub: SubscriptionDates | null,
  now: Date,
): { plan: PlanId; inGrace: boolean } {
  const free = { plan: 'FREE' as const, inGrace: false };
  if (!sub || !isPlanId(sub.plan) || sub.plan === 'FREE' || !sub.currentPeriodEnd) return free;
  if (sub.currentPeriodEnd > now) return { plan: sub.plan, inGrace: false };
  if (sub.graceUntil && sub.graceUntil > now) return { plan: sub.plan, inGrace: true };
  return free;
}

/** Same day of month, months later, clamped to the month's last day (UTC). */
function addMonthsUtc(date: Date, months: number): Date {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const out = new Date(date);
  out.setUTCFullYear(y, m, Math.min(date.getUTCDate(), lastDay));
  return out;
}

/**
 * A paid period: it follows the current one when the same plan is still
 * active (not in grace), otherwise it starts now.
 */
export function extendSubscription(
  current: SubscriptionDates | null,
  plan: 'MONTH' | 'MONTH_MAX',
  months: 1 | 12,
  now: Date,
): { plan: 'MONTH' | 'MONTH_MAX'; currentPeriodEnd: Date; graceUntil: Date } {
  const stillActive =
    current?.plan === plan && current.currentPeriodEnd !== null && current.currentPeriodEnd > now;
  const start = stillActive && current.currentPeriodEnd ? current.currentPeriodEnd : now;
  const currentPeriodEnd = addMonthsUtc(start, months);
  return {
    plan,
    currentPeriodEnd,
    graceUntil: new Date(currentPeriodEnd.getTime() + GRACE_DAYS * DAY_MS),
  };
}
