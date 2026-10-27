// GET /api/shops/[orgId]/campaigns/[campaignId]/responses/numbers — every
// interested number of a campaign, to paste into a WhatsApp broadcast list
// (spec §5.5). Needs both the contacts and the export of the plan.
export const runtime = 'nodejs';

import 'server-only';
import { prisma } from '@/lib/server/prisma';
import { interestedNumbers } from '@/lib/server/tamani/campaign-responses';
import { tamaniError } from '@/lib/server/tamani/errors';
import { jsonOk } from '@/lib/server/tamani/http';
import { shopHandler } from '@/lib/server/tamani/route';
import { shopPlan } from '@/lib/server/tamani/shop';

type Params = { orgId: string; campaignId: string };

export const GET = shopHandler<Params>('MEMBER', async (_req, { params }) => {
  const plan = await shopPlan(prisma, params.orgId, new Date());
  if (!plan.features.respondentContacts || !plan.features.csvExport) {
    return tamaniError('PLAN_FEATURE_LOCKED', 403);
  }
  const campaign = await prisma.campaign.findFirst({
    where: { id: params.campaignId, organizationId: params.orgId },
    select: { id: true },
  });
  if (!campaign) return tamaniError('CAMPAIGN_NOT_FOUND', 404);
  return jsonOk({ numbers: await interestedNumbers(prisma, params.orgId, campaign.id) });
});
