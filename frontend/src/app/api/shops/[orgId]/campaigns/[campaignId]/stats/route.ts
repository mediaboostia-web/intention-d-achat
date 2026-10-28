// GET /api/shops/[orgId]/campaigns/[campaignId]/stats — the results tab
// (lot 6): counts and breakdowns for every plan; the verdict, the estimate
// and the money when the plan has the estimate, or when the free plan's
// offered verdict falls on this campaign.
export const runtime = 'nodejs';

import 'server-only';
import { prisma } from '@/lib/server/prisma';
import { coefficientsFor } from '@/lib/server/tamani/coefficients';
import { tamaniError } from '@/lib/server/tamani/errors';
import { claimFreeVerdict, verdictAccess } from '@/lib/server/tamani/free-verdict';
import { jsonOk } from '@/lib/server/tamani/http';
import { shopHandler } from '@/lib/server/tamani/route';
import { computeCampaignStats } from '@/lib/server/tamani/stats';
import { effectivePlan } from '@/lib/server/tamani/subscription';
import { MIN_RESPONSES_FOR_VERDICT } from '@/lib/server/tamani/verdict';
import { PLANS } from '@/lib/tamani/plans';
import type { CampaignStatsBody } from '@/lib/tamani/results-view';

type Params = { orgId: string; campaignId: string };

export const GET = shopHandler<Params>('MEMBER', async (_req, { params }) => {
  const now = new Date();
  const campaign = await prisma.campaign.findFirst({
    where: { id: params.campaignId, organizationId: params.orgId },
    select: {
      id: true,
      createdAt: true,
      availability: true,
      plannedQuantity: true,
      stockQuantity: true,
      product: { select: { costPrice: true, unitPrice: true, wholesalePrice: true } },
      links: { select: { id: true, label: true, openCount: true, isDefault: true } },
    },
  });
  if (!campaign) return tamaniError('CAMPAIGN_NOT_FOUND', 404);

  const [org, zones, rows] = await Promise.all([
    prisma.organization.findFirst({
      where: { id: params.orgId },
      select: {
        coefConsumer: true,
        coefReseller: true,
        freeVerdictCampaignId: true,
        subscription: { select: { plan: true, currentPeriodEnd: true, graceUntil: true } },
      },
    }),
    prisma.deliveryZone.findMany({
      where: { organizationId: params.orgId },
      select: { id: true, name: true },
    }),
    prisma.response.findMany({
      where: { campaignId: campaign.id, organizationId: params.orgId },
      select: {
        completedAt: true,
        locked: true,
        suspicious: true,
        interested: true,
        notInterestedReason: true,
        buyerType: true,
        quantity: true,
        option: true,
        timing: true,
        wantsDelivery: true,
        zoneId: true,
        linkId: true,
      },
    }),
  ]);
  if (!org) return tamaniError('SHOP_NOT_FOUND', 404);

  const stats = computeCampaignStats(
    rows,
    { ...campaign, availability: campaign.availability === 'IN_STOCK' ? 'IN_STOCK' : 'INCOMING' },
    zones,
    coefficientsFor(org),
  );
  const plan = PLANS[effectivePlan(org.subscription, now).plan];
  const offered =
    !plan.features.estimate && stats.completed >= MIN_RESPONSES_FOR_VERDICT
      ? await claimFreeVerdict(prisma, params.orgId, org.freeVerdictCampaignId, [campaign])
      : org.freeVerdictCampaignId;
  const access = verdictAccess(plan, offered, campaign.id);

  const body: CampaignStatsBody = {
    stats: { ...stats, result: access === 'LOCKED' ? null : stats.result },
    access,
    offerOpen: access === 'LOCKED' && offered === null,
  };
  return jsonOk(body);
});
