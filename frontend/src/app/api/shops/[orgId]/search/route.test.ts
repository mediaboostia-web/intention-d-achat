// GET /api/shops/[orgId]/search (lot 7a): the top bar's search.
import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies, __cookieStore } from '@/test-utils/mock-cookies';
import { beforeEach, describe, expect, it } from 'vitest';
import { apiRequest, asMember, asNonMember, routeParams, signIn } from '@/test-utils/shop-fixtures';

mockNextCookies();

import { GET } from './route';

const params = routeParams({ orgId: 'org_1' });
const search = (q: string) =>
  GET(apiRequest(`/api/shops/org_1/search?q=${encodeURIComponent(q)}`), params);

beforeEach(async () => {
  __cookieStore.clear();
  await signIn();
  asMember('org_1', 'MEMBER');
  prismaMock.subscription.findUnique.mockResolvedValue(null);
  prismaMock.campaign.findMany.mockResolvedValue([]);
  prismaMock.product.findMany.mockResolvedValue([]);
  prismaMock.respondent.findMany.mockResolvedValue([]);
});

describe('GET /api/shops/[orgId]/search', () => {
  it('answers the three groups', async () => {
    prismaMock.product.findMany.mockResolvedValue([
      { id: 'p1', name: 'Huile 5 L', archivedAt: null, photos: [] },
    ] as never);
    const res = await search('huile');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      results: {
        campaigns: [],
        products: [{ id: 'p1', name: 'Huile 5 L', archived: false, photo: null }],
        clients: [],
      },
    });
  });

  it('refuses a search under 2 or over 60 characters', async () => {
    for (const q of ['', ' a ', 'a'.repeat(61)]) {
      const res = await search(q);
      expect(res.status, JSON.stringify(q)).toBe(400);
    }
    expect(prismaMock.campaign.findMany).not.toHaveBeenCalled();
  });

  it('is a 404 to someone outside the shop', async () => {
    asNonMember();
    const res = await search('huile');
    expect(res.status).toBe(404);
    expect(prismaMock.product.findMany).not.toHaveBeenCalled();
  });
});
