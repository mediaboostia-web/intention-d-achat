// GET /api/shops/[orgId]/products/units (lot 5b): the units the shop already uses.
import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies, __cookieStore } from '@/test-utils/mock-cookies';
import { describe, it, expect, beforeEach } from 'vitest';
import { apiRequest, asMember, asNonMember, routeParams, signIn } from '@/test-utils/shop-fixtures';

mockNextCookies();

import { GET } from './route';

const shop = routeParams({ orgId: 'org_1' });

beforeEach(async () => {
  __cookieStore.clear();
  await signIn();
  asMember('org_1', 'MEMBER');
});

describe('GET /api/shops/[orgId]/products/units', () => {
  it("lists the shop's distinct units", async () => {
    prismaMock.product.findMany.mockResolvedValue([
      { unitLabel: 'carton' },
      { unitLabel: 'bidon de 20 L' },
    ] as never);
    const res = await GET(apiRequest('/api/shops/org_1/products/units'), shop);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ units: ['carton', 'bidon de 20 L'] });
    expect(prismaMock.product.findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org_1' },
      distinct: ['unitLabel'],
      select: { unitLabel: true },
      orderBy: { unitLabel: 'asc' },
      take: 50,
    });
  });

  it('a non-member gets 404', async () => {
    asNonMember();
    const res = await GET(apiRequest('/api/shops/org_1/products/units'), shop);
    expect(res.status).toBe(404);
    expect(prismaMock.product.findMany).not.toHaveBeenCalled();
  });
});
