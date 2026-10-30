// GET|POST /api/shops/[orgId]/orders (Tamani lot 7).
import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies, __cookieStore } from '@/test-utils/mock-cookies';
import { describe, it, expect, beforeEach, type Mock } from 'vitest';
import {
  apiRequest,
  asMember,
  asNonMember,
  routeParams,
  runTransactionsInline,
  signIn,
} from '@/test-utils/shop-fixtures';

mockNextCookies();

import { GET, POST } from './route';

const shop = routeParams({ orgId: 'org_1' });
/** Prisma's groupBy overloads defeat the deep mock's types (as in home-bulletin.test.ts). */
const groupBy = () => prismaMock.saleOrder.groupBy as unknown as Mock;

const now = new Date();
const pro = {
  plan: 'MONTH',
  currentPeriodEnd: new Date(now.getTime() + 20 * 86_400_000),
  graceUntil: new Date(now.getTime() + 25 * 86_400_000),
};
const errorOf = async (res: Response) => ((await res.json()) as { error: string }).error;

const orderRow = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  status: 'CONFIRMED',
  paid: false,
  paidAt: null,
  createdAt: new Date('2026-10-27T10:00:00Z'),
  quantity: 12,
  unitPrice: 6000,
  totalAmount: 72_000,
  fulfillment: 'DELIVERY',
  zoneId: 'zone_m',
  productId: 'prod_1',
  campaignId: 'camp_1',
  responseId: null,
  buyerType: 'RESELLER',
  notes: null,
  zone: { name: 'Médina', sortOrder: 0 },
  product: { name: 'Marmites inox 5 L', unitLabel: 'pièce' },
  campaign: { title: 'Marmites' },
  respondent: { id: 'r1', firstName: 'Awa', phoneE164: '+221771234512', anonymizedAt: null },
  ...over,
});

const body = {
  productId: 'prod_1',
  firstName: 'Awa',
  phone: '77 123 45 12',
  quantity: 12,
  buyerType: 'RESELLER',
  fulfillment: 'DELIVERY',
  zoneId: 'zone_m',
  campaignId: 'camp_1',
};
const create = (b: unknown, csrf = true) =>
  POST(apiRequest('/api/shops/org_1/orders', { method: 'POST', body: b, csrf }), shop);

beforeEach(async () => {
  __cookieStore.clear();
  await signIn();
  asMember('org_1', 'MEMBER');
  runTransactionsInline();
  prismaMock.subscription.findUnique.mockResolvedValue(pro as never);
});

describe('GET /api/shops/[orgId]/orders', () => {
  it('lists the shop orders with the filters of the address and the counts', async () => {
    prismaMock.saleOrder.findMany.mockResolvedValue([orderRow('o1')] as never);
    groupBy().mockResolvedValue([{ status: 'CONFIRMED', _count: { _all: 1 } }] as never);
    const res = await GET(
      apiRequest('/api/shops/org_1/orders?statut=confirmees&campagne=camp_1&produit=prod_1'),
      shop,
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toHaveLength(1);
    expect(json.items[0]).toMatchObject({
      id: 'o1',
      status: 'CONFIRMED',
      totalAmount: 72_000,
      client: { firstName: 'Awa', phone: '+221 77 123 45 12', phoneE164: '+221771234512' },
    });
    expect(json.counts).toEqual({ TO_CONFIRM: 0, CONFIRMED: 1, FULFILLED: 0, CANCELLED: 0 });
    expect(json.nextCursor).toBeNull();
    expect(prismaMock.saleOrder.findMany.mock.calls[0]![0]!.where).toMatchObject({
      organizationId: 'org_1',
      status: 'CONFIRMED',
      campaignId: 'camp_1',
      productId: 'prod_1',
    });
  });

  it('masks the numbers on the free plan', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(null);
    prismaMock.saleOrder.findMany.mockResolvedValue([orderRow('o1')] as never);
    groupBy().mockResolvedValue([] as never);
    const json = await (await GET(apiRequest('/api/shops/org_1/orders'), shop)).json();
    expect(json.items[0].client).toEqual({
      id: 'r1',
      firstName: 'Awa',
      phone: '77 •• •• 12',
      phoneE164: null,
    });
    expect(JSON.stringify(json)).not.toContain('771234512');
  });

  it('?vue=a-livrer groups the confirmed deliveries by zone with the totals per product', async () => {
    prismaMock.saleOrder.findMany.mockResolvedValue([
      orderRow('o1'),
      orderRow('o2', { quantity: 6 }),
      orderRow('o3', { zoneId: null, zone: null, quantity: 2 }),
    ] as never);
    const res = await GET(apiRequest('/api/shops/org_1/orders?vue=a-livrer'), shop);
    expect(res.status).toBe(200);
    const { groups } = await res.json();
    expect(prismaMock.saleOrder.findMany.mock.calls[0]![0]!.where).toEqual({
      organizationId: 'org_1',
      status: 'CONFIRMED',
      fulfillment: 'DELIVERY',
    });
    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({
      zoneId: 'zone_m',
      zoneName: 'Médina',
      totals: [{ productId: 'prod_1', quantity: 18 }],
    });
    expect(groups[0].orders.map((o: { id: string }) => o.id)).toEqual(['o1', 'o2']);
    expect(groups[1]).toMatchObject({ zoneId: null, zoneName: null });
  });

  it('refuses an unknown filter with 400', async () => {
    const res = await GET(apiRequest('/api/shops/org_1/orders?statut=livre'), shop);
    expect(res.status).toBe(400);
    expect(await errorOf(res)).toBe('VALIDATION_FAILED');
    const view = await GET(apiRequest('/api/shops/org_1/orders?vue=carte'), shop);
    expect(view.status).toBe(400);
  });

  it('is 404 to a non-member', async () => {
    asNonMember();
    const res = await GET(apiRequest('/api/shops/org_1/orders'), shop);
    expect(res.status).toBe(404);
    expect(prismaMock.saleOrder.findMany).not.toHaveBeenCalled();
  });
});

describe('POST /api/shops/[orgId]/orders', () => {
  beforeEach(() => {
    prismaMock.organization.findFirst.mockResolvedValue({ country: 'SN' } as never);
    prismaMock.product.findFirst.mockResolvedValue({
      id: 'prod_1',
      unitPrice: 7500,
      wholesalePrice: 6000,
      wholesaleMinQty: 12,
    } as never);
    prismaMock.campaign.findFirst.mockResolvedValue({ id: 'camp_1' } as never);
    prismaMock.deliveryZone.findFirst.mockResolvedValue({ id: 'zone_m' } as never);
    prismaMock.respondent.upsert.mockResolvedValue({ id: 'r1', firstName: 'Awa' } as never);
    prismaMock.saleOrder.create.mockResolvedValue({ id: 'o1' } as never);
    prismaMock.saleOrder.findFirst.mockResolvedValue(
      orderRow('o1', { status: 'TO_CONFIRM' }) as never,
    );
  });

  it('manual order finds the client by normalized number', async () => {
    const res = await create(body);
    expect(res.status).toBe(201);
    expect((await res.json()).order).toMatchObject({
      id: 'o1',
      status: 'TO_CONFIRM',
      unitPrice: 6000,
      totalAmount: 72_000,
      client: { id: 'r1' },
    });
    // « 77 123 45 12 » in a Senegalese shop is the client already under +221771234512.
    expect(prismaMock.respondent.upsert.mock.calls[0]![0]!.where).toEqual({
      organizationId_phoneE164: { organizationId: 'org_1', phoneE164: '+221771234512' },
    });
    expect(prismaMock.saleOrder.create.mock.calls[0]![0]!.data).toMatchObject({
      organizationId: 'org_1',
      respondentId: 'r1',
      unitPrice: 6000,
      totalAmount: 72_000,
      status: 'TO_CONFIRM',
    });
  });

  it('takes the shop from the address, never from the body', async () => {
    await create({ ...body, organizationId: 'org_2' });
    expect(prismaMock.product.findFirst.mock.calls[0]![0]!.where).toEqual({
      id: 'prod_1',
      organizationId: 'org_1',
    });
    expect(prismaMock.saleOrder.create.mock.calls[0]![0]!.data).toMatchObject({
      organizationId: 'org_1',
    });
  });

  it('a product, a campaign or a zone of another shop is a 404 with its code', async () => {
    prismaMock.product.findFirst.mockResolvedValueOnce(null);
    let res = await create(body);
    expect([res.status, await errorOf(res)]).toEqual([404, 'PRODUCT_NOT_FOUND']);
    prismaMock.campaign.findFirst.mockResolvedValueOnce(null);
    res = await create(body);
    expect([res.status, await errorOf(res)]).toEqual([404, 'CAMPAIGN_NOT_FOUND']);
    prismaMock.deliveryZone.findFirst.mockResolvedValueOnce(null);
    res = await create(body);
    expect([res.status, await errorOf(res)]).toEqual([404, 'ZONE_NOT_FOUND']);
    expect(prismaMock.saleOrder.create).not.toHaveBeenCalled();
  });

  it('400 INVALID_PHONE on a number that is not one', async () => {
    const res = await create({ ...body, phone: '12345' });
    expect([res.status, await errorOf(res)]).toEqual([400, 'INVALID_PHONE']);
  });

  it('400 on an invalid body', async () => {
    for (const bad of [
      { ...body, quantity: 0 },
      { ...body, quantity: 100_001 },
      { ...body, firstName: '' },
      { ...body, firstName: 'A'.repeat(41) },
      { ...body, buyerType: 'WHOLESALER' },
      { ...body, fulfillment: 'POST' },
      { productId: 'prod_1' },
      'not json',
    ]) {
      const res = await create(bad);
      expect(res.status).toBe(400);
      expect(await errorOf(res)).toBe('VALIDATION_FAILED');
    }
    expect(prismaMock.saleOrder.create).not.toHaveBeenCalled();
  });

  it('403 without the CSRF token', async () => {
    const res = await create(body, false);
    expect(res.status).toBe(403);
    expect(prismaMock.saleOrder.create).not.toHaveBeenCalled();
  });

  it('is open to a MEMBER and 404 to a non-member', async () => {
    asMember('org_1', 'MEMBER');
    expect((await create(body)).status).toBe(201);
    asNonMember();
    expect((await create(body)).status).toBe(404);
  });
});
