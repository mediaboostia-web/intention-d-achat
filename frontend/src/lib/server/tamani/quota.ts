// Monthly quota of completed responses (spec §5.6). Over the quota a
// response is kept but locked, never refused; an upgrade unlocks the
// oldest locked responses of the month up to the new limit.
import 'server-only';
import { PLANS } from '@/lib/tamani/plans';
import type { Db } from './locks';
import { effectivePlan } from './subscription';

/** Calendar month in UTC (Africa/Dakar is UTC+0): [start, end). */
export function monthWindowUtc(now: Date): { start: Date; end: Date } {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  return { start: new Date(Date.UTC(y, m, 1)), end: new Date(Date.UTC(y, m + 1, 1)) };
}

async function monthlyUsage(db: Db, organizationId: string, now: Date) {
  const sub = await db.subscription.findUnique({ where: { organizationId } });
  // Lot 8 task 5 counts answers per pass; until then, the pass total per month.
  const limit = PLANS[effectivePlan(sub, now).plan].includedResponses ?? Number.MAX_SAFE_INTEGER;
  const { start, end } = monthWindowUtc(now);
  const completedAt = { gte: start, lt: end };
  const used = await db.response.count({
    where: { organizationId, locked: false, completedAt },
  });
  return { limit, used, completedAt };
}

/** This month's counted responses against the plan's limit (the sidebar's quota). */
export async function responsesThisMonth(
  db: Db,
  organizationId: string,
  now: Date,
): Promise<{ used: number; limit: number }> {
  const { limit, used } = await monthlyUsage(db, organizationId, now);
  return { used, limit };
}

export async function shouldLockNewCompletion(
  db: Db,
  organizationId: string,
  now: Date,
): Promise<boolean> {
  const { limit, used } = await monthlyUsage(db, organizationId, now);
  return used >= limit;
}

/** Returns how many responses were unlocked. */
export async function unlockCurrentMonth(
  tx: Db,
  organizationId: string,
  now: Date,
): Promise<number> {
  const { limit, used, completedAt } = await monthlyUsage(tx, organizationId, now);
  const room = limit - used;
  if (room <= 0) return 0;
  const oldest = await tx.response.findMany({
    where: { organizationId, locked: true, completedAt },
    orderBy: [{ completedAt: 'asc' }, { id: 'asc' }],
    take: room,
    select: { id: true },
  });
  if (oldest.length === 0) return 0;
  const { count } = await tx.response.updateMany({
    where: { id: { in: oldest.map((r) => r.id) } },
    data: { locked: false },
  });
  return count;
}
