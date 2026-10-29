// Products under /api/shops/[orgId]/products (Tamani lot 3).
import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies, __cookieStore } from '@/test-utils/mock-cookies';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  apiRequest,
  asMember,
  routeParams,
  runTransactionsInline,
  signIn,
} from '@/test-utils/shop-fixtures';
import { activeCampaignWhere } from '@/lib/server/tamani/campaign-status';

mockNextCookies();

import { GET, POST } from './route';
import { DELETE, GET as GET_ONE, PATCH } from './[productId]/route';

function product(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prod_1',
    organizationId: 'org_1',
    name: 'Marmites inox 5 L',
    description: null,
    unitLabel: 'pièce',
    unitPrice: 7500,
    wholesalePrice: 6000,
    wholesaleMinQty: 12,
    costPrice: 5000,
    photos: [],
    optionLabel: null,
    options: [],
    archivedAt: null,
    createdAt: new Date('2026-10-24T10:00:00Z'),
    updatedAt: new Date('2026-10-24T10:00:00Z'),
    ...overrides,
  };
}

const shop = routeParams({ orgId: 'org_1' });
const one = routeParams({ orgId: 'org_1', productId: 'prod_1' });
const errorOf = async (res: Response) => ((await res.json()) as { error: string }).error;
const create = (body: unknown) =>
  POST(apiRequest('/api/shops/org_1/products', { method: 'POST', body }), shop);
const valid = { name: 'Marmites inox 5 L', unitPrice: 7500 };

beforeEach(async () => {
  __cookieStore.clear();
  await signIn();
  asMember('org_1');
  // Creation runs under the shop-country lock (lot 7b).
  runTransactionsInline();
  prismaMock.product.create.mockImplementation((async (args: { data: object }) =>
    product(args.data as Record<string, unknown>)) as never);
});

describe('POST /api/shops/[orgId]/products', () => {
  it('creates a product with integer prices, in the shop of the URL', async () => {
    const res = await create({
      ...valid,
      wholesalePrice: 6000,
      wholesaleMinQty: 12,
      costPrice: 5000,
      organizationId: 'org_evil',
    });
    expect(res.status).toBe(201);
    const data = prismaMock.product.create.mock.calls[0]![0].data;
    expect(data).toMatchObject({
      organizationId: 'org_1',
      name: 'Marmites inox 5 L',
      unitLabel: 'pièce',
      unitPrice: 7500,
      wholesalePrice: 6000,
      wholesaleMinQty: 12,
      costPrice: 5000,
      photos: [],
      options: [],
    });
    expect(((await res.json()) as { product: { costPrice: number } }).product.costPrice).toBe(5000);
  });

  it.each([7500.5, '7500', '7 500', 0, -1])(
    'POST rejects decimal, string, zero and negative prices: %o',
    async (unitPrice) => {
      const res = await create({ ...valid, unitPrice });
      expect(res.status).toBe(400);
      expect(await errorOf(res)).toBe('VALIDATION_FAILED');
      expect(prismaMock.product.create).not.toHaveBeenCalled();
    },
  );

  it.each([{ wholesalePrice: 6000 }, { wholesaleMinQty: 12 }])(
    'requires wholesaleMinQty with wholesalePrice and the reverse: %o',
    async (extra) => {
      const res = await create({ ...valid, ...extra });
      expect(res.status).toBe(400);
    },
  );

  it('rejects a wholesale price at or above the unit price', async () => {
    const res = await create({ ...valid, wholesalePrice: 7500, wholesaleMinQty: 12 });
    expect(res.status).toBe(400);
  });

  it.each([{ options: ['Rouge'] }, { optionLabel: 'Couleur' }])(
    'rejects options without an option label, and the reverse: %o',
    async (extra) => {
      const res = await create({ ...valid, ...extra });
      expect(res.status).toBe(400);
    },
  );

  it('rejects photo URLs outside Cloudinary', async () => {
    const res = await create({ ...valid, photos: ['https://evil.example/pixel.gif'] });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/shops/[orgId]/products', () => {
  it('lists non-archived products with a cursor', async () => {
    const rows = Array.from({ length: 21 }, (_, i) =>
      product({ id: `prod_${i}`, createdAt: new Date(Date.UTC(2026, 9, 24, 10, 0, 60 - i)) }),
    );
    prismaMock.product.findMany.mockResolvedValue(rows as never);
    const res = await GET(apiRequest('/api/shops/org_1/products'), shop);
    expect(res.status).toBe(200);
    expect(prismaMock.product.findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org_1', archivedAt: null },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 21,
    });
    const json = (await res.json()) as { items: unknown[]; nextCursor: string | null };
    expect(json.items).toHaveLength(20);
    expect(json.nextCursor).not.toBeNull();
  });

  it('inCampaign=1 keeps products with an open campaign', async () => {
    prismaMock.product.findMany.mockResolvedValue([]);
    await GET(apiRequest('/api/shops/org_1/products?inCampaign=1'), shop);
    const where = prismaMock.product.findMany.mock.calls[0]![0]!.where;
    expect(where).toEqual({
      organizationId: 'org_1',
      archivedAt: null,
      campaigns: { some: activeCampaignWhere(expect.any(Date) as unknown as Date) },
    });
  });

  it('q searches the name', async () => {
    prismaMock.product.findMany.mockResolvedValue([]);
    await GET(apiRequest('/api/shops/org_1/products?q=Marmite'), shop);
    expect(prismaMock.product.findMany.mock.calls[0]![0]!.where).toEqual({
      organizationId: 'org_1',
      archivedAt: null,
      name: { contains: 'Marmite', mode: 'insensitive' },
    });
  });

  it('the first page carries sale, campaign and archived counts', async () => {
    prismaMock.product.findMany.mockResolvedValue([]);
    prismaMock.product.count
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1);
    const res = await GET(apiRequest('/api/shops/org_1/products'), shop);
    const json = (await res.json()) as { counts: Record<string, number> };
    expect(json.counts).toEqual({ sale: 7, campaign: 2, archived: 1 });
    expect(prismaMock.product.count).toHaveBeenCalledWith({
      where: { organizationId: 'org_1', archivedAt: { not: null } },
    });
  });

  it('a q over 60 characters is a 400', async () => {
    const res = await GET(apiRequest(`/api/shops/org_1/products?q=${'a'.repeat(61)}`), shop);
    expect(res.status).toBe(400);
  });

  it('includes archived products with ?archived=1', async () => {
    prismaMock.product.findMany.mockResolvedValue([]);
    await GET(apiRequest('/api/shops/org_1/products?archived=1'), shop);
    expect(prismaMock.product.findMany.mock.calls[0]![0]!.where).toEqual({
      organizationId: 'org_1',
    });
  });
});

describe('/api/shops/[orgId]/products/[productId]', () => {
  it('GET product of another shop returns 404 PRODUCT_NOT_FOUND', async () => {
    prismaMock.product.findFirst.mockResolvedValue(null);
    const res = await GET_ONE(apiRequest('/api/shops/org_1/products/prod_1'), one);
    expect(res.status).toBe(404);
    expect(await errorOf(res)).toBe('PRODUCT_NOT_FOUND');
    expect(prismaMock.product.findFirst).toHaveBeenCalledWith({
      where: { id: 'prod_1', organizationId: 'org_1' },
    });
  });

  it('PATCH updates a product of the shop', async () => {
    prismaMock.product.findFirst.mockResolvedValue(product() as never);
    prismaMock.product.update.mockResolvedValue(product({ unitPrice: 8000 }) as never);
    const res = await PATCH(
      apiRequest('/api/shops/org_1/products/prod_1', {
        method: 'PATCH',
        body: { unitPrice: 8000 },
      }),
      one,
    );
    expect(res.status).toBe(200);
    expect(prismaMock.product.update).toHaveBeenCalledWith({
      where: { id: 'prod_1' },
      data: { unitPrice: 8000 },
    });
  });

  it('PATCH validates the merged product', async () => {
    prismaMock.product.findFirst.mockResolvedValue(product() as never);
    const res = await PATCH(
      apiRequest('/api/shops/org_1/products/prod_1', {
        method: 'PATCH',
        body: { wholesaleMinQty: null },
      }),
      one,
    );
    expect(res.status).toBe(400);
    expect(prismaMock.product.update).not.toHaveBeenCalled();
  });

  it('PATCH returns 404 for a product of another shop', async () => {
    prismaMock.product.findFirst.mockResolvedValue(null);
    const res = await PATCH(
      apiRequest('/api/shops/org_1/products/prod_1', {
        method: 'PATCH',
        body: { unitPrice: 8000 },
      }),
      one,
    );
    expect(res.status).toBe(404);
  });

  describe('DELETE', () => {
    const del = () =>
      DELETE(apiRequest('/api/shops/org_1/products/prod_1', { method: 'DELETE' }), one);

    beforeEach(() => {
      prismaMock.product.findFirst.mockResolvedValue(product() as never);
    });

    it('hard-deletes a product without campaigns', async () => {
      prismaMock.campaign.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
      prismaMock.saleOrder.count.mockResolvedValue(0);
      prismaMock.product.deleteMany.mockResolvedValue({ count: 1 });
      const res = await del();
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ deleted: true });
      expect(prismaMock.product.deleteMany).toHaveBeenCalledWith({
        where: { id: 'prod_1', organizationId: 'org_1' },
      });
    });

    it('archives a product that has campaigns', async () => {
      prismaMock.campaign.count.mockResolvedValueOnce(0).mockResolvedValueOnce(2);
      prismaMock.product.update.mockResolvedValue(product({ archivedAt: new Date() }) as never);
      const res = await del();
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ archived: true, product: { id: 'prod_1' } });
      expect(prismaMock.product.update).toHaveBeenCalledWith({
        where: { id: 'prod_1' },
        data: { archivedAt: expect.any(Date) },
      });
      expect(prismaMock.product.deleteMany).not.toHaveBeenCalled();
    });

    it('archives a product that has orders, even without campaigns (lot 7)', async () => {
      prismaMock.campaign.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
      prismaMock.saleOrder.count.mockResolvedValue(1);
      prismaMock.product.update.mockResolvedValue(product({ archivedAt: new Date() }) as never);
      const res = await del();
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ archived: true, product: { id: 'prod_1' } });
      expect(prismaMock.saleOrder.count).toHaveBeenCalledWith({
        where: { organizationId: 'org_1', productId: 'prod_1' },
      });
      expect(prismaMock.product.deleteMany).not.toHaveBeenCalled();
    });

    it('returns 409 PRODUCT_IN_USE while a campaign is active', async () => {
      prismaMock.campaign.count.mockResolvedValueOnce(1);
      const res = await del();
      expect(res.status).toBe(409);
      expect(await errorOf(res)).toBe('PRODUCT_IN_USE');
      expect(prismaMock.campaign.count.mock.calls[0]![0]!.where).toMatchObject({
        organizationId: 'org_1',
        productId: 'prod_1',
        status: 'ACTIVE',
      });
      expect(prismaMock.product.update).not.toHaveBeenCalled();
    });

    it('requires ADMIN', async () => {
      asMember('org_1', 'MEMBER');
      const res = await del();
      expect(res.status).toBe(403);
    });
  });
});

describe('POST /api/shops/[orgId]/products country lock (lot 7b)', () => {
  it('a new product takes the shop-country lock, so a racing country change waits for it', async () => {
    runTransactionsInline();
    const res = await POST(
      apiRequest('/api/shops/org_1/products', {
        method: 'POST',
        body: { name: 'Riz 25 kg', unitLabel: 'sac', unitPrice: 18000 },
      }),
      routeParams({ orgId: 'org_1' }),
    );
    expect(res.status).toBe(201);
    expect(JSON.stringify(prismaMock.$executeRaw.mock.calls)).toContain('shop-country:org_1');
  });
});
