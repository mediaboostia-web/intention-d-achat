// GET /api/shops/[orgId]/campaigns/[campaignId]/export (Tamani lot 6).
import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies, __cookieStore } from '@/test-utils/mock-cookies';
import { describe, it, expect, beforeEach } from 'vitest';
import { apiRequest, asMember, asNonMember, routeParams, signIn } from '@/test-utils/shop-fixtures';

mockNextCookies();

import { GET } from './route';

const params = routeParams({ orgId: 'org_1', campaignId: 'c1' });
const url = '/api/shops/org_1/campaigns/c1/export';
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
  prismaMock.subscription.findUnique.mockResolvedValue(pro as never);
  prismaMock.campaign.findFirst.mockResolvedValue({ id: 'c1', title: 'Marmites inox' } as never);
  prismaMock.response.findMany.mockResolvedValue([answer] as never);
});

describe('GET …/export', () => {
  it('sends a Pro shop an Excel-ready CSV file', async () => {
    const res = await GET(apiRequest(url), params);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/csv; charset=utf-8');
    expect(res.headers.get('content-disposition')).toMatch(
      /^attachment; filename="tamani-marmites-inox-\d{4}-\d{2}-\d{2}\.csv"$/,
    );
    const text = await res.text();
    expect(text.split('\r\n')[1]).toContain(";Awa;'+221 77 123 45 12;Sénégal;Oui;Usager;2;");
    expect(prismaMock.response.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          campaignId: 'c1',
          organizationId: 'org_1',
          completedAt: { not: null },
          locked: false,
          suspicious: false,
        },
        take: 20000,
      }),
    );
  });

  it('is a Pro feature: 403 PLAN_FEATURE_LOCKED on the free plan', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(null);
    const res = await GET(apiRequest(url), params);
    expect(res.status).toBe(403);
    expect(((await res.json()) as { error: string }).error).toBe('PLAN_FEATURE_LOCKED');
    expect(prismaMock.response.findMany).not.toHaveBeenCalled();
  });

  it('answers 404 for a campaign of another shop', async () => {
    prismaMock.campaign.findFirst.mockResolvedValue(null);
    const res = await GET(apiRequest(url), params);
    expect(res.status).toBe(404);
    expect(prismaMock.campaign.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'c1', organizationId: 'org_1' } }),
    );
  });

  it('answers 404 to a non-member', async () => {
    asNonMember();
    const res = await GET(apiRequest(url), params);
    expect(res.status).toBe(404);
  });
});
