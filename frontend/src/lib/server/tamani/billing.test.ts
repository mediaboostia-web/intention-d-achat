import { prismaMock } from '@/test-utils/prisma-mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { SaspayError, type SaspayClient } from '@/lib/server/payments/saspay';
import { runTransactionsInline } from '@/test-utils/shop-fixtures';
import {
  BillingError,
  SESSION_TTL_MS,
  reconcileOrder,
  reconcilePendingOrders,
  startCheckout,
} from './billing';

const db = prismaMock as unknown as PrismaClient;
const NOW = new Date('2026-10-29T10:00:00Z');

function fakeSaspay() {
  return {
    createCheckoutSession: vi.fn<SaspayClient['createCheckoutSession']>(),
    checkoutSessionStatus: vi.fn<SaspayClient['checkoutSessionStatus']>(),
    verifyPayment: vi.fn<SaspayClient['verifyPayment']>(),
  };
}
let saspay: ReturnType<typeof fakeSaspay>;

const order = {
  id: 'ord_1',
  provider: 'saspay',
  status: 'PENDING',
  amount: 9900,
  currency: 'XOF',
  organizationId: 'org_1',
  offer: 'MONTH',
  userId: 'user_1',
  activatedAt: null,
  providerChargeId: 'sess_1',
  paymentUrl: 'https://checkout.saspay.me/abc',
  expiresAt: new Date(NOW.getTime() + SESSION_TTL_MS),
  createdAt: NOW,
};

function paid(over: Partial<{ status: string; requestedAmount: string; currency: string }> = {}) {
  saspay.checkoutSessionStatus.mockResolvedValue({
    status: 'PAID',
    transactionId: 'pay_9',
    transactionStatus: 'SUCCESS',
  });
  saspay.verifyPayment.mockResolvedValue({
    status: 'SUCCESS',
    requestedAmount: '9900.00',
    currency: 'XOF',
    ...over,
  });
}

beforeEach(() => {
  saspay = fakeSaspay();
  runTransactionsInline();
  prismaMock.$executeRaw.mockResolvedValue(1);
  prismaMock.order.findUnique.mockResolvedValue(order as never);
  prismaMock.order.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.subscription.findUnique.mockResolvedValue(null);
  prismaMock.response.count.mockResolvedValue(0);
  prismaMock.response.findMany.mockResolvedValue([]);
  prismaMock.organizationMember.findMany.mockResolvedValue([
    { userId: 'user_1' },
    { userId: 'user_2' },
  ] as never);
});

describe('reconcileOrder', () => {
  it('reconcileOrder activates once when called twice concurrently', async () => {
    paid();
    prismaMock.order.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    const results = await Promise.all([
      reconcileOrder(db, saspay, 'ord_1', NOW),
      reconcileOrder(db, saspay, 'ord_1', NOW),
    ]);
    expect(results.sort()).toEqual(['ACTIVATED', 'ALREADY_DONE']);
    expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'ord_1', activatedAt: null },
      data: { status: 'PAID', paidAt: NOW, activatedAt: NOW },
    });
    expect(prismaMock.subscription.upsert).toHaveBeenCalledTimes(1);
  });

  it('activates a Pass Mois for 30 days with 3 days of grace', async () => {
    paid();
    expect(await reconcileOrder(db, saspay, 'ord_1', NOW)).toBe('ACTIVATED');
    expect(saspay.verifyPayment).toHaveBeenCalledWith('pay_9');
    // The billing lock, then the quota lock, before the first write.
    const keys = prismaMock.$executeRaw.mock.calls.map((c) => c[1]);
    expect(keys.slice(0, 2)).toEqual(['billing:org_1', 'quota:org_1']);
    const firstLock = prismaMock.$executeRaw.mock.invocationCallOrder[0] ?? Infinity;
    const write = prismaMock.order.updateMany.mock.invocationCallOrder[0] ?? -Infinity;
    expect(firstLock).toBeLessThan(write);
    const pass = {
      plan: 'MONTH',
      periodStart: NOW,
      currentPeriodEnd: new Date('2026-11-28T10:00:00Z'),
      graceUntil: new Date('2026-12-01T10:00:00Z'),
      responsesIncluded: 1000,
    };
    expect(prismaMock.subscription.upsert).toHaveBeenCalledWith({
      where: { organizationId: 'org_1' },
      create: { organizationId: 'org_1', ...pass },
      update: pass,
    });
  });

  it('tells the owner and the admins, once per purchase', async () => {
    paid();
    // No pass before; then the pass just written.
    prismaMock.subscription.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValue({ currentPeriodEnd: new Date('2026-11-28T10:00:00Z') } as never);
    await reconcileOrder(db, saspay, 'ord_1', NOW);
    expect(prismaMock.organizationMember.findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org_1', role: { in: ['OWNER', 'ADMIN'] } },
      select: { userId: true },
    });
    expect(prismaMock.notification.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user_1',
        body: "Ton Pass Mois est actif jusqu'au 28 novembre.",
        dedupeKey: 'pass-activated:ord_1:user_1',
      }),
    });
  });

  it('late failure never downgrades an activated order', async () => {
    prismaMock.order.findUnique.mockResolvedValue({ ...order, activatedAt: NOW } as never);
    saspay.checkoutSessionStatus.mockResolvedValue({
      status: 'CANCELLED',
      transactionId: null,
      transactionStatus: null,
    });
    expect(await reconcileOrder(db, saspay, 'ord_1', NOW)).toBe('ALREADY_DONE');
    expect(saspay.checkoutSessionStatus).not.toHaveBeenCalled();
    expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
  });

  it('a cancelled session fails only a purchase still pending', async () => {
    saspay.checkoutSessionStatus.mockResolvedValue({
      status: 'CANCELLED',
      transactionId: null,
      transactionStatus: null,
    });
    expect(await reconcileOrder(db, saspay, 'ord_1', NOW)).toBe('FAILED');
    expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'ord_1', status: { in: ['PENDING', 'EXPIRED'] }, activatedAt: null },
      data: { status: 'FAILED' },
    });
  });

  it('a session expired unpaid closes the purchase, so it leaves the batch', async () => {
    saspay.checkoutSessionStatus.mockResolvedValue({
      status: 'EXPIRED',
      transactionId: null,
      transactionStatus: null,
    });
    expect(await reconcileOrder(db, saspay, 'ord_1', NOW)).toBe('FAILED');
    expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'ord_1', status: { in: ['PENDING', 'EXPIRED'] }, activatedAt: null },
      data: { status: 'FAILED' },
    });
  });

  it('a failed payment on a session that can no longer be paid closes the purchase', async () => {
    saspay.checkoutSessionStatus.mockResolvedValue({
      status: 'EXPIRED',
      transactionId: 'pay_9',
      transactionStatus: 'FAILED',
    });
    saspay.verifyPayment.mockResolvedValue({
      status: 'FAILED',
      requestedAmount: '9900.00',
      currency: 'XOF',
    });
    expect(await reconcileOrder(db, saspay, 'ord_1', NOW)).toBe('FAILED');
    expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'ord_1', status: { in: ['PENDING', 'EXPIRED'] }, activatedAt: null },
      data: { status: 'FAILED' },
    });
  });

  it('refuses activation when verify is not SUCCESS or the amount differs', async () => {
    for (const over of [
      { status: 'PENDING' },
      { currency: 'XAF' },
      { requestedAmount: '5900.00' },
      { requestedAmount: 'abc' },
    ]) {
      paid(over);
      expect(await reconcileOrder(db, saspay, 'ord_1', NOW)).toBe('PENDING');
    }
    paid({ status: 'FAILED' });
    // A failed attempt leaves the session open to another network: the purchase stays pending.
    expect(await reconcileOrder(db, saspay, 'ord_1', NOW)).toBe('FAILED');
    expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.subscription.upsert).not.toHaveBeenCalled();
  });

  it('a session not paid yet stays pending without verifying', async () => {
    saspay.checkoutSessionStatus.mockResolvedValue({
      status: 'PENDING',
      transactionId: null,
      transactionStatus: null,
    });
    expect(await reconcileOrder(db, saspay, 'ord_1', NOW)).toBe('PENDING');
    expect(saspay.verifyPayment).not.toHaveBeenCalled();
  });

  it('an EXPIRED order paid late is still activated', async () => {
    prismaMock.order.findUnique.mockResolvedValue({ ...order, status: 'EXPIRED' } as never);
    paid();
    expect(await reconcileOrder(db, saspay, 'ord_1', NOW)).toBe('ACTIVATED');
  });

  it('activation unlocks pending answers', async () => {
    paid();
    prismaMock.order.findUnique.mockResolvedValue({
      ...order,
      offer: 'WEEK',
      amount: 3900,
    } as never);
    saspay.verifyPayment.mockResolvedValue({
      status: 'SUCCESS',
      requestedAmount: '3900.00',
      currency: 'XOF',
    });
    const week = {
      plan: 'WEEK',
      periodStart: NOW,
      currentPeriodEnd: new Date('2026-11-05T10:00:00Z'),
      graceUntil: new Date('2026-11-08T10:00:00Z'),
      responsesIncluded: 150,
    };
    // No pass before; the unlock reads the pass just written.
    prismaMock.subscription.findUnique.mockResolvedValueOnce(null).mockResolvedValue(week as never);
    const pending = Array.from({ length: 87 }, (_, i) => ({ id: `r${i}` }));
    prismaMock.response.findMany.mockResolvedValue(pending as never);
    prismaMock.response.updateMany.mockResolvedValue({ count: 87 });
    expect(await reconcileOrder(db, saspay, 'ord_1', NOW)).toBe('ACTIVATED');
    expect(prismaMock.response.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 150 }),
    );
    expect(prismaMock.response.updateMany).toHaveBeenCalledWith({
      where: { id: { in: pending.map((r) => r.id) }, locked: true },
      data: { locked: false, countedAt: NOW },
    });
  });
});

describe('reconcilePendingOrders', () => {
  it('reads the SasPay purchases of the last 48 hours not yet activated', async () => {
    prismaMock.order.findMany.mockResolvedValue([] as never);
    expect(await reconcilePendingOrders(db, saspay, NOW)).toBe(0);
    expect(prismaMock.order.findMany).toHaveBeenCalledWith({
      where: {
        provider: 'saspay',
        status: { in: ['PENDING', 'EXPIRED'] },
        activatedAt: null,
        providerChargeId: { not: null },
        createdAt: { gte: new Date('2026-10-27T10:00:00Z') },
      },
      // The newest first: a fresh payment never waits behind abandoned ones.
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true },
    });
  });

  it('a 429 stops the batch', async () => {
    prismaMock.order.findMany.mockResolvedValue([
      { id: 'ord_1' },
      { id: 'ord_2' },
      { id: 'ord_3' },
    ] as never);
    saspay.checkoutSessionStatus.mockRejectedValue(
      new SaspayError(429, 'rate_limited', true, 'GET /checkout-sessions/:id/status/'),
    );
    expect(await reconcilePendingOrders(db, saspay, NOW)).toBe(0);
    expect(saspay.checkoutSessionStatus).toHaveBeenCalledTimes(1);
  });

  it('a refused key stops the batch (no retry on 401 or 403)', async () => {
    for (const status of [401, 403]) {
      saspay = fakeSaspay();
      prismaMock.order.findMany.mockResolvedValue([{ id: 'ord_1' }, { id: 'ord_2' }] as never);
      saspay.checkoutSessionStatus.mockRejectedValue(
        new SaspayError(status, 'unauthorized', false, 'GET /checkout-sessions/:id/status/'),
      );
      expect(await reconcilePendingOrders(db, saspay, NOW)).toBe(0);
      expect(saspay.checkoutSessionStatus).toHaveBeenCalledTimes(1);
    }
  });

  it('counts the activations and goes on past another error', async () => {
    prismaMock.order.findMany.mockResolvedValue([{ id: 'ord_1' }, { id: 'ord_2' }] as never);
    paid();
    saspay.checkoutSessionStatus.mockRejectedValueOnce(
      new SaspayError(404, 'not_found', false, 'GET /checkout-sessions/:id/status/'),
    );
    expect(await reconcilePendingOrders(db, saspay, NOW)).toBe(1);
  });
});

describe('startCheckout', () => {
  const input = {
    organizationId: 'org_1',
    userId: 'user_1',
    offer: 'MONTH' as const,
    now: NOW,
    appUrl: 'https://tamani.app',
  };

  beforeEach(() => {
    prismaMock.organization.findUnique.mockResolvedValue({
      id: 'org_1',
      name: 'Diallo Import',
      country: 'SN',
      currency: 'XOF',
    } as never);
    prismaMock.user.findUnique.mockResolvedValue({
      email: 'awa@example.com',
      name: 'Awa Diallo',
    } as never);
    prismaMock.order.findFirst.mockResolvedValue(null);
    prismaMock.order.create.mockResolvedValue({ ...order, providerChargeId: null } as never);
    saspay.createCheckoutSession.mockResolvedValue({
      id: 'sess_1',
      checkoutUrl: 'https://checkout.saspay.me/abc',
    });
  });

  it('creates the purchase, opens the session, then keeps its link', async () => {
    expect(await startCheckout(db, saspay, input)).toEqual({
      orderId: 'ord_1',
      checkoutUrl: 'https://checkout.saspay.me/abc',
    });
    const expiresAt = new Date('2026-10-29T11:00:00Z');
    expect(prismaMock.order.create).toHaveBeenCalledWith({
      data: {
        provider: 'saspay',
        status: 'PENDING',
        amount: 9900,
        currency: 'XOF',
        organizationId: 'org_1',
        offer: 'MONTH',
        userId: 'user_1',
        expiresAt,
      },
    });
    expect(saspay.createCheckoutSession).toHaveBeenCalledWith({
      amount: 9900,
      currency: 'XOF',
      country: 'SN',
      customerEmail: 'awa@example.com',
      customerName: 'Awa Diallo',
      description: 'Tamani · Pass Mois',
      returnUrl: 'https://tamani.app/app/abonnement/retour?achat=ord_1',
      metadata: { orderId: 'ord_1', organizationId: 'org_1', offer: 'MONTH' },
      expiresAt,
    });
    expect(prismaMock.order.update).toHaveBeenCalledWith({
      where: { id: 'ord_1' },
      data: { providerChargeId: 'sess_1', paymentUrl: 'https://checkout.saspay.me/abc' },
    });
  });

  it('startCheckout reuses the pending session on a double tap', async () => {
    prismaMock.order.findFirst.mockResolvedValue(order as never);
    expect(await startCheckout(db, saspay, input)).toEqual({
      orderId: 'ord_1',
      checkoutUrl: 'https://checkout.saspay.me/abc',
    });
    expect(prismaMock.order.findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: 'org_1',
        offer: 'MONTH',
        provider: 'saspay',
        status: 'PENDING',
        activatedAt: null,
        paymentUrl: { not: null },
        expiresAt: { gt: NOW },
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(prismaMock.order.create).not.toHaveBeenCalled();
    expect(saspay.createCheckoutSession).not.toHaveBeenCalled();
  });

  it('startCheckout refuses GN and CD', async () => {
    for (const [country, currency] of [
      ['GN', 'GNF'],
      ['CD', 'CDF'],
      ['TD', 'XAF'],
    ]) {
      prismaMock.organization.findUnique.mockResolvedValue({
        id: 'org_1',
        name: 'Diallo Import',
        country,
        currency,
      } as never);
      const err = await startCheckout(db, saspay, input).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(BillingError);
      expect(err).toMatchObject({ code: 'PAYMENT_COUNTRY_UNAVAILABLE', status: 409 });
    }
    expect(prismaMock.order.create).not.toHaveBeenCalled();
  });

  it('a session SasPay refuses fails the purchase and rethrows', async () => {
    const refused = new SaspayError(503, 'http_503', true, 'POST /checkout-sessions/');
    saspay.createCheckoutSession.mockRejectedValue(refused);
    await expect(startCheckout(db, saspay, input)).rejects.toBe(refused);
    expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'ord_1', status: 'PENDING' },
      data: { status: 'FAILED' },
    });
  });

  it('names the shop when the account has no name', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ email: 'awa@example.com', name: null } as never);
    await startCheckout(db, saspay, input);
    expect(saspay.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ customerName: 'Diallo Import' }),
    );
  });
});
