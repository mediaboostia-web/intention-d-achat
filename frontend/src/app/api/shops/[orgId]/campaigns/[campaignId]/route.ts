// GET|PATCH /api/shops/[orgId]/campaigns/[campaignId].
//
// Status moves start from the effective status (CAMPAIGN_TRANSITIONS).
// Anything that makes a campaign effectively ACTIVE again — reopening it,
// or pushing back the end date of an expired one — passes the plan limit,
// under the same lock and in the same transaction as the update.
export const runtime = 'nodejs';

import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/server/prisma';
import { CampaignLimitReached, assertActivationAllowed } from '@/lib/server/tamani/campaign-limit';
import {
  canTransitionCampaign,
  effectiveStatus,
  isPastArrival,
} from '@/lib/server/tamani/campaign-status';
import { tamaniError } from '@/lib/server/tamani/errors';
import { jsonOk, readJson, validationFailed } from '@/lib/server/tamani/http';
import { CampaignPatch, compact } from '@/lib/server/tamani/inputs';
import { shopHandler } from '@/lib/server/tamani/route';
import { toCampaign, toLink } from '@/lib/server/tamani/serializers';
import { shopCurrency } from '@/lib/server/tamani/shop';

type Params = { orgId: string; campaignId: string };

export const GET = shopHandler<Params>('MEMBER', async (_req, { params }) => {
  const campaign = await prisma.campaign.findFirst({
    where: { id: params.campaignId, organizationId: params.orgId },
    include: { product: true, links: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] } },
  });
  if (!campaign) return tamaniError('CAMPAIGN_NOT_FOUND', 404);
  const currency = await shopCurrency(prisma, params.orgId);
  return jsonOk({
    campaign: toCampaign(campaign, new Date(), currency),
    links: campaign.links.map(toLink),
  });
});

export const PATCH = shopHandler<Params>('MEMBER', async (req, { params }) => {
  const parsed = CampaignPatch.safeParse(await readJson(req));
  if (!parsed.success) return validationFailed();
  const existing = await prisma.campaign.findFirst({
    where: { id: params.campaignId, organizationId: params.orgId },
  });
  if (!existing) return tamaniError('CAMPAIGN_NOT_FOUND', 404);

  const now = new Date();
  const { status, ...fields } = compact(parsed.data);
  const before = effectiveStatus(existing, now);
  if (status !== undefined && status !== before && !canTransitionCampaign(before, status)) {
    return tamaniError('INVALID_CAMPAIGN_TRANSITION', 409);
  }
  // A campaign that already arrived keeps its date; only a new past date is refused.
  const arrival = fields.availableAt;
  if (
    arrival &&
    (fields.availability ?? existing.availability) === 'INCOMING' &&
    isPastArrival(arrival, now) &&
    arrival.getTime() !== existing.availableAt?.getTime()
  ) {
    return validationFailed('availableAt must not be in the past');
  }

  const data: Prisma.CampaignUpdateInput = { ...fields };
  if (status !== undefined) {
    data.status = status;
    if (status === 'CLOSED' && !existing.closedAt) data.closedAt = now;
    if (status === 'ARRIVED' && !existing.arrivedAt) data.arrivedAt = now;
    if (status === 'ACTIVE') data.closedAt = null;
  }

  const after = effectiveStatus(
    {
      status: status ?? existing.status,
      endsAt: fields.endsAt !== undefined ? fields.endsAt : existing.endsAt,
    },
    now,
  );
  if (status === 'ACTIVE' && after !== 'ACTIVE') {
    return validationFailed('endsAt must be in the future to reopen');
  }
  const reactivating = after === 'ACTIVE' && before !== 'ACTIVE';

  try {
    const campaign = await prisma.$transaction(async (tx) => {
      if (reactivating) await assertActivationAllowed(tx, params.orgId, now, existing.id);
      return tx.campaign.update({
        where: { id: existing.id },
        data,
        include: { product: true, links: { where: { isDefault: true } } },
      });
    });
    return jsonOk({
      campaign: toCampaign(campaign, now, await shopCurrency(prisma, params.orgId)),
    });
  } catch (err) {
    if (err instanceof CampaignLimitReached) return tamaniError('CAMPAIGN_LIMIT_REACHED', 409);
    throw err;
  }
});
