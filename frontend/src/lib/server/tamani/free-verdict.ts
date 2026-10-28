// The verdict offered to the free plan (porteur, 2026-10-27): a shop
// without the estimate feature sees the verdict of one campaign, its first
// to reach the verdict threshold. Reserved once in
// Organization.freeVerdictCampaignId and never moved.
import 'server-only';
import type { PlanDefinition } from '@/lib/tamani/plans';
import type { VerdictAccess } from '@/lib/tamani/results-view';
import type { Db } from './locks';

/**
 * The reserved campaign. Without one, the oldest eligible campaign is
 * reserved; the write only lands while the column is still empty, so two
 * requests racing end on the same campaign.
 */
export async function claimFreeVerdict(
  db: Db,
  organizationId: string,
  current: string | null,
  eligible: ReadonlyArray<{ id: string; createdAt: Date }>,
): Promise<string | null> {
  if (current !== null) return current;
  const first = [...eligible].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id),
  )[0];
  if (!first) return null;
  await db.organization.updateMany({
    where: { id: organizationId, freeVerdictCampaignId: null },
    data: { freeVerdictCampaignId: first.id },
  });
  const org = await db.organization.findFirst({
    where: { id: organizationId },
    select: { freeVerdictCampaignId: true },
  });
  return org?.freeVerdictCampaignId ?? null;
}

export function verdictAccess(
  plan: PlanDefinition,
  freeVerdictCampaignId: string | null,
  campaignId: string,
): VerdictAccess {
  if (plan.features.estimate) return 'PLAN';
  return freeVerdictCampaignId === campaignId ? 'OFFERED' : 'LOCKED';
}
