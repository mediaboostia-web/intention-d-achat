import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, expect, it } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { loadAdminGrowth } from './growth';

const db = prismaMock as unknown as PrismaClient;
const NOW = new Date('2026-11-21T12:00:00Z');
const D30 = new Date('2026-10-22T12:00:00Z');
const D60 = new Date('2026-09-22T12:00:00Z');

describe('loadAdminGrowth', () => {
  it('counts the last 30 days, the 30 before and the total of each figure', async () => {
    prismaMock.user.count
      .mockResolvedValueOnce(12) // last 30
      .mockResolvedValueOnce(8) // 30 before
      .mockResolvedValueOnce(140); // all
    prismaMock.organization.count
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(60);
    prismaMock.response.count
      .mockResolvedValueOnce(300)
      .mockResolvedValueOnce(250)
      .mockResolvedValueOnce(4000);
    prismaMock.waitlistEntry.count
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(30)
      .mockResolvedValueOnce(90);
    prismaMock.blogLead.count
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(7);
    prismaMock.blogPost.count.mockResolvedValueOnce(4);

    const g = await loadAdminGrowth(db, NOW);
    expect(g).toEqual({
      users: { last30: 12, prev30: 8, total: 140 },
      shops: { last30: 5, prev30: 4, total: 60 },
      answers: { last30: 300, prev30: 250, total: 4000 },
      waitlist: { last30: 20, prev30: 30, total: 90 },
      blogLeads: { last30: 7, prev30: 0, total: 7 },
      articles: 4,
    });
    expect(prismaMock.user.count).toHaveBeenNthCalledWith(1, {
      where: { createdAt: { gte: D30, lt: NOW } },
    });
    expect(prismaMock.user.count).toHaveBeenNthCalledWith(2, {
      where: { createdAt: { gte: D60, lt: D30 } },
    });
    expect(prismaMock.blogPost.count).toHaveBeenCalledWith({
      where: { status: 'PUBLISHED', publishedAt: { not: null } },
    });
  });
});
