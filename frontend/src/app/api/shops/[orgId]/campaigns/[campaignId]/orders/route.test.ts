// GET /api/shops/[orgId]/campaigns/[campaignId]/orders (Tamani lot 7):
// the campaign's orders and its quantities against the stock.
import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies, __cookieStore } from '@/test-utils/mock-cookies';
import { describe, it, expect, beforeEach, type Mock } from 'vitest';
import { apiRequest, asMember, asNonMember, routeParams, signIn } from '@/test-utils/shop-fixtures';

mockNextCookies();

import { GET } from './route';

const params = routeParams({ orgId: 'org_1', campaignId: 'camp_1' });
/** Prisma's groupBy overloads defeat the deep mock's types (as in home-bulletin.test.ts). */
const groupBy = () => prismaMock.saleOrder.groupBy as unknown as Mock;

const url = '/api/shops/org_1/campaigns/camp_1/orders';
const errorOf = async (res: Response) => ((await res.json()) as { error: string }).error;

beforeEach(async () => {
  __cookieStore.clear();
  await signIn();
  asMember('org_1', 'MEMBER');
  prismaMock.subscription.findUnique.mockResolvedValue(null);
  prismaMock.campaign.findFirst.mockResolvedValue({ stockQuantity: 30 } as never);
  groupBy().mockResolvedValue([
    { status: 'CONFIRMED', _sum: { quantity: 12 } },
    { status: 'FULFILLED', _sum: { quantity: 8 } },
    { status: 'TO_CONFIRM', _sum: { quantity: 5 } },
  ] as never);
  prismaMock.saleOrder.findMany.mockResolvedValue([
    {
      id: 'o1',
      status: 'CONFIRMED',
      paid: true,
      paidAt: new Date('2026-10-27T12:00:00Z'),
      createdAt: new Date('2026-10-27T10:00:00Z'),
      quantity: 12,
      unitPrice: 6000,
      totalAmount: 72_000,
      fulfillment: 'PICKUP',
      zoneId: null,
      productId: 'prod_1',
      campaignId: 'camp_1',
      responseId: 'resp_1',
      buyerType: 'RESELLER',
      notes: null,
      zone: null,
      product: { name: 'Marmites inox 5 L', unitLabel: 'pièce' },
      campaign: { title: 'Marmites' },
      respondent: { id: 'r1', firstName: 'Awa', phoneE164: '+221771234512', anonymizedAt: null },
    },
  ] as never);
});

describe('GET …/campaigns/[campaignId]/orders', () => {
  it('sends the campaign orders and stockLeft = 30 − (confirmées + livrées)', async () => {
    const res = await GET(apiRequest(url), params);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.summary).toEqual({ confirmed: 12, fulfilled: 8, toConfirm: 5, stockLeft: 10 });
    expect(json.items.map((o: { id: string }) => o.id)).toEqual(['o1']);
    expect(json.nextCursor).toBeNull();
    expect(prismaMock.saleOrder.findMany.mock.calls[0]![0]!.where).toMatchObject({
      organizationId: 'org_1',
      campaignId: 'camp_1',
    });
    expect(prismaMock.campaign.findFirst.mock.calls[0]![0]!.where).toEqual({
      id: 'camp_1',
      organizationId: 'org_1',
    });
  });

  it('CAMPAIGN_NOT_FOUND for a campaign of another shop', async () => {
    prismaMock.campaign.findFirst.mockResolvedValue(null);
    const res = await GET(apiRequest(url), params);
    expect([res.status, await errorOf(res)]).toEqual([404, 'CAMPAIGN_NOT_FOUND']);
    expect(prismaMock.saleOrder.findMany).not.toHaveBeenCalled();
  });

  it('is 404 to a non-member', async () => {
    asNonMember();
    expect((await GET(apiRequest(url), params)).status).toBe(404);
  });
});
