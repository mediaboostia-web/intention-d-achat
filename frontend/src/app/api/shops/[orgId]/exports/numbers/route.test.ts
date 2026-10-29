// GET /api/shops/[orgId]/exports/numbers (Tamani lot 6b).
import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies, __cookieStore } from '@/test-utils/mock-cookies';
import { describe, it, expect, beforeEach } from 'vitest';
import { apiRequest, asMember, routeParams, signIn } from '@/test-utils/shop-fixtures';

mockNextCookies();

import { GET } from './route';

const params = routeParams({ orgId: 'org_1' });
const url = (qs: string) => `/api/shops/org_1/exports/numbers?${qs}`;
const now = new Date();
const pro = {
  plan: 'MONTH',
  currentPeriodEnd: new Date(now.getTime() + 20 * 86_400_000),
  graceUntil: new Date(now.getTime() + 25 * 86_400_000),
};

beforeEach(async () => {
  __cookieStore.clear();
  await signIn();
  asMember('org_1', 'MEMBER');
  prismaMock.subscription.findUnique.mockResolvedValue(pro as never);
  prismaMock.response.findMany.mockResolvedValue([
    { respondent: { phoneE164: '+221771234512' } },
    { respondent: { phoneE164: '+221771234512' } },
  ] as never);
});

describe('GET …/exports/numbers', () => {
  it('gives a Pro shop each number once', async () => {
    const res = await GET(apiRequest(url('quoi=reponses&reponse=non')), params);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ numbers: ['+221 77 123 45 12'] });
  });

  it('is a Pro feature: 403 PLAN_FEATURE_LOCKED on the free plan', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(null);
    const res = await GET(apiRequest(url('')), params);
    expect(res.status).toBe(403);
    expect(prismaMock.response.findMany).not.toHaveBeenCalled();
  });

  it('answers 400 to a filter it does not know', async () => {
    expect((await GET(apiRequest(url('periode=demain')), params)).status).toBe(400);
  });
});
