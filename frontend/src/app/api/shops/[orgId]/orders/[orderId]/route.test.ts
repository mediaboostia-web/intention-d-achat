// GET|PATCH /api/shops/[orgId]/orders/[orderId] (Tamani lot 7).
import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies, __cookieStore } from '@/test-utils/mock-cookies';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  apiRequest,
  asMember,
  asNonMember,
  routeParams,
  runTransactionsInline,
  signIn,
} from '@/test-utils/shop-fixtures';

mockNextCookies();

import { GET, PATCH } from './route';

const one = routeParams({ orgId: 'org_1', orderId: 'o1' });
const errorOf = async (res: Response) => ((await res.json()) as { error: string }).error;

const stored = (over: Record<string, unknown> = {}) =>
  prismaMock.saleOrder.findFirst.mockResolvedValue({
    id: 'o1',
    status: 'TO_CONFIRM',
    paid: false,
    paidAt: null,
    createdAt: new Date('2026-10-27T10:00:00Z'),
    quantity: 3,
    unitPrice: 7500,
    totalAmount: 22_500,
    fulfillment: 'PICKUP',
    zoneId: null,
    productId: 'prod_1',
    campaignId: null,
    responseId: null,
    buyerType: 'CONSUMER',
    notes: null,
    zone: null,
    product: { name: 'Marmites inox 5 L', unitLabel: 'pièce' },
    campaign: null,
    respondent: { id: 'r1', firstName: 'Awa', phoneE164: '+221771234512', anonymizedAt: null },
    ...over,
  } as never);
const patch = (body: unknown, csrf = true) =>
  PATCH(apiRequest('/api/shops/org_1/orders/o1', { method: 'PATCH', body, csrf }), one);
const written = () => prismaMock.saleOrder.updateMany.mock.calls[0]![0]!;

beforeEach(async () => {
  __cookieStore.clear();
  await signIn();
  asMember('org_1', 'MEMBER');
  runTransactionsInline();
  prismaMock.subscription.findUnique.mockResolvedValue(null);
  prismaMock.saleOrder.updateMany.mockResolvedValue({ count: 1 });
  stored();
});

describe('GET /api/shops/[orgId]/orders/[orderId]', () => {
  it('sends the order, the number masked on the free plan', async () => {
    const res = await GET(apiRequest('/api/shops/org_1/orders/o1'), one);
    expect(res.status).toBe(200);
    expect((await res.json()).order).toMatchObject({
      id: 'o1',
      client: { firstName: 'Awa', phone: '77 •• •• 12', phoneE164: null },
    });
    expect(prismaMock.saleOrder.findFirst.mock.calls[0]![0]!.where).toEqual({
      id: 'o1',
      organizationId: 'org_1',
    });
  });

  it('ORDER_NOT_FOUND for an order of another shop', async () => {
    prismaMock.saleOrder.findFirst.mockResolvedValue(null);
    const res = await GET(apiRequest('/api/shops/org_1/orders/o1'), one);
    expect([res.status, await errorOf(res)]).toEqual([404, 'ORDER_NOT_FOUND']);
  });

  it('is 404 to a non-member', async () => {
    asNonMember();
    const res = await GET(apiRequest('/api/shops/org_1/orders/o1'), one);
    expect(res.status).toBe(404);
    expect(prismaMock.saleOrder.findFirst).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/shops/[orgId]/orders/[orderId]', () => {
  it('PATCH price after confirmation is refused', async () => {
    stored({ status: 'CONFIRMED' });
    const res = await patch({ unitPrice: 5000 });
    expect([res.status, await errorOf(res)]).toEqual([409, 'INVALID_ORDER_TRANSITION']);
    // Nothing is written: the total stays 22 500.
    expect(prismaMock.saleOrder.updateMany).not.toHaveBeenCalled();
  });

  it('a price before confirmation recomputes the total', async () => {
    const res = await patch({ unitPrice: 7000 });
    expect(res.status).toBe(200);
    expect((await res.json()).order).toMatchObject({ unitPrice: 7000, totalAmount: 21_000 });
    expect(written()).toEqual({
      where: { id: 'o1', organizationId: 'org_1', status: 'TO_CONFIRM' },
      data: { unitPrice: 7000, quantity: 3, totalAmount: 21_000 },
    });
  });

  it('confirm then fulfil dates each step', async () => {
    const confirmed = await patch({ status: 'CONFIRMED' });
    expect(confirmed.status).toBe(200);
    expect((await confirmed.json()).order.status).toBe('CONFIRMED');
    expect(written().data).toEqual({ status: 'CONFIRMED', confirmedAt: expect.any(Date) });

    prismaMock.saleOrder.updateMany.mockClear();
    stored({ status: 'CONFIRMED' });
    const fulfilled = await patch({ status: 'FULFILLED' });
    expect((await fulfilled.json()).order.status).toBe('FULFILLED');
    expect(written()).toEqual({
      where: { id: 'o1', organizationId: 'org_1', status: 'CONFIRMED' },
      data: { status: 'FULFILLED', fulfilledAt: expect.any(Date) },
    });
  });

  it('refuses a forbidden move with 409 INVALID_ORDER_TRANSITION', async () => {
    const res = await patch({ status: 'FULFILLED' });
    expect([res.status, await errorOf(res)]).toEqual([409, 'INVALID_ORDER_TRANSITION']);
    stored({ status: 'FULFILLED' });
    const cancel = await patch({ status: 'CANCELLED' });
    expect(cancel.status).toBe(409);
  });

  it('paid sets and clears paidAt', async () => {
    const paid = await (await patch({ paid: true })).json();
    expect(paid.order.paid).toBe(true);
    expect(typeof paid.order.paidAt).toBe('string');
    expect(written().data).toEqual({ paid: true, paidAt: expect.any(Date) });

    prismaMock.saleOrder.updateMany.mockClear();
    stored({ paid: true, paidAt: new Date('2026-10-27T12:00:00Z') });
    const unpaid = await (await patch({ paid: false })).json();
    expect(unpaid.order).toMatchObject({ paid: false, paidAt: null });
    expect(written().data).toEqual({ paid: false, paidAt: null });
  });

  it('a blank note clears it', async () => {
    stored({ notes: 'Après 18 h' });
    const res = await patch({ notes: '   ' });
    expect(res.status).toBe(200);
    expect(written().data).toEqual({ notes: null });
  });

  it('ORDER_NOT_FOUND for an order of another shop', async () => {
    prismaMock.saleOrder.findFirst.mockResolvedValue(null);
    const res = await patch({ paid: true });
    expect([res.status, await errorOf(res)]).toEqual([404, 'ORDER_NOT_FOUND']);
    expect(prismaMock.saleOrder.updateMany).not.toHaveBeenCalled();
  });

  it('400 on an invalid body', async () => {
    for (const bad of [
      {},
      { status: 'SHIPPED' },
      { paid: 'yes' },
      { unitPrice: -1 },
      { unitPrice: 100_000_001 },
      { unitPrice: 12.5 },
      { quantity: 0 },
      { notes: 'x'.repeat(501) },
      'not json',
    ]) {
      const res = await patch(bad);
      expect(res.status).toBe(400);
      expect(await errorOf(res)).toBe('VALIDATION_FAILED');
    }
    expect(prismaMock.saleOrder.updateMany).not.toHaveBeenCalled();
  });

  it('400 on a total the database cannot hold', async () => {
    const res = await patch({ unitPrice: 100_000_000, quantity: 100_000 });
    expect([res.status, await errorOf(res)]).toEqual([400, 'VALIDATION_FAILED']);
  });

  it('403 without the CSRF token', async () => {
    const res = await patch({ status: 'CONFIRMED' }, false);
    expect(res.status).toBe(403);
    expect(prismaMock.saleOrder.updateMany).not.toHaveBeenCalled();
  });
});
