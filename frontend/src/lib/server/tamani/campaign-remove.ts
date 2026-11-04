// Deleting a campaign (porteur, 2026-11-04). One that nobody finished
// answering and that has no order is deleted. Otherwise it is archived:
// closed if it still ran, out of the lists, its answers and orders kept,
// since the client book and the learnt coefficients read them.
import 'server-only';
import type { PrismaClient } from '@prisma/client';

export async function removeCampaign(
  db: PrismaClient,
  organizationId: string,
  campaignId: string,
  now: Date,
): Promise<{ deleted: true } | { archived: true } | null> {
  return db.$transaction(async (tx) => {
    const campaign = await tx.campaign.findFirst({
      where: { id: campaignId, organizationId, archivedAt: null },
      select: { id: true, status: true },
    });
    if (!campaign) return null;
    const [answers, orders] = await Promise.all([
      tx.response.count({ where: { campaignId, completedAt: { not: null } } }),
      tx.saleOrder.count({ where: { campaignId } }),
    ]);
    const where = { id: campaignId, organizationId };
    if (answers === 0 && orders === 0) {
      await tx.campaign.deleteMany({ where });
      return { deleted: true } as const;
    }
    const stillOpen = campaign.status === 'ACTIVE' || campaign.status === 'DRAFT';
    await tx.campaign.updateMany({
      where,
      data: { archivedAt: now, ...(stillOpen ? { status: 'CLOSED', closedAt: now } : {}) },
    });
    return { archived: true } as const;
  });
}
