// Answers counted per pass (spec §5.6). Over the pass a completed answer is
// kept but pending (`locked`), never refused; a pass opens the oldest
// pending answers up to its room. An answer counts once `countedAt` is set.
import 'server-only';
import type { Subscription } from '@prisma/client';
import type { PlanId } from '@/lib/tamani/plans';
import { advisoryXactLock, quotaLock, type Db } from './locks';
import { effectivePlan } from './subscription';

/** Without a paid pass, the popup closes past this many answers in the month (spec §5.6). */
export const RECORDED_CEILING = 1000;

type PassRow = Pick<
  Subscription,
  'plan' | 'periodStart' | 'currentPeriodEnd' | 'graceUntil' | 'responsesIncluded'
>;

/** Calendar month in UTC (Africa/Dakar is UTC+0): [start, end). */
export function monthWindowUtc(now: Date): { start: Date; end: Date } {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  return { start: new Date(Date.UTC(y, m, 1)), end: new Date(Date.UTC(y, m + 1, 1)) };
}

const pendingWhere = (organizationId: string) => ({
  organizationId,
  locked: true,
  completedAt: { not: null },
});

/** The pass in force and the answers it counted, from its start to the end of its grace. */
async function passCount(db: Db, organizationId: string, now: Date) {
  const sub: PassRow | null = await db.subscription.findUnique({ where: { organizationId } });
  const { plan, inGrace, endsAt } = effectivePlan(sub, now);
  if (plan === 'FREE' || !sub?.currentPeriodEnd) {
    return { plan, inGrace, endsAt, used: 0, included: 0 };
  }
  const lt = sub.graceUntil ?? sub.currentPeriodEnd;
  const countedAt = sub.periodStart ? { gte: sub.periodStart, lt } : { lt };
  const used = await db.response.count({ where: { organizationId, countedAt } });
  return { plan, inGrace, endsAt, used, included: sub.responsesIncluded };
}

/** The shop's pass meter: answers counted, answers included, answers waiting for a pass. */
export async function passUsage(
  db: Db,
  organizationId: string,
  now: Date,
): Promise<{
  plan: PlanId;
  used: number;
  included: number;
  endsAt: Date | null;
  inGrace: boolean;
  pending: number;
}> {
  const { plan, used, included, endsAt, inGrace } = await passCount(db, organizationId, now);
  const pending = await db.response.count({ where: pendingWhere(organizationId) });
  return { plan, used, included, endsAt, inGrace, pending };
}

/** Two completions racing for the last answer of a pass queue on the shop's quota lock. */
export async function shouldLockNewCompletion(
  tx: Db,
  organizationId: string,
  now: Date,
): Promise<boolean> {
  await advisoryXactLock(tx, quotaLock(organizationId));
  const { plan, used, included } = await passCount(tx, organizationId, now);
  return plan === 'FREE' || used >= included;
}

/** Opens the oldest pending answers up to the pass's room; returns how many. */
export async function unlockPending(tx: Db, organizationId: string, now: Date): Promise<number> {
  await advisoryXactLock(tx, quotaLock(organizationId));
  const { plan, used, included } = await passCount(tx, organizationId, now);
  const room = included - used;
  if (plan === 'FREE' || room <= 0) return 0;
  const oldest = await tx.response.findMany({
    where: pendingWhere(organizationId),
    orderBy: [{ completedAt: 'asc' }, { id: 'asc' }],
    take: room,
    select: { id: true },
  });
  if (oldest.length === 0) return 0;
  const { count } = await tx.response.updateMany({
    where: { id: { in: oldest.map((r) => r.id) }, locked: true },
    data: { locked: false, countedAt: now },
  });
  return count;
}

/**
 * Without a paid pass (no pass or the trial), the popup stops asking once
 * the shop recorded RECORDED_CEILING answers this month, pending included:
 * a big group without a pass must not cost us (margin rule). Pass the
 * subscription when it is already read.
 */
export async function answersClosed(
  db: Db,
  organizationId: string,
  now: Date,
  sub?: Pick<Subscription, 'plan' | 'currentPeriodEnd' | 'graceUntil'> | null,
): Promise<boolean> {
  const row =
    sub === undefined ? await db.subscription.findUnique({ where: { organizationId } }) : sub;
  const { plan } = effectivePlan(row, now);
  if (plan !== 'FREE' && plan !== 'TRIAL') return false;
  const { start, end } = monthWindowUtc(now);
  const recorded = await db.response.count({
    where: { organizationId, completedAt: { gte: start, lt: end } },
  });
  return recorded >= RECORDED_CEILING;
}
