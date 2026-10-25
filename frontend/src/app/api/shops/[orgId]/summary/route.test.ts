// GET /api/shops/[orgId]/summary (Tamani lot 5b home page).
import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies, __cookieStore } from '@/test-utils/mock-cookies';
import { describe, it, expect, beforeEach } from 'vitest';
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

  it('a non-member gets 404', async () => {
    asNonMember();
    const res = await GET(apiRequest('/api/shops/org_1/summary'), params);
    expect(res.status).toBe(404);
    expect(prismaMock.response.count).not.toHaveBeenCalled();
  });
});
