// The FREE plan allows 3 campaigns with effective status ACTIVE. The check
// runs under a per-shop advisory lock in the transaction that activates,
// so two simultaneous activations cannot both pass at 2/3.
import 'server-only';
import { PLANS } from '@/lib/tamani/plans';
import { activeCampaignWhere } from './campaign-status';
import { advisoryXactLock, type Db } from './locks';
import { effectivePlan } from './subscription';

export class CampaignLimitReached extends Error {}

/** Throws CampaignLimitReached; `campaignId` is the campaign being (re)activated, if it exists. */
export async function assertActivationAllowed(
  tx: Db,
  organizationId: string,
  now: Date,
  campaignId: string | null,
): Promise<void> {
  await advisoryXactLock(tx, `campaign-activate:${organizationId}`);
  const sub = await tx.subscription.findUnique({ where: { organizationId } });
  const max = PLANS[effectivePlan(sub, now).plan].maxActiveCampaigns;
  if (max === null) return;
  const active = await tx.campaign.count({
    where: {
      organizationId,
      ...activeCampaignWhere(now),
      ...(campaignId ? { id: { not: campaignId } } : {}),
    },
  });
  if (active >= max) throw new CampaignLimitReached();
}
