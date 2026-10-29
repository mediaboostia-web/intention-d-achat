// Pass purchases through SasPay's hosted checkout (spec §5.7, §6.7). A
// purchase is a kit Order (provider 'saspay') tied to a checkout session.
// Nothing trusts a redirect or a webhook: reconcileOrder reads the session,
// then GET /payments/{id}/verify/, and activates the pass once, only on
// SUCCESS with the same currency and amount. The return page, the webhook
// and the billing-verify cron all run it; Order.activatedAt makes it safe.
import 'server-only';
import type { PrismaClient, Subscription } from '@prisma/client';
import { createNotification } from '@/lib/server/notifications';
import { passActivated } from '@/lib/server/notifications/templates';
import { log } from '@/lib/server/observability/log';
import { CircuitOpenError } from '@/lib/server/payments/circuit-breaker';
import { SaspayError, type SaspayClient } from '@/lib/server/payments/saspay';
import {
  PLANS,
  isPaymentCountry,
  isPassId,
  isPlanId,
  passPrice,
  type PassId,
} from '@/lib/tamani/plans';
import type { TamaniErrorCode } from './errors';
import { advisoryXactLock, quotaLock, type Db } from './locks';
import { passCount, unlockPending } from './quota';
import { applyPurchase, type PassState } from './subscription';

/** SasPay's default session life, also sent as expires_at (recon, 2026-10-29). */
export const SESSION_TTL_MS = 3_600_000;
/** How long an unfinished purchase is still reconciled. */
const RECONCILE_WINDOW_MS = 48 * 3_600_000;
/** Activation is a dozen queries; Neon can take seconds each on a bad day. */
const ACTIVATION_TX = { maxWait: 10_000, timeout: 30_000 };

export function billingLock(organizationId: string): string {
  return `billing:${organizationId}`;
}

export class BillingError extends Error {
  constructor(
    readonly code: TamaniErrorCode,
    readonly status: number,
  ) {
    super(code);
    this.name = 'BillingError';
  }
}

export type ReconcileOutcome = 'ACTIVATED' | 'ALREADY_DONE' | 'PENDING' | 'FAILED';

function passStateOf(sub: Subscription | null): PassState | null {
  if (!sub || !isPlanId(sub.plan)) return null;
  return {
    plan: sub.plan,
    periodStart: sub.periodStart,
    currentPeriodEnd: sub.currentPeriodEnd,
    graceUntil: sub.graceUntil,
    responsesIncluded: sub.responsesIncluded,
  };
}

/** "9900.00" is 9900 FCFA; anything that is not a plain decimal never matches. */
function sameAmount(requested: string, amount: number): boolean {
  return /^\d+(\.\d+)?$/.test(requested) && Number(requested) === amount;
}

/**
 * Opens (or reopens, on a double tap) the hosted checkout for a pass. The
 * Order is written first, the session is opened outside any transaction,
 * then its link is kept on the Order.
 */
export async function startCheckout(
  db: PrismaClient,
  saspay: SaspayClient,
  input: { organizationId: string; userId: string; offer: PassId; now: Date; appUrl: string },
): Promise<{ orderId: string; checkoutUrl: string }> {
  const { organizationId, userId, offer, now } = input;
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true, country: true, currency: true },
  });
  if (!org) throw new BillingError('SHOP_NOT_FOUND', 404);
  const currency = org.currency === 'XOF' || org.currency === 'XAF' ? org.currency : null;
  if (!isPaymentCountry(org.country) || !currency) {
    throw new BillingError('PAYMENT_COUNTRY_UNAVAILABLE', 409);
  }

  const open = await db.order.findFirst({
    where: {
      organizationId,
      offer,
      provider: 'saspay',
      status: 'PENDING',
      activatedAt: null,
      paymentUrl: { not: null },
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (open?.paymentUrl) return { orderId: open.id, checkoutUrl: open.paymentUrl };

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  if (!user) throw new BillingError('SHOP_NOT_FOUND', 404);
  const amount = passPrice(offer);
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  const order = await db.order.create({
    data: {
      provider: 'saspay',
      status: 'PENDING',
      amount,
      currency,
      organizationId,
      offer,
      userId,
      expiresAt,
    },
  });

  let session: { id: string; checkoutUrl: string };
  try {
    session = await saspay.createCheckoutSession({
      amount,
      currency,
      country: org.country,
      customerEmail: user.email,
      customerName: user.name?.trim() || org.name,
      description: `Tamani · ${PLANS[offer].label}`,
      returnUrl: `${input.appUrl.replace(/\/+$/, '')}/app/abonnement/retour?achat=${order.id}`,
      metadata: { orderId: order.id, organizationId, offer },
      expiresAt,
    });
  } catch (err) {
    await db.order.updateMany({
      where: { id: order.id, status: 'PENDING' },
      data: { status: 'FAILED' },
    });
    throw err;
  }
  await db.order.update({
    where: { id: order.id },
    data: { providerChargeId: session.id, paymentUrl: session.checkoutUrl },
  });
  return { orderId: order.id, checkoutUrl: session.checkoutUrl };
}

/**
 * Turns a verified payment into the shop's pass, once: the first caller
 * sets activatedAt, every other one reads ALREADY_DONE. The pass starts now
 * and keeps the unused answers; pending answers open up to its room.
 */
export async function activateFromPayment(
  tx: Db,
  orderId: string,
  now: Date,
): Promise<'ACTIVATED' | 'ALREADY_DONE'> {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: { organizationId: true, offer: true },
  });
  const organizationId = order?.organizationId;
  const offer = order?.offer;
  if (!organizationId || !offer || !isPassId(offer)) {
    throw new Error(`order ${orderId} is not a pass purchase`);
  }
  await advisoryXactLock(tx, billingLock(organizationId));
  // Completions count under this lock: the carried-over answers stay exact.
  await advisoryXactLock(tx, quotaLock(organizationId));
  const { count } = await tx.order.updateMany({
    where: { id: orderId, activatedAt: null },
    data: { status: 'PAID', paidAt: now, activatedAt: now },
  });
  if (count === 0) return 'ALREADY_DONE';

  const sub = await tx.subscription.findUnique({ where: { organizationId } });
  const { used } = await passCount(tx, organizationId, now, sub);
  const pass = applyPurchase(passStateOf(sub), offer, used, now);
  await tx.subscription.upsert({
    where: { organizationId },
    create: { organizationId, ...pass },
    update: pass,
  });
  await unlockPending(tx, organizationId, now);
  return 'ACTIVATED';
}

async function notifyActivation(db: PrismaClient, orderId: string, now: Date): Promise<void> {
  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { organizationId: true, offer: true },
    });
    if (!order?.organizationId || !order.offer || !isPassId(order.offer)) return;
    const sub = await db.subscription.findUnique({
      where: { organizationId: order.organizationId },
      select: { currentPeriodEnd: true },
    });
    if (!sub?.currentPeriodEnd) return;
    const people = await db.organizationMember.findMany({
      where: { organizationId: order.organizationId, role: { in: ['OWNER', 'ADMIN'] } },
      select: { userId: true },
    });
    for (const { userId } of people) {
      await createNotification(
        db,
        passActivated(userId, orderId, PLANS[order.offer].label, sub.currentPeriodEnd, now),
      );
    }
  } catch {
    log.warn('pass activation notification failed', { orderId });
  }
}

/** Reads SasPay's own answers about a purchase and activates the pass on a verified payment. */
export async function reconcileOrder(
  db: PrismaClient,
  saspay: SaspayClient,
  orderId: string,
  now: Date,
): Promise<ReconcileOutcome> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      provider: true,
      status: true,
      amount: true,
      currency: true,
      activatedAt: true,
      providerChargeId: true,
    },
  });
  if (!order || order.provider !== 'saspay') return 'FAILED';
  if (order.activatedAt) return 'ALREADY_DONE';
  if (!order.providerChargeId) return order.status === 'PENDING' ? 'PENDING' : 'FAILED';

  const session = await saspay.checkoutSessionStatus(order.providerChargeId);
  if (session.transactionId) {
    const payment = await saspay.verifyPayment(session.transactionId);
    if (payment.status === 'SUCCESS') {
      if (
        payment.currency !== order.currency ||
        !sameAmount(payment.requestedAmount, order.amount)
      ) {
        // Paid, but not this purchase's price: kept pending for a human to look at.
        log.warn('saspay payment does not match its purchase', { orderId });
        return 'PENDING';
      }
      const outcome = await db.$transaction(
        (tx) => activateFromPayment(tx, order.id, now),
        ACTIVATION_TX,
      );
      if (outcome === 'ACTIVATED') await notifyActivation(db, order.id, now);
      return outcome;
    }
    // A failed attempt: the hosted page may still take another network.
    if (payment.status === 'FAILED') return 'FAILED';
    return 'PENDING';
  }
  if (session.status === 'CANCELLED') {
    // Never touches an activated purchase, nor one already closed.
    await db.order.updateMany({
      where: { id: order.id, status: 'PENDING', activatedAt: null },
      data: { status: 'FAILED' },
    });
    return 'FAILED';
  }
  return 'PENDING';
}

/**
 * The unfinished SasPay purchases of the last 48 hours, oldest first, one
 * after the other. A 429 or an open breaker stops the batch until the next
 * run. Returns how many passes were activated.
 */
export async function reconcilePendingOrders(
  db: PrismaClient,
  saspay: SaspayClient,
  now: Date,
  limit = 10,
): Promise<number> {
  const orders = await db.order.findMany({
    where: {
      provider: 'saspay',
      status: { in: ['PENDING', 'EXPIRED'] },
      activatedAt: null,
      providerChargeId: { not: null },
      createdAt: { gte: new Date(now.getTime() - RECONCILE_WINDOW_MS) },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: { id: true },
  });
  let activated = 0;
  for (const { id } of orders) {
    try {
      if ((await reconcileOrder(db, saspay, id, now)) === 'ACTIVATED') activated += 1;
    } catch (err) {
      if (err instanceof CircuitOpenError) break;
      if (err instanceof SaspayError && err.status === 429) break;
      log.warn('saspay reconciliation failed', {
        orderId: id,
        ...(err instanceof SaspayError ? { status: err.status, code: err.code } : {}),
      });
    }
  }
  return activated;
}
