// GET /api/shops/[orgId]/campaigns/[campaignId]/stats (Tamani lot 6).
import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies, __cookieStore } from '@/test-utils/mock-cookies';
import { describe, it, expect, beforeEach } from 'vitest';
import { apiRequest, asMember, asNonMember, routeParams, signIn } from '@/test-utils/shop-fixtures';
import type { CampaignStatsBody } from '@/lib/tamani/results-view';

mockNextCookies();

import { GET } from './route';

const params = routeParams({ orgId: 'org_1', campaignId: 'c1' });
const url = '/api/shops/org_1/campaigns/c1/stats';
const now = new Date();
const pro = {
  plan: 'PRO',
  currentPeriodEnd: new Date(now.getTime() + 20 * 86_400_000),
  graceUntil: new Date(now.getTime() + 25 * 86_400_000),
};

const campaign = {
  id: 'c1',
  createdAt: new Date('2026-10-01T00:00:00Z'),
  availability: 'INCOMING',
  plannedQuantity: 400,
  stockQuantity: null,
  product: { costPrice: 6000, unitPrice: 7500, wholesalePrice: 6500 },
  links: [{ id: 'l1', label: 'Lien principal', openCount: 90, isDefault: true }],
};

const answer = {
  completedAt: new Date('2026-10-26T10:00:00Z'),
  locked: false,
  suspicious: false,
  interested: true,
  notInterestedReason: null,
  buyerType: 'RESELLER',
  quantity: 15,
  option: null,
  timing: null,
  wantsDelivery: null,
  zoneId: null,
  linkId: 'l1',
};
const answers = (n: number) => Array.from({ length: n }, () => answer);

function shop(over: object = {}) {
  return {
    coefConsumer: 0.5,
    coefReseller: 0.7,
    freeVerdictCampaignId: null,
    subscription: null,
    ...over,
  };
}

/** The yes answers of the shop's finished campaigns, read to learn its coefficients. */
let learning: unknown[] = [];

beforeEach(async () => {
  __cookieStore.clear();
  await signIn();
  asMember('org_1', 'MEMBER');
  learning = [];
  prismaMock.campaign.findFirst.mockResolvedValue(campaign as never);
  prismaMock.deliveryZone.findMany.mockResolvedValue([]);
  prismaMock.response.findMany.mockImplementation(((args: { where: { campaignId?: string } }) =>
    Promise.resolve(args.where.campaignId ? answers(20) : learning)) as never);
  prismaMock.organization.findFirst.mockResolvedValue(shop({ subscription: pro }) as never);
});

async function read(): Promise<{ status: number; body: CampaignStatsBody }> {
  const res = await GET(apiRequest(url), params);
  return { status: res.status, body: (await res.json()) as CampaignStatsBody };
}

describe('GET /api/shops/[orgId]/campaigns/[campaignId]/stats', () => {
  it('gives a Pro shop its figures and its verdict', async () => {
    const { status, body } = await read();
    expect(status).toBe(200);
    expect(body.access).toBe('PLAN');
    expect(body.stats).toMatchObject({ opens: 90, completed: 20, announced: 300 });
    expect(body.stats.result?.verdict.code).toBe('CAUTION');
    expect(prismaMock.response.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { campaignId: 'c1', organizationId: 'org_1' } }),
    );
  });

  it('tells an in-stock campaign apart and reads its stock', async () => {
    prismaMock.campaign.findFirst.mockResolvedValue({
      ...campaign,
      availability: 'IN_STOCK',
      plannedQuantity: null,
      stockQuantity: 500,
    } as never);
    const { body } = await read();
    expect(body.stats.availability).toBe('IN_STOCK');
    expect(body.stats.result?.stockAdvice).toMatchObject({ status: 'ENOUGH', provisional: false });
  });

  it('a Pro shop estimates with the coefficients learned from its orders', async () => {
    prismaMock.organization.findFirst.mockResolvedValue(
      shop({ subscription: pro, coefConsumer: 0.6 }) as never,
    );
    // 20 reseller yes answers on 2 finished campaigns: 160 bought for 200 announced.
    learning = Array.from({ length: 20 }, (_, i) => ({
      buyerType: 'RESELLER',
      campaignId: i % 2 ? 'c_old1' : 'c_old2',
      quantity: 10,
      order: i < 16 ? { status: 'FULFILLED', quantity: 10 } : null,
    }));
    const { body } = await read();
    expect(body.stats.result?.coefs).toEqual({
      consumer: 0.6,
      reseller: 0.8,
      source: { consumer: 'SHOP', reseller: 'LEARNED' },
    });
    // 300 announced by resellers × 0.8.
    expect(body.stats.result?.estimate.realistic).toBe(240);
    expect(prismaMock.response.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: 'org_1', interested: true }),
      }),
    );
  });

  it('a Pro shop without enough orders keeps its settings', async () => {
    const { body } = await read();
    expect(body.stats.result?.coefs.source).toEqual({ consumer: 'DEFAULT', reseller: 'DEFAULT' });
    expect(prismaMock.response.findMany).toHaveBeenCalledTimes(2);
  });

  it('the free plan never reads the orders, even with its offered verdict', async () => {
    prismaMock.organization.findFirst.mockResolvedValue(
      shop({ freeVerdictCampaignId: 'c1' }) as never,
    );
    const { body } = await read();
    expect(body.access).toBe('OFFERED');
    expect(body.stats.result?.coefs.source).toEqual({ consumer: 'DEFAULT', reseller: 'DEFAULT' });
    expect(prismaMock.response.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.response.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { campaignId: 'c1', organizationId: 'org_1' } }),
    );
    for (const read of [
      prismaMock.saleOrder.findMany,
      prismaMock.saleOrder.findFirst,
      prismaMock.saleOrder.count,
      prismaMock.saleOrder.groupBy,
      prismaMock.saleOrder.aggregate,
    ]) {
      expect(read).not.toHaveBeenCalled();
    }
  });

  it('answers 404 to a non-member', async () => {
    asNonMember();
    const res = await GET(apiRequest(url), params);
    expect(res.status).toBe(404);
    expect(prismaMock.campaign.findFirst).not.toHaveBeenCalled();
  });

  it('answers 404 CAMPAIGN_NOT_FOUND for a campaign of another shop', async () => {
    prismaMock.campaign.findFirst.mockResolvedValue(null);
    const res = await GET(apiRequest(url), params);
    expect(res.status).toBe(404);
    expect(((await res.json()) as { error: string }).error).toBe('CAMPAIGN_NOT_FOUND');
    expect(prismaMock.campaign.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'c1', organizationId: 'org_1' } }),
    );
  });

  it('hides the verdict from the free plan before its offered campaign', async () => {
    prismaMock.organization.findFirst.mockResolvedValue(shop() as never);
    prismaMock.response.findMany.mockResolvedValue(answers(5) as never);
    const { body } = await read();
    expect(body.access).toBe('LOCKED');
    expect(body.stats.result).toBeNull();
    expect(body.stats.announced).toBe(75);
    expect(body.offerOpen).toBe(true);
    expect(prismaMock.organization.updateMany).not.toHaveBeenCalled();
  });

  it('offers the free plan the verdict of its first campaign with 20 answers', async () => {
    prismaMock.organization.findFirst
      .mockResolvedValueOnce(shop() as never)
      .mockResolvedValueOnce({ freeVerdictCampaignId: 'c1' } as never);
    prismaMock.organization.updateMany.mockResolvedValue({ count: 1 });
    const { body } = await read();
    expect(body.access).toBe('OFFERED');
    expect(body.offerOpen).toBe(false);
    expect(body.stats.result?.verdict.code).toBe('CAUTION');
    expect(prismaMock.organization.updateMany).toHaveBeenCalledWith({
      where: { id: 'org_1', freeVerdictCampaignId: null },
      data: { freeVerdictCampaignId: 'c1' },
    });
  });

  it('keeps the verdict locked once another campaign was offered', async () => {
    prismaMock.organization.findFirst.mockResolvedValue(
      shop({ freeVerdictCampaignId: 'c_first' }) as never,
    );
    const { body } = await read();
    expect(body.access).toBe('LOCKED');
    expect(body.offerOpen).toBe(false);
    expect(body.stats.result).toBeNull();
    expect(prismaMock.organization.updateMany).not.toHaveBeenCalled();
  });
});
