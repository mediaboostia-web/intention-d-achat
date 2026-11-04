// Granting and ending a pass by hand (lot 11, « Attribuer un abonnement »).
// A grant goes the way a SasPay purchase does: the same locks, a pass order
// (provider `manual`, so revenue, churn and MRR see it), the same carry-over
// of unused answers, and the pending answers opened.
import 'server-only';
import type { PrismaClient } from '@prisma/client';
import { createNotification } from '@/lib/server/notifications';
import { passActivated } from '@/lib/server/notifications/templates';
import { log } from '@/lib/server/observability/log';
import { PLANS, passResponses, type PassId } from '@/lib/tamani/plans';
import { billingLock, passStateOf } from '../billing';
import { advisoryXactLock, quotaLock, type Db } from '../locks';
import { passCount, unlockPending } from '../quota';
import { applyGrant, type GrantTerms } from '../subscription';

export type GrantPlan = PassId | 'UNLIMITED';

/** A standard pass as sold; an Unlimited pass needs its days and answers typed. */
export function grantTerms(input: {
  plan: GrantPlan;
  days?: number | undefined;
  responses?: number | undefined;
}): GrantTerms | null {
  if (input.plan === 'UNLIMITED') {
    if (!input.days || !input.responses) return null;
    return { plan: 'UNLIMITED', days: input.days, responses: input.responses };
  }
  return {
    plan: input.plan,
    days: PLANS[input.plan].durationDays ?? 0,
    responses: passResponses(input.plan),
  };
}

/** `null` when the shop does not exist; nothing is written then. */
export async function grantPass(
  tx: Db,
  input: { organizationId: string; terms: GrantTerms; amount: number },
  now: Date,
): Promise<{ orderId: string; endsAt: Date } | null> {
  const { organizationId, terms, amount } = input;
  const shop = await tx.organization.findUnique({
    where: { id: organizationId },
    select: { id: true },
  });
  if (!shop) return null;
  await advisoryXactLock(tx, billingLock(organizationId));
  await advisoryXactLock(tx, quotaLock(organizationId));
  const order = await tx.order.create({
    data: {
      provider: 'manual',
      organizationId,
      offer: terms.plan,
      // Tamani's own money is counted in FCFA, whatever the shop's country.
      amount,
      currency: 'XOF',
      status: 'PAID',
      paidAt: now,
      activatedAt: now,
      // Paid already: the expiry of a pending checkout never applies.
      expiresAt: now,
      metadata: { days: terms.days, responses: terms.responses },
    },
    select: { id: true },
  });
  const sub = await tx.subscription.findUnique({ where: { organizationId } });
  const { used } = await passCount(tx, organizationId, now, sub);
  const pass = applyGrant(passStateOf(sub), terms, used, now);
  await tx.subscription.upsert({
    where: { organizationId },
    create: { organizationId, ...pass },
    update: pass,
  });
  await unlockPending(tx, organizationId, now);
  return { orderId: order.id, endsAt: pass.currentPeriodEnd ?? now };
}

const NO_PASS = {
  plan: 'FREE',
  periodStart: null,
  currentPeriodEnd: null,
  graceUntil: null,
  responsesIncluded: 0,
} as const;

/** Back to « Sans pass » at once; `from` is the plan it had. `null` for an unknown shop. */
export async function endPass(tx: Db, organizationId: string): Promise<{ from: string } | null> {
  const shop = await tx.organization.findUnique({
    where: { id: organizationId },
    select: { id: true },
  });
  if (!shop) return null;
  await advisoryXactLock(tx, billingLock(organizationId));
  const sub = await tx.subscription.findUnique({ where: { organizationId } });
  await tx.subscription.upsert({
    where: { organizationId },
    create: { organizationId, ...NO_PASS },
    update: NO_PASS,
  });
  return { from: sub?.plan ?? 'FREE' };
}

/** The shop's owners and admins hear their pass opened, as after a payment. */
export async function notifyGrant(
  db: Pick<PrismaClient, 'organizationMember' | 'notification'>,
  grant: { organizationId: string; orderId: string; plan: GrantPlan; endsAt: Date },
  now: Date,
): Promise<void> {
  try {
    const people = await db.organizationMember.findMany({
      where: { organizationId: grant.organizationId, role: { in: ['OWNER', 'ADMIN'] } },
      select: { userId: true },
    });
    for (const { userId } of people) {
      await createNotification(
        db as PrismaClient,
        passActivated(userId, grant.orderId, PLANS[grant.plan].label, grant.endsAt, now),
      );
    }
  } catch {
    log.warn('pass grant notification failed', { orderId: grant.orderId });
  }
}
