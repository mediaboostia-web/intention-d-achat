// One shop per account in v1 (spec §5.2): the shop of a user is their
// oldest membership.
import 'server-only';
import type { OrgRole } from '@/lib/server/middleware/require-org-role';
import { PLANS, type PlanDefinition } from '@/lib/tamani/plans';
import type { Db } from './locks';
import { effectivePlan } from './subscription';

export async function getShopForUser(
  db: Db,
  userId: string,
): Promise<{ organizationId: string; role: OrgRole } | null> {
  const member = await db.organizationMember.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { organizationId: true, role: true },
  });
  return member ? { organizationId: member.organizationId, role: member.role as OrgRole } : null;
}

/** The plan in force for a shop: its limits and features (FREE without a subscription). */
export async function shopPlan(db: Db, organizationId: string, now: Date): Promise<PlanDefinition> {
  const sub = await db.subscription.findUnique({ where: { organizationId } });
  return PLANS[effectivePlan(sub, now).plan];
}
