// GET /api/shops/[orgId]/exports/file (Tamani lot 6b).
import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies, __cookieStore } from '@/test-utils/mock-cookies';
import { describe, it, expect, beforeEach } from 'vitest';
import { apiRequest, asMember, routeParams, signIn } from '@/test-utils/shop-fixtures';

mockNextCookies();

import { GET } from './route';

const params = routeParams({ orgId: 'org_1' });
const url = (qs: string) => `/api/shops/org_1/exports/file?${qs}`;
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
  deliveryPlace: null,
  completedAt: new Date('2026-10-26T10:00:00Z'),
  zone: null,
  link: null,
  respondent: { firstName: 'Awa', phoneE164: '+221771234512', anonymizedAt: null },
  campaign: { product: { name: 'Riz' } },
};

beforeEach(async () => {
  __cookieStore.clear();
  await signIn();
  asMember('org_1', 'MEMBER');
  prismaMock.subscription.findUnique.mockResolvedValue(pro as never);
  prismaMock.campaign.findFirst.mockResolvedValue({ id: 'c1', title: 'Riz' } as never);
  prismaMock.response.findMany.mockResolvedValue([answer] as never);
});

describe('GET …/exports/file', () => {
  it('sends a Pro shop the filtered CSV file', async () => {
    const res = await GET(apiRequest(url('quoi=reponses&reponse=oui&campagne=c1')), params);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/csv; charset=utf-8');
    expect(res.headers.get('content-disposition')).toMatch(
      /^attachment; filename="tamani-interesses-riz-\d{4}-\d{2}-\d{2}\.csv"$/,
    );
    expect((await res.text()).split('\r\n')[1]).toContain(
      ";Riz;Awa;'+221 77 123 45 12;Sénégal;Oui;",
    );
  });

  it('is a Pro feature: 403 PLAN_FEATURE_LOCKED on the free plan', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(null);
    const res = await GET(apiRequest(url('')), params);
    expect(res.status).toBe(403);
    expect(((await res.json()) as { error: string }).error).toBe('PLAN_FEATURE_LOCKED');
    expect(prismaMock.response.findMany).not.toHaveBeenCalled();
  });

  it('answers 400, then 404 for a campaign of another shop', async () => {
    expect((await GET(apiRequest(url('quoi=tout')), params)).status).toBe(400);
    prismaMock.campaign.findFirst.mockResolvedValue(null);
    expect((await GET(apiRequest(url('campagne=c9')), params)).status).toBe(404);
  });
});
