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
/**
 * Lot 7b: a shop's country (and so its currency) is fixed by its first
 * product, archived ones included: prices typed in FCFA must never read as
 * Guinean francs.
 */
export async function shopHasProducts(db: Db, organizationId: string): Promise<boolean> {
  return (await db.product.findFirst({ where: { organizationId }, select: { id: true } })) !== null;
}

/** The shop's currency (lot 7b), XOF when the shop cannot be read. */
export async function shopCurrency(db: Db, organizationId: string): Promise<string> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { currency: true },
  });
  return org?.currency ?? 'XOF';
}

/** Taken by a country change and by every product creation of the shop. */
export const shopCountryLock = (organizationId: string) => `shop-country:${organizationId}`;

export async function shopPlan(db: Db, organizationId: string, now: Date): Promise<PlanDefinition> {
  const sub = await db.subscription.findUnique({ where: { organizationId } });
  return PLANS[effectivePlan(sub, now).plan];
}
