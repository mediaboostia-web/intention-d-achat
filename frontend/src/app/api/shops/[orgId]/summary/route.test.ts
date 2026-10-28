// GET /api/shops/[orgId]/summary (Tamani lot 5b home page).
import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies, __cookieStore } from '@/test-utils/mock-cookies';
import { describe, it, expect, beforeEach, type Mock } from 'vitest';
import { apiRequest, asMember, asNonMember, routeParams, signIn } from '@/test-utils/shop-fixtures';

mockNextCookies();

import { GET } from './route';

const params = routeParams({ orgId: 'org_1' });

beforeEach(async () => {
  __cookieStore.clear();
  await signIn();
  asMember('org_1', 'MEMBER');
  prismaMock.response.count.mockResolvedValue(3);
  prismaMock.respondent.count.mockResolvedValue(1);
  prismaMock.response.findMany.mockResolvedValue([]);
  prismaMock.respondent.findMany.mockResolvedValue([]);
  prismaMock.campaign.findMany.mockResolvedValue([]);
  prismaMock.campaign.count.mockResolvedValue(1);
  prismaMock.product.count.mockResolvedValue(1);
  prismaMock.campaign.findFirst.mockResolvedValue(null);
  prismaMock.campaignLink.aggregate.mockResolvedValue({ _sum: { openCount: 12 } } as never);
  // The bulletin counts the orders to confirm and to deliver (lot 7).
  (prismaMock.saleOrder.groupBy as unknown as Mock).mockResolvedValue([]);
});

describe('GET /api/shops/[orgId]/summary', () => {
  it('members read the summary', async () => {
    const res = await GET(apiRequest('/api/shops/org_1/summary'), params);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      summary: { week: { completed: number; opensRunning: number } };
    };
    expect(body.summary.week).toMatchObject({ completed: 3, opensRunning: 12 });
  });

  it('sends the bulletin, with the offered verdict only on the free plan', async () => {
    prismaMock.organization.findFirst.mockResolvedValue({
      coefConsumer: 0.5,
      coefReseller: 0.7,
      freeVerdictCampaignId: 'c1',
      subscription: null,
    } as never);
    const running = (id: string) => ({
      id,
      title: `Campagne ${id}`,
      status: 'ACTIVE',
      endsAt: null,
      createdAt: new Date(),
      arrivedAt: null,
      plannedQuantity: 200,
      stockQuantity: null,
      product: { unitLabel: 'sac', costPrice: null, unitPrice: 18000, wholesalePrice: null },
    });
    prismaMock.campaign.findMany.mockResolvedValue([running('c2'), running('c1')] as never);
    (prismaMock.response.groupBy as unknown as Mock).mockImplementation(((args: { by: string[] }) =>
      Promise.resolve(
        args.by.includes('buyerType')
          ? [
              {
                campaignId: 'c1',
                buyerType: 'RESELLER',
                _count: { _all: 25 },
                _sum: { quantity: 260 },
              },
            ]
          : [
              { campaignId: 'c1', _count: { _all: 25 } },
              { campaignId: 'c2', _count: { _all: 22 } },
            ],
      )) as never);
    const res = await GET(apiRequest('/api/shops/org_1/summary'), params);
    const { summary } = (await res.json()) as {
      summary: { campaigns: Array<{ id: string; verdict: string | null; offered: boolean }> };
    };
    expect(summary.campaigns.map((c) => [c.id, c.verdict, c.offered])).toEqual([
      ['c2', null, false],
      ['c1', 'GO', true],
    ]);
  });

  it('a non-member gets 404', async () => {
    asNonMember();
    const res = await GET(apiRequest('/api/shops/org_1/summary'), params);
    expect(res.status).toBe(404);
    expect(prismaMock.response.count).not.toHaveBeenCalled();
  });
});
