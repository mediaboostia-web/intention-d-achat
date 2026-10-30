// Prepaid passes with a grace period (spec §5.6, §5.7). The plan in force is
// computed from the period dates at read time; nothing downgrades a row.
import 'server-only';
import { PLANS, isPlanId, passResponses, type PassId, type PlanId } from '@/lib/tamani/plans';

export const GRACE_DAYS = 3;

const DAY_MS = 86_400_000;

/** The pass a Subscription row holds. */
export interface PassState {
  plan: PlanId;
  periodStart: Date | null;
  currentPeriodEnd: Date | null;
  graceUntil: Date | null;
  responsesIncluded: number;
}

type SubscriptionDates = {
  plan: string;
  currentPeriodEnd: Date | null;
  graceUntil: Date | null;
};

const addDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY_MS);

/**
 * A pass without an end date, or an unknown plan, reads FREE (fail closed).
 * `endsAt` is the date the shop must act by: the pass's end, then the end of
 * its grace. The trial has no grace.
 */
export function effectivePlan(
  sub: SubscriptionDates | null,
  now: Date,
): { plan: PlanId; inGrace: boolean; endsAt: Date | null } {
  const free = { plan: 'FREE' as const, inGrace: false, endsAt: null };
  if (!sub || !isPlanId(sub.plan) || sub.plan === 'FREE' || !sub.currentPeriodEnd) return free;
  if (sub.currentPeriodEnd > now) {
    return { plan: sub.plan, inGrace: false, endsAt: sub.currentPeriodEnd };
  }
  if (sub.plan !== 'TRIAL' && sub.graceUntil && sub.graceUntil > now) {
    return { plan: sub.plan, inGrace: true, endsAt: sub.graceUntil };
  }
  return free;
}

/** The free trial a new shop starts on: 50 answers over 3 days (porteur, 2026-10-29). */
export function trialPass(now: Date): PassState {
  const { durationDays, includedResponses } = PLANS.TRIAL;
  return {
    plan: 'TRIAL',
    periodStart: now,
    currentPeriodEnd: addDays(now, durationDays ?? 0),
    graceUntil: null,
    responsesIncluded: includedResponses ?? 0,
  };
}

/**
 * A pass starts now. While the pass in force still runs (trial included), the
 * new one keeps its unused answers and never ends before it. Once its time is
 * up, grace included, the unused answers are gone and the new pass starts
 * from zero (porteur, 2026-10-30); the pending answers then open.
 */
export function applyPurchase(
  current: PassState | null,
  pass: PassId,
  used: number,
  now: Date,
): PassState {
  const running =
    current !== null &&
    effectivePlan(current, now).plan !== 'FREE' &&
    current.currentPeriodEnd !== null &&
    current.currentPeriodEnd > now;
  const carried = running ? Math.max(0, current.responsesIncluded - used) : 0;
  const ownEnd = addDays(now, PLANS[pass].durationDays ?? 0);
  const runningEnd = running ? current.currentPeriodEnd : null;
  const currentPeriodEnd = runningEnd && runningEnd > ownEnd ? runningEnd : ownEnd;
  return {
    plan: pass,
    periodStart: now,
    currentPeriodEnd,
    graceUntil: addDays(currentPeriodEnd, GRACE_DAYS),
    responsesIncluded: passResponses(pass) + carried,
  };
}
