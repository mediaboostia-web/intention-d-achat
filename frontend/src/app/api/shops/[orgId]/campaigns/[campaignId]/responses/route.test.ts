// GET …/campaigns/[campaignId]/responses and …/responses/numbers (Tamani lot 6).
import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies, __cookieStore } from '@/test-utils/mock-cookies';
import { describe, it, expect, beforeEach } from 'vitest';
import { apiRequest, asMember, asNonMember, routeParams, signIn } from '@/test-utils/shop-fixtures';
import type { InterestedPage } from '@/lib/tamani/results-view';

mockNextCookies();

import { GET } from './route';
import { GET as GET_NUMBERS } from './numbers/route';

const params = routeParams({ orgId: 'org_1', campaignId: 'c1' });
const base = '/api/shops/org_1/campaigns/c1/responses';
const now = new Date();
const pro = {
  plan: 'PRO',
  currentPeriodEnd: new Date(now.getTime() + 20 * 86_400_000),
  graceUntil: new Date(now.getTime() + 25 * 86_400_000),
};
const answer = {
  id: 'a1',
  respondentId: 'r1',
  interested: true,
  notInterestedReason: null,
  buyerType: 'CONSUMER',
  quantity: 2,
  option: null,
  timing: null,
  wantsDelivery: null,
  completedAt: new Date('2026-10-26T10:00:00Z'),
  zone: null,
  link: null,
  respondent: { firstName: 'Awa', phoneE164: '+221771234512', anonymizedAt: null },
};

beforeEach(async () => {
  __cookieStore.clear();
  await signIn();
  asMember('org_1', 'MEMBER');
  prismaMock.campaign.findFirst.mockResolvedValue({ id: 'c1' } as never);
  prismaMock.subscription.findUnique.mockResolvedValue(null);
  prismaMock.response.findMany.mockResolvedValue([answer] as never);
  prismaMock.response.count.mockResolvedValue(1);
});

describe('GET …/responses', () => {
  it('lists the interested of a Pro shop with their numbers', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(pro as never);
    const res = await GET(apiRequest(base), params);
    expect(res.status).toBe(200);
    const body = (await res.json()) as InterestedPage;
    expect(body.items[0]).toMatchObject({ firstName: 'Awa', phoneE164: '+221771234512' });
    expect(body.counts).toEqual({ yes: 1, no: 1 });
  });

  it('masks every number on the free plan', async () => {
    const res = await GET(apiRequest(`${base}?filtre=oui`), params);
    const body = (await res.json()) as InterestedPage;
    expect(body.items[0]).toMatchObject({ phone: '77 •• •• 12', phoneE164: null });
    expect(JSON.stringify(body)).not.toContain('771234512');
  });

  it('refuses an unknown filter', async () => {
    const res = await GET(apiRequest(`${base}?filtre=peut-etre`), params);
    expect(res.status).toBe(400);
  });

  it('answers 404 CAMPAIGN_NOT_FOUND for a campaign of another shop', async () => {
    prismaMock.campaign.findFirst.mockResolvedValue(null);
    const res = await GET(apiRequest(base), params);
    expect(res.status).toBe(404);
    expect(((await res.json()) as { error: string }).error).toBe('CAMPAIGN_NOT_FOUND');
    expect(prismaMock.campaign.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'c1', organizationId: 'org_1' } }),
    );
    expect(prismaMock.response.findMany).not.toHaveBeenCalled();
  });

  it('answers 404 to a non-member', async () => {
    asNonMember();
    const res = await GET(apiRequest(base), params);
    expect(res.status).toBe(404);
    expect(prismaMock.campaign.findFirst).not.toHaveBeenCalled();
  });
});

describe('GET …/responses/numbers', () => {
  it('gives a Pro shop the interested numbers', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(pro as never);
    prismaMock.response.findMany.mockResolvedValue([
      { respondent: { phoneE164: '+221771234512' } },
    ] as never);
    const res = await GET_NUMBERS(apiRequest(`${base}/numbers`), params);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ numbers: ['+221 77 123 45 12'] });
  });

  it('is a Pro feature: 403 PLAN_FEATURE_LOCKED on the free plan', async () => {
    const res = await GET_NUMBERS(apiRequest(`${base}/numbers`), params);
    expect(res.status).toBe(403);
    expect(((await res.json()) as { error: string }).error).toBe('PLAN_FEATURE_LOCKED');
    expect(prismaMock.response.findMany).not.toHaveBeenCalled();
  });

  it('answers 404 for a campaign of another shop', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(pro as never);
    prismaMock.campaign.findFirst.mockResolvedValue(null);
    const res = await GET_NUMBERS(apiRequest(`${base}/numbers`), params);
    expect(res.status).toBe(404);
  });
});
