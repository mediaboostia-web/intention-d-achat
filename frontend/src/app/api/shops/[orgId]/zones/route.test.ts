// Delivery zones under /api/shops/[orgId]/zones (Tamani lot 3).
import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies, __cookieStore } from '@/test-utils/mock-cookies';
import { describe, it, expect, beforeEach } from 'vitest';
import { apiRequest, asMember, routeParams, signIn } from '@/test-utils/shop-fixtures';

mockNextCookies();

import { GET, POST } from './route';
import { PATCH, DELETE } from './[zoneId]/route';

const zone = (id: string, name: string, sortOrder = 0) => ({
  id,
  organizationId: 'org_1',
  name,
  sortOrder,
  createdAt: new Date(),
  updatedAt: new Date(),
});
const shop = routeParams({ orgId: 'org_1' });
const zoneX = routeParams({ orgId: 'org_1', zoneId: 'zone_x' });
const errorOf = async (res: Response) => ((await res.json()) as { error: string }).error;
const duplicate = () =>
  Object.assign(new Error('Unique'), {
    code: 'P2002',
    meta: { target: ['organizationId', 'name'] },
  });

beforeEach(async () => {
  __cookieStore.clear();
  await signIn();
  asMember('org_1');
});

describe('GET|POST /api/shops/[orgId]/zones', () => {
  it('lists zones by sortOrder then name', async () => {
    prismaMock.deliveryZone.findMany.mockResolvedValue([
      zone('z1', 'Médina'),
      zone('z2', 'Plateau'),
    ]);
    const res = await GET(apiRequest('/api/shops/org_1/zones'), shop);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      items: [
        { id: 'z1', name: 'Médina', sortOrder: 0 },
        { id: 'z2', name: 'Plateau', sortOrder: 0 },
      ],
    });
    expect(prismaMock.deliveryZone.findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org_1' },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  });

  it('creates a zone', async () => {
    prismaMock.deliveryZone.create.mockResolvedValue(zone('z3', 'Parcelles', 2));
    const res = await POST(
      apiRequest('/api/shops/org_1/zones', {
        method: 'POST',
        body: { name: ' Parcelles ', sortOrder: 2 },
      }),
      shop,
    );
    expect(res.status).toBe(201);
    expect(prismaMock.deliveryZone.create).toHaveBeenCalledWith({
      data: { organizationId: 'org_1', name: 'Parcelles', sortOrder: 2 },
    });
  });

  it('returns 409 ZONE_ALREADY_EXISTS on a duplicate name', async () => {
    prismaMock.deliveryZone.create.mockRejectedValue(duplicate());
    const res = await POST(
      apiRequest('/api/shops/org_1/zones', { method: 'POST', body: { name: 'Médina' } }),
      shop,
    );
    expect(res.status).toBe(409);
    expect(await errorOf(res)).toBe('ZONE_ALREADY_EXISTS');
  });

  it('requires ADMIN to create a zone', async () => {
    asMember('org_1', 'MEMBER');
    const res = await POST(
      apiRequest('/api/shops/org_1/zones', { method: 'POST', body: { name: 'Médina' } }),
      shop,
    );
    expect(res.status).toBe(403);
    expect(prismaMock.deliveryZone.create).not.toHaveBeenCalled();
  });
});

describe('PATCH|DELETE /api/shops/[orgId]/zones/[zoneId]', () => {
  it('returns 404 ZONE_NOT_FOUND for a zone of another shop', async () => {
    prismaMock.deliveryZone.findFirst.mockResolvedValue(null);
    const res = await PATCH(
      apiRequest('/api/shops/org_1/zones/zone_x', { method: 'PATCH', body: { name: 'Fann' } }),
      zoneX,
    );
    expect(res.status).toBe(404);
    expect(await errorOf(res)).toBe('ZONE_NOT_FOUND');
    expect(prismaMock.deliveryZone.findFirst).toHaveBeenCalledWith({
      where: { id: 'zone_x', organizationId: 'org_1' },
    });
    expect(prismaMock.deliveryZone.update).not.toHaveBeenCalled();
  });

  it('renames a zone of the shop', async () => {
    prismaMock.deliveryZone.findFirst.mockResolvedValue(zone('zone_x', 'Fan'));
    prismaMock.deliveryZone.update.mockResolvedValue(zone('zone_x', 'Fann'));
    const res = await PATCH(
      apiRequest('/api/shops/org_1/zones/zone_x', { method: 'PATCH', body: { name: 'Fann' } }),
      zoneX,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ zone: { id: 'zone_x', name: 'Fann', sortOrder: 0 } });
  });

  it('deletes within the shop only', async () => {
    prismaMock.deliveryZone.deleteMany.mockResolvedValueOnce({ count: 1 });
    const res = await DELETE(
      apiRequest('/api/shops/org_1/zones/zone_x', { method: 'DELETE' }),
      zoneX,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: true });
    expect(prismaMock.deliveryZone.deleteMany).toHaveBeenCalledWith({
      where: { id: 'zone_x', organizationId: 'org_1' },
    });

    prismaMock.deliveryZone.deleteMany.mockResolvedValueOnce({ count: 0 });
    const gone = await DELETE(
      apiRequest('/api/shops/org_1/zones/zone_x', { method: 'DELETE' }),
      zoneX,
    );
    expect(gone.status).toBe(404);
  });
});
