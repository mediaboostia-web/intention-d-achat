// The growth panel's counts (2026-11-21): accounts, shops, client answers,
// waitlist and blog contacts over the last 30 days, the 30 before, and in all;
// the published articles now. Counts only: no name, no number.
import 'server-only';
import type { PrismaClient } from '@prisma/client';
import type { AdminGrowth, GrowthPair } from '@/lib/tamani/admin-growth';

type Db = Pick<
  PrismaClient,
  'user' | 'organization' | 'response' | 'waitlistEntry' | 'blogLead' | 'blogPost'
>;

const DAY_MS = 86_400_000;

type Counter = (args: { where?: { createdAt?: { gte: Date; lt: Date } } }) => Promise<number>;

async function pair(count: Counter, now: Date): Promise<GrowthPair> {
  const d30 = new Date(now.getTime() - 30 * DAY_MS);
  const d60 = new Date(now.getTime() - 60 * DAY_MS);
  // In this order: the test and the reader see the same three questions.
  const last30 = await count({ where: { createdAt: { gte: d30, lt: now } } });
  const prev30 = await count({ where: { createdAt: { gte: d60, lt: d30 } } });
  const total = await count({});
  return { last30, prev30, total };
}

export async function loadAdminGrowth(db: Db, now: Date): Promise<AdminGrowth> {
  const [users, shops, answers, waitlist, blogLeads, articles] = await Promise.all([
    pair((a) => db.user.count(a), now),
    pair((a) => db.organization.count(a), now),
    pair((a) => db.response.count(a), now),
    pair((a) => db.waitlistEntry.count(a), now),
    pair((a) => db.blogLead.count(a), now),
    db.blogPost.count({ where: { status: 'PUBLISHED', publishedAt: { not: null } } }),
  ]);
  return { users, shops, answers, waitlist, blogLeads, articles };
}
