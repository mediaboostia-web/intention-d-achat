// Pass purchases under /api/shops/[orgId]/billing (Tamani lot 8).
import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies, __cookieStore } from '@/test-utils/mock-cookies';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { apiRequest, asMember, asNonMember, routeParams, signIn } from '@/test-utils/shop-fixtures';

mockNextCookies();

const client = vi.hoisted(() => ({ saspay: {} as object | null }));
vi.mock('@/lib/server/payments/saspay', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server/payments/saspay')>()),
  getSaspay: () => client.saspay,
}));
const billing = vi.hoisted(() => ({
  startCheckout: vi.fn(),
  reconcileOrder: vi.fn(async () => 'PENDING'),
}));
vi.mock('@/lib/server/tamani/billing', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server/tamani/billing')>()),
  ...billing,
}));

const { BillingError } = await import('@/lib/server/tamani/billing');
const { SaspayError } = await import('@/lib/server/payments/saspay');
const { GET } = await import('./route');
const { POST } = await import('./checkout/route');
const { GET: GET_ORDER } = await import('./orders/[orderId]/route');

const shop = routeParams({ orgId: 'org_1' });
const errorOf = async (res: Response) => ((await res.json()) as { error: string }).error;
const checkout = (body: unknown, csrf = true) =>
  POST(apiRequest('/api/shops/org_1/billing/checkout', { method: 'POST', body, csrf }), shop);

beforeEach(async () => {
  __cookieStore.clear();
  await signIn();
  asMember('org_1');
  client.saspay = {};
  billing.startCheckout.mockReset();
  billing.reconcileOrder.mockReset();
  billing.reconcileOrder.mockResolvedValue('PENDING');
  vi.stubEnv('APP_URL', 'https://tamani.app');
});

describe('POST /api/shops/[orgId]/billing/checkout', () => {
  it('opens the checkout for an admin: 201 with the link', async () => {
    billing.startCheckout.mockResolvedValue({
      orderId: 'ord_1',
      checkoutUrl: 'https://checkout.saspay.me/abc',
    });
    const res = await checkout({ offer: 'MONTH' });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      orderId: 'ord_1',
      checkoutUrl: 'https://checkout.saspay.me/abc',
    });
    expect(billing.startCheckout).toHaveBeenCalledWith(expect.anything(), client.saspay, {
      organizationId: 'org_1',
      userId: 'user_1',
      offer: 'MONTH',
      now: expect.any(Date),
      appUrl: 'https://tamani.app',
    });
  });

  it('a MEMBER who pays gets 403, a non-member 404', async () => {
    asMember('org_1', 'MEMBER');
    expect((await checkout({ offer: 'MONTH' })).status).toBe(403);
    asNonMember();
    expect((await checkout({ offer: 'MONTH' })).status).toBe(404);
    expect(billing.startCheckout).not.toHaveBeenCalled();
  });

  it('403 without the CSRF token', async () => {
    expect((await checkout({ offer: 'MONTH' }, false)).status).toBe(403);
  });

  it('503 BILLING_NOT_CONFIGURED without a key', async () => {
    client.saspay = null;
    const res = await checkout({ offer: 'MONTH' });
    expect(res.status).toBe(503);
    expect(await errorOf(res)).toBe('BILLING_NOT_CONFIGURED');
  });

  it('400 VALIDATION_FAILED for an unknown offer, OFFER_NOT_BUYABLE for Illimité', async () => {
    for (const body of [{ offer: 'GOLD' }, {}, { offer: 7 }]) {
      const res = await checkout(body);
      expect(res.status).toBe(400);
      expect(await errorOf(res)).toBe('VALIDATION_FAILED');
    }
    for (const offer of ['UNLIMITED', 'TRIAL', 'FREE']) {
      const res = await checkout({ offer });
      expect(res.status).toBe(400);
      expect(await errorOf(res)).toBe('OFFER_NOT_BUYABLE');
    }
    expect(billing.startCheckout).not.toHaveBeenCalled();
  });

  it('409 PAYMENT_COUNTRY_UNAVAILABLE where SasPay takes no payment', async () => {
    billing.startCheckout.mockRejectedValue(new BillingError('PAYMENT_COUNTRY_UNAVAILABLE', 409));
    const res = await checkout({ offer: 'WEEK' });
    expect(res.status).toBe(409);
    expect(await errorOf(res)).toBe('PAYMENT_COUNTRY_UNAVAILABLE');
  });

  it('503 PAYMENT_PROVIDER_UNAVAILABLE when SasPay fails', async () => {
    billing.startCheckout.mockRejectedValue(new SaspayError(503, 'http_503', true, 'POST x'));
    const res = await checkout({ offer: 'WEEK' });
    expect(res.status).toBe(503);
    expect(await errorOf(res)).toBe('PAYMENT_PROVIDER_UNAVAILABLE');
  });
});

describe('GET /api/shops/[orgId]/billing', () => {
  const now = Date.now();
  const week = {
    organizationId: 'org_1',
    plan: 'WEEK',
    periodStart: new Date(now - 86_400_000),
    currentPeriodEnd: new Date(now + 6 * 86_400_000),
    graceUntil: new Date(now + 9 * 86_400_000),
    responsesIncluded: 150,
  };

  it('sends the pass, the answers per campaign and the last purchases', async () => {
    prismaMock.organization.findUnique.mockResolvedValue({ id: 'org_1', country: 'SN' } as never);
    prismaMock.subscription.findUnique.mockResolvedValue(week as never);
    prismaMock.response.count.mockResolvedValueOnce(42).mockResolvedValueOnce(3);
    // Prisma's groupBy overloads defeat the deep mock's types.
    (prismaMock.response.groupBy as unknown as Mock).mockResolvedValue([
      { campaignId: 'camp_1', _count: { _all: 30 } },
      { campaignId: 'camp_2', _count: { _all: 12 } },
    ] as never);
    prismaMock.campaign.findMany.mockResolvedValue([
      { id: 'camp_1', title: 'Riz parfumé' },
      { id: 'camp_2', title: 'Marmites' },
    ] as never);
    const created = new Date('2026-10-29T09:00:00Z');
    prismaMock.order.findMany.mockResolvedValue([
      {
        id: 'ord_1',
        offer: 'WEEK',
        amount: 3900,
        status: 'PAID',
        createdAt: created,
        activatedAt: created,
      },
    ] as never);

    const res = await GET(apiRequest('/api/shops/org_1/billing'), shop);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      pass: {
        plan: 'WEEK',
        label: 'Pass Semaine',
        endsAt: week.currentPeriodEnd.toISOString(),
        inGrace: false,
        used: 42,
        included: 150,
        pending: 3,
      },
      perCampaign: [
        { campaignId: 'camp_1', title: 'Riz parfumé', used: 30 },
        { campaignId: 'camp_2', title: 'Marmites', used: 12 },
      ],
      purchases: [
        {
          id: 'ord_1',
          offer: 'WEEK',
          amount: 3900,
          status: 'PAID',
          createdAt: created.toISOString(),
          activated: true,
        },
      ],
      paymentAvailable: true,
    });
    expect(prismaMock.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: 'org_1', provider: 'saspay' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    );
  });

  it('no payment where SasPay takes none, or without a key', async () => {
    prismaMock.organization.findUnique.mockResolvedValue({ id: 'org_1', country: 'GN' } as never);
    prismaMock.subscription.findUnique.mockResolvedValue(null);
    prismaMock.response.count.mockResolvedValue(0);
    prismaMock.order.findMany.mockResolvedValue([] as never);
    const body = (await (await GET(apiRequest('/api/shops/org_1/billing'), shop)).json()) as {
      pass: { plan: string };
      perCampaign: unknown[];
      paymentAvailable: boolean;
    };
    expect(body.pass.plan).toBe('FREE');
    expect(body.perCampaign).toEqual([]);
    expect(body.paymentAvailable).toBe(false);
    prismaMock.organization.findUnique.mockResolvedValue({ id: 'org_1', country: 'SN' } as never);
    client.saspay = null;
    const again = (await (await GET(apiRequest('/api/shops/org_1/billing'), shop)).json()) as {
      paymentAvailable: boolean;
    };
    expect(again.paymentAvailable).toBe(false);
  });

  it('404 for a non-member', async () => {
    asNonMember();
    expect((await GET(apiRequest('/api/shops/org_1/billing'), shop)).status).toBe(404);
  });
});

describe('GET /api/shops/[orgId]/billing/orders/[orderId]', () => {
  const params = routeParams({ orgId: 'org_1', orderId: 'ord_1' });
  const purchase = {
    id: 'ord_1',
    offer: 'MONTH',
    status: 'PENDING',
    activatedAt: null,
  };

  it('reconciles a purchase not yet active, then sends its state', async () => {
    prismaMock.order.findFirst
      .mockResolvedValueOnce(purchase as never)
      .mockResolvedValueOnce({ ...purchase, status: 'PAID', activatedAt: new Date() } as never);
    billing.reconcileOrder.mockResolvedValue('ACTIVATED');
    const res = await GET_ORDER(apiRequest('/api/shops/org_1/billing/orders/ord_1'), params);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      purchase: { id: 'ord_1', offer: 'MONTH', status: 'PAID', activated: true },
    });
    expect(prismaMock.order.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ord_1', organizationId: 'org_1', provider: 'saspay' },
      }),
    );
    expect(billing.reconcileOrder).toHaveBeenCalledWith(
      expect.anything(),
      client.saspay,
      'ord_1',
      expect.any(Date),
    );
  });

  it('an active purchase is not asked again', async () => {
    prismaMock.order.findFirst.mockResolvedValue({
      ...purchase,
      status: 'PAID',
      activatedAt: new Date(),
    } as never);
    await GET_ORDER(apiRequest('/api/shops/org_1/billing/orders/ord_1'), params);
    expect(billing.reconcileOrder).not.toHaveBeenCalled();
  });

  it('SasPay down: the purchase is sent as it stands', async () => {
    prismaMock.order.findFirst.mockResolvedValue(purchase as never);
    billing.reconcileOrder.mockRejectedValue(new SaspayError(503, 'http_503', true, 'GET x'));
    const res = await GET_ORDER(apiRequest('/api/shops/org_1/billing/orders/ord_1'), params);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      purchase: { id: 'ord_1', offer: 'MONTH', status: 'PENDING', activated: false },
    });
  });

  it("404 PURCHASE_NOT_FOUND for another shop's purchase", async () => {
    prismaMock.order.findFirst.mockResolvedValue(null);
    const res = await GET_ORDER(apiRequest('/api/shops/org_1/billing/orders/ord_9'), params);
    expect(res.status).toBe(404);
    expect(await errorOf(res)).toBe('PURCHASE_NOT_FOUND');
    expect(billing.reconcileOrder).not.toHaveBeenCalled();
  });
});
