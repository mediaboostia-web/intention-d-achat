import { prismaMock } from '@/test-utils/prisma-mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../quota', () => ({ passUsage: vi.fn() }));

import { passUsage } from '../quota';
import { parseShopQuery, shopsHref } from '@/lib/tamani/admin-shops';
import { getAdminShop, listAdminShops } from './shops';

const NOW = new Date('2026-11-15T10:00:00Z');

const shop = (id: string, plan: string, end: string | null, owner = `${id}@test.local`) => ({
  id,
  name: `Boutique ${id}`,
  country: 'BJ',
  businessType: 'WHOLESALER',
  salesChannel: 'STORE',
  createdAt: new Date('2026-11-01T10:00:00Z'),
  subscription: { plan, currentPeriodEnd: end ? new Date(end) : null, graceUntil: null },
  members: [{ user: { email: owner } }],
});

describe('the list’s address', () => {
  it('reads the search, a known plan and a page, and ignores the rest', () => {
    expect(parseShopQuery({ q: '  Diallo ', forfait: 'WEEK', page: '2' })).toEqual({
      q: 'Diallo',
      plan: 'WEEK',
      page: 2,
    });
    expect(parseShopQuery({ forfait: 'GOLD', page: '-3' })).toEqual({ q: '', plan: null, page: 1 });
  });

  it('writes it back, page 1 left out', () => {
    expect(shopsHref({ q: 'sow & fils', plan: 'FREE', page: 1 })).toBe(
      '/support-admin/boutiques?q=sow+%26+fils&forfait=FREE',
    );
    expect(shopsHref({ page: 3 })).toBe('/support-admin/boutiques?page=3');
  });
});

describe('listAdminShops', () => {
  beforeEach(() => {
    prismaMock.organization.findMany.mockResolvedValue([
      shop('a', 'WEEK', '2026-11-20T00:00:00Z'),
      shop('b', 'TRIAL', '2026-11-01T00:00:00Z'),
      shop('c', 'FREE', null),
    ] as never);
  });

  it('searches the shop name and the owner’s e-mail', async () => {
    await listAdminShops(prismaMock, { q: 'awa', plan: null, page: 1 }, NOW);
    const where = prismaMock.organization.findMany.mock.calls[0]![0]!.where;
    expect(where).toEqual({
      OR: [
        { name: { contains: 'awa', mode: 'insensitive' } },
        {
          members: {
            some: { role: 'OWNER', user: { email: { contains: 'awa', mode: 'insensitive' } } },
          },
        },
      ],
    });
  });

  it('shows each shop with its plan in force: an ended trial reads « Sans pass »', async () => {
    const list = await listAdminShops(prismaMock, { q: '', plan: null, page: 1 }, NOW);
    expect(list.items.map((s) => [s.id, s.plan])).toEqual([
      ['a', 'WEEK'],
      ['b', 'FREE'],
      ['c', 'FREE'],
    ]);
    expect(list.items[0]).toMatchObject({
      ownerEmail: 'a@test.local',
      endsAt: '2026-11-20T00:00:00.000Z',
    });
  });

  it('filters on the plan in force', async () => {
    const list = await listAdminShops(prismaMock, { q: '', plan: 'FREE', page: 1 }, NOW);
    expect(list.items.map((s) => s.id)).toEqual(['b', 'c']);
    expect(list.total).toBe(2);
  });

  it('pages by 50, a page past the end reading the last one', async () => {
    prismaMock.organization.findMany.mockResolvedValue(
      Array.from({ length: 120 }, (_, i) => shop(`s${i}`, 'FREE', null)) as never,
    );
    const list = await listAdminShops(prismaMock, { q: '', plan: null, page: 9 }, NOW);
    expect(list).toMatchObject({ total: 120, page: 3, pages: 3 });
    expect(list.items).toHaveLength(20);
  });
});

describe('getAdminShop', () => {
  beforeEach(() => {
    vi.mocked(passUsage).mockResolvedValue({
      plan: 'WEEK',
      used: 40,
      included: 150,
      endsAt: new Date('2026-11-20T00:00:00Z'),
      inGrace: false,
      pending: 0,
    });
    prismaMock.campaign.count.mockResolvedValue(1);
    prismaMock.order.findMany.mockResolvedValue([
      {
        id: 'ord_1',
        offer: 'WEEK',
        amount: 3900,
        currency: 'XOF',
        status: 'PAID',
        provider: 'saspay',
        createdAt: new Date('2026-11-13T08:00:00Z'),
        activatedAt: new Date('2026-11-13T08:01:00Z'),
      },
    ] as never);
  });

  it('answers null for an unknown shop', async () => {
    prismaMock.organization.findUnique.mockResolvedValue(null);
    expect(await getAdminShop(prismaMock, 'nope', NOW)).toBeNull();
  });

  it('gathers the members, the pass, the campaigns and the purchases', async () => {
    prismaMock.organization.findUnique.mockResolvedValue({
      id: 'a',
      name: 'Diallo Import',
      slug: 'diallo-import',
      country: 'GN',
      businessType: null,
      salesChannel: 'ONLINE',
      createdAt: new Date('2026-11-01T10:00:00Z'),
      members: [{ role: 'OWNER', user: { email: 'awa@test.local', name: 'Awa' } }],
    } as never);
    const card = await getAdminShop(prismaMock, 'a', NOW);
    expect(card).toMatchObject({
      name: 'Diallo Import',
      members: [{ email: 'awa@test.local', name: 'Awa', role: 'OWNER' }],
      pass: { plan: 'WEEK', used: 40, included: 150, endsAt: '2026-11-20T00:00:00.000Z' },
      campaigns: { running: 1, drafts: 1, archived: 1 },
      purchases: [{ id: 'ord_1', provider: 'saspay', at: '2026-11-13T08:01:00.000Z' }],
    });
    // Every read of the card stays on this shop.
    for (const call of prismaMock.campaign.count.mock.calls) {
      expect(call[0]!.where).toMatchObject({ organizationId: 'a' });
    }
    expect(prismaMock.order.findMany.mock.calls[0]![0]!.where).toMatchObject({
      organizationId: 'a',
    });
  });
});
