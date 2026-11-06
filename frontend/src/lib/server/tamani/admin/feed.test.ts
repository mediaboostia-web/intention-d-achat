import { prismaMock } from '@/test-utils/prisma-mock';
import { beforeEach, describe, expect, it } from 'vitest';
import { countUnreadFeed, loadAdminFeed, markFeedSeen } from './feed';

const NOW = new Date('2026-11-05T12:00:00Z');
const at = (h: number) => new Date(NOW.getTime() - h * 3_600_000);
const THIRTY_DAYS_AGO = new Date(NOW.getTime() - 30 * 86_400_000);

// The rows carry an e-mail and a phone on purpose: none may reach the feed.
const SIGNUPS = [
  {
    id: 'u_1',
    name: 'Awa Diallo',
    email: 'awa@test.local',
    emailVerifiedAt: at(1),
    memberships: [{ organization: { name: 'Diallo Import' } }],
  },
  { id: 'u_2', name: null, email: 'x@test.local', emailVerifiedAt: at(5), memberships: [] },
];
const SHOPS = [
  {
    id: 'org_1',
    name: 'Diallo Import',
    createdAt: at(2),
    members: [{ user: { name: 'Awa Diallo', email: 'awa@test.local' } }],
  },
];
const PAID = [
  {
    id: 'o_1',
    amount: 2500,
    currency: 'XOF',
    offer: 'WEEK',
    paymentMethod: 'WAVE',
    activatedAt: at(3),
    organizationId: 'org_1',
    organization: { name: 'Diallo Import' },
    customerEmail: 'awa@test.local',
    customerPhone: '+221770000000',
  },
];
const FAILED = [
  {
    id: 'o_2',
    amount: 5000,
    currency: 'XOF',
    offer: 'MONTH',
    status: 'EXPIRED',
    updatedAt: at(4),
    organizationId: 'org_1',
    organization: { name: 'Diallo Import' },
    customerPhone: '+221770000000',
  },
];

beforeEach(() => {
  prismaMock.user.findMany.mockResolvedValue(SIGNUPS as never);
  prismaMock.organization.findMany.mockResolvedValue(SHOPS as never);
  prismaMock.order.findMany.mockImplementation((async (args: { where: { status?: unknown } }) =>
    args.where.status ? FAILED : PAID) as never);
});

describe('loadAdminFeed', () => {
  it('merges the four sources, newest first', async () => {
    const { items, next } = await loadAdminFeed(prismaMock, { now: NOW });
    expect(items.map((i) => [i.type, i.id])).toEqual([
      ['SIGNUP', 'SIGNUP:u_1'],
      ['SHOP', 'SHOP:org_1'],
      ['PAYMENT', 'PAYMENT:o_1'],
      ['PAYMENT_FAILED', 'PAYMENT_FAILED:o_2'],
      ['SIGNUP', 'SIGNUP:u_2'],
    ]);
    expect(next).toBeNull();
    const [signup, shop, paid, failed] = items;
    expect(signup?.detail).toBe('Awa · Diallo Import');
    expect(signup?.href).toBe('/support-admin/utilisateurs/u_1');
    expect(shop?.detail).toBe('Diallo Import, ouverte par Awa');
    expect(shop?.href).toBe('/support-admin/boutiques/org_1');
    expect(paid?.detail).toContain('Diallo Import');
    expect(paid?.detail).toContain('Pass Semaine');
    expect(paid?.detail).toContain('2 500');
    expect(paid?.detail).toContain('Wave');
    expect(failed?.detail).toContain('expiré');
    expect(items[4]?.detail).toBe('Sans prénom · pas encore de boutique');
  });

  it('never shows an e-mail or a phone number', async () => {
    const { items } = await loadAdminFeed(prismaMock, { now: NOW });
    const all = JSON.stringify(items);
    expect(all).not.toContain('@test.local');
    expect(all).not.toContain('770000000');
    // Only the first name, never the whole name.
    expect(all).not.toContain('Awa Diallo');
  });

  it('keeps only payments under the payments filter', async () => {
    const { items } = await loadAdminFeed(prismaMock, { now: NOW, type: 'paiements' });
    expect(items.map((i) => i.type)).toEqual(['PAYMENT', 'PAYMENT_FAILED']);
    expect(prismaMock.user.findMany).not.toHaveBeenCalled();
    expect(prismaMock.organization.findMany).not.toHaveBeenCalled();
  });

  it('looks back 30 days at most, and before the given date for the next page', async () => {
    await loadAdminFeed(prismaMock, { now: NOW });
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { emailVerifiedAt: { gte: THIRTY_DAYS_AGO, lte: NOW } },
      }),
    );
    const before = at(2);
    await loadAdminFeed(prismaMock, { now: NOW, before });
    expect(prismaMock.organization.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { createdAt: { gte: THIRTY_DAYS_AGO, lt: before } } }),
    );
    expect(prismaMock.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { activatedAt: { gte: THIRTY_DAYS_AGO, lt: before }, amount: { gt: 0 } },
      }),
    );
    expect(prismaMock.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: { in: ['FAILED', 'EXPIRED'] },
          updatedAt: { gte: THIRTY_DAYS_AGO, lt: before },
          amount: { gt: 0 },
        },
      }),
    );
  });

  it('gives the date of the last line shown when there is more', async () => {
    const { items, next } = await loadAdminFeed(prismaMock, { now: NOW, limit: 2 });
    expect(items).toHaveLength(2);
    expect(next).toEqual(at(2));
  });
});

describe('countUnreadFeed', () => {
  beforeEach(() => {
    prismaMock.user.count.mockResolvedValue(2);
    prismaMock.organization.count.mockResolvedValue(1);
    prismaMock.order.count.mockResolvedValue(3);
  });

  it("counts what came after this admin's own last visit", async () => {
    const seenAt = at(6);
    prismaMock.adminFeedSeen.findUnique.mockResolvedValue({ userId: 'a_1', seenAt } as never);
    expect(await countUnreadFeed(prismaMock, 'a_1', NOW)).toBe(9);
    expect(prismaMock.adminFeedSeen.findUnique).toHaveBeenCalledWith({
      where: { userId: 'a_1' },
    });
    expect(prismaMock.user.count).toHaveBeenCalledWith({
      where: { emailVerifiedAt: { gt: seenAt, lte: NOW } },
    });
  });

  it('counts the last 30 days for an admin who never opened the feed', async () => {
    prismaMock.adminFeedSeen.findUnique.mockResolvedValue(null);
    await countUnreadFeed(prismaMock, 'a_1', NOW);
    expect(prismaMock.organization.count).toHaveBeenCalledWith({
      where: { createdAt: { gt: THIRTY_DAYS_AGO, lte: NOW } },
    });
  });

  it('stops at 99', async () => {
    prismaMock.adminFeedSeen.findUnique.mockResolvedValue(null);
    prismaMock.order.count.mockResolvedValue(200);
    expect(await countUnreadFeed(prismaMock, 'a_1', NOW)).toBe(99);
  });
});

describe('markFeedSeen', () => {
  it("moves only this admin's last visit", async () => {
    await markFeedSeen(prismaMock, 'a_1', NOW);
    expect(prismaMock.adminFeedSeen.upsert).toHaveBeenCalledWith({
      where: { userId: 'a_1' },
      create: { userId: 'a_1', seenAt: NOW },
      update: { seenAt: NOW },
    });
  });
});
