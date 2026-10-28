// GET /api/shops/[orgId]/exports/preview (Tamani lot 6b).
import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies, __cookieStore } from '@/test-utils/mock-cookies';
import { describe, it, expect, beforeEach } from 'vitest';
import { apiRequest, asMember, asNonMember, routeParams, signIn } from '@/test-utils/shop-fixtures';

mockNextCookies();

import { GET } from './route';

const params = routeParams({ orgId: 'org_1' });
const url = (qs: string) => `/api/shops/org_1/exports/preview?${qs}`;
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
  // No subscription: the free plan.
  prismaMock.subscription.findUnique.mockResolvedValue(null);
  prismaMock.campaign.findFirst.mockResolvedValue({ id: 'c1', title: 'Riz' } as never);
  prismaMock.response.findMany.mockResolvedValue([answer] as never);
  prismaMock.response.count.mockResolvedValue(1);
});

describe('GET …/exports/preview', () => {
  it('shows the free plan its rows, numbers masked', async () => {
    const res = await GET(apiRequest(url('quoi=reponses&reponse=oui&campagne=c1')), params);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { total: number; headers: string[]; rows: string[][] };
    expect(body.total).toBe(1);
    expect(body.headers[1]).toBe('Produit');
    expect(body.rows[0]?.[2]).toBe('Awa');
    expect(JSON.stringify(body)).not.toContain('123 45');
  });

  it('answers 400 to a filter it does not know', async () => {
    const res = await GET(apiRequest(url('reponse=peut-etre')), params);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe('VALIDATION_FAILED');
  });

  it('answers 404 for a campaign of another shop', async () => {
    prismaMock.campaign.findFirst.mockResolvedValue(null);
    const res = await GET(apiRequest(url('campagne=c9')), params);
    expect(res.status).toBe(404);
    expect(((await res.json()) as { error: string }).error).toBe('CAMPAIGN_NOT_FOUND');
    expect(prismaMock.campaign.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'c9', organizationId: 'org_1' } }),
    );
    expect(prismaMock.response.findMany).not.toHaveBeenCalled();
  });

  it('answers 404 for a zone of another shop', async () => {
    prismaMock.deliveryZone.findFirst.mockResolvedValue(null);
    const res = await GET(apiRequest(url('quartier=z9')), params);
    expect(res.status).toBe(404);
    expect(((await res.json()) as { error: string }).error).toBe('ZONE_NOT_FOUND');
    expect(prismaMock.deliveryZone.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'z9', organizationId: 'org_1' } }),
    );
  });

  it('answers 404 to a non-member', async () => {
    asNonMember();
    const res = await GET(apiRequest(url('')), params);
    expect(res.status).toBe(404);
  });
});
