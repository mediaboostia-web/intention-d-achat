// POST /api/shops/[orgId]/campaigns/[campaignId]/responses/[responseId]/order
// (Tamani lot 7): « Transformer en commande », one order per answer.
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

import { POST } from './route';

const params = routeParams({ orgId: 'org_1', campaignId: 'camp_1', responseId: 'resp_1' });
const errorOf = async (res: Response) => ((await res.json()) as { error: string }).error;
const convert = (csrf = true) =>
  POST(
    apiRequest('/api/shops/org_1/campaigns/camp_1/responses/resp_1/order', {
      method: 'POST',
      csrf,
    }),
    params,
  );

const answer = (over: Record<string, unknown> = {}) => ({
  id: 'resp_1',
  campaignId: 'camp_1',
  respondentId: 'r1',
  interested: true,
  buyerType: 'RESELLER',
  quantity: 12,
  wantsDelivery: true,
  zoneId: 'zone_m',
  deliveryPlace: null,
  campaign: {
    productId: 'prod_1',
    product: { unitPrice: 7500, wholesalePrice: 6000, wholesaleMinQty: 12 },
  },
  order: null,
  ...over,
});

beforeEach(async () => {
  __cookieStore.clear();
  await signIn();
  asMember('org_1', 'MEMBER');
  runTransactionsInline();
  prismaMock.subscription.findUnique.mockResolvedValue(null);
  prismaMock.response.findFirst.mockResolvedValue(answer() as never);
  prismaMock.saleOrder.create.mockResolvedValue({ id: 'o1' } as never);
  prismaMock.saleOrder.findFirst.mockResolvedValue({
    id: 'o1',
    status: 'TO_CONFIRM',
    paid: false,
    paidAt: null,
    createdAt: new Date('2026-10-28T10:00:00Z'),
    quantity: 12,
    unitPrice: 6000,
    totalAmount: 72_000,
    fulfillment: 'DELIVERY',
    zoneId: 'zone_m',
    productId: 'prod_1',
    campaignId: 'camp_1',
    responseId: 'resp_1',
    buyerType: 'RESELLER',
    notes: null,
    zone: { name: 'Médina' },
    product: { name: 'Marmites inox 5 L', unitLabel: 'pièce' },
    campaign: { title: 'Marmites' },
    respondent: { id: 'r1', firstName: 'Awa', phoneE164: '+221771234512', anonymizedAt: null },
  } as never);
});

describe('POST …/responses/[responseId]/order', () => {
  it('turns the « Oui » into an order with the frozen price (201)', async () => {
    const res = await convert();
    expect(res.status).toBe(201);
    expect((await res.json()).order).toMatchObject({
      id: 'o1',
      status: 'TO_CONFIRM',
      responseId: 'resp_1',
      unitPrice: 6000,
      totalAmount: 72_000,
      // Free plan: the number stays masked.
      client: { phone: '77 •• •• 12', phoneE164: null },
    });
    expect(prismaMock.response.findFirst.mock.calls[0]![0]!.where).toEqual({
      id: 'resp_1',
      organizationId: 'org_1',
      campaignId: 'camp_1',
      completedAt: { not: null },
      locked: false,
      suspicious: false,
    });
    expect(prismaMock.saleOrder.create.mock.calls[0]![0]!.data).toMatchObject({
      organizationId: 'org_1',
      responseId: 'resp_1',
      unitPrice: 6000,
      totalAmount: 72_000,
    });
  });

  it('converting twice gives ORDER_ALREADY_EXISTS, also on P2002', async () => {
    prismaMock.response.findFirst.mockResolvedValue(answer({ order: { id: 'o1' } }) as never);
    let res = await convert();
    expect([res.status, await errorOf(res)]).toEqual([409, 'ORDER_ALREADY_EXISTS']);

    prismaMock.response.findFirst.mockResolvedValue(answer() as never);
    prismaMock.saleOrder.create.mockRejectedValue(
      Object.assign(new Error('Unique'), { code: 'P2002', meta: { target: ['responseId'] } }),
    );
    res = await convert();
    expect([res.status, await errorOf(res)]).toEqual([409, 'ORDER_ALREADY_EXISTS']);
  });

  it('a « Non » is 409 RESPONSE_NOT_INTERESTED', async () => {
    prismaMock.response.findFirst.mockResolvedValue(answer({ interested: false }) as never);
    const res = await convert();
    expect([res.status, await errorOf(res)]).toEqual([409, 'RESPONSE_NOT_INTERESTED']);
    expect(prismaMock.saleOrder.create).not.toHaveBeenCalled();
  });

  it('an answer of another shop, another campaign or not counted is 404 RESPONSE_NOT_FOUND', async () => {
    prismaMock.response.findFirst.mockResolvedValue(null);
    const res = await convert();
    expect([res.status, await errorOf(res)]).toEqual([404, 'RESPONSE_NOT_FOUND']);
    expect(prismaMock.saleOrder.create).not.toHaveBeenCalled();
  });

  it('403 without the CSRF token, 404 to a non-member', async () => {
    expect((await convert(false)).status).toBe(403);
    asNonMember();
    expect((await convert()).status).toBe(404);
    expect(prismaMock.saleOrder.create).not.toHaveBeenCalled();
  });
});
