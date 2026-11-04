import 'server-only';
import type { Prisma, PrismaClient } from '@prisma/client';

/**
 * Campaigns running (active, not past their end), drafts, finished (the rest
 * not archived) and archived — the whole platform, or one shop with `scope`.
 */
export async function countCampaigns(
  db: Pick<PrismaClient, 'campaign'>,
  scope: Prisma.CampaignWhereInput,
  now: Date,
): Promise<{ running: number; drafts: number; finished: number; archived: number }> {
  const [running, drafts, live, archived] = await Promise.all([
    db.campaign.count({
      where: {
        ...scope,
        archivedAt: null,
        status: 'ACTIVE',
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
    }),
    db.campaign.count({ where: { ...scope, archivedAt: null, status: 'DRAFT' } }),
    db.campaign.count({ where: { ...scope, archivedAt: null } }),
    db.campaign.count({ where: { ...scope, archivedAt: { not: null } } }),
  ]);
  return { running, drafts, finished: Math.max(0, live - running - drafts), archived };
}
