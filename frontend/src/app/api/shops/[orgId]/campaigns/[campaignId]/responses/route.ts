// GET /api/shops/[orgId]/campaigns/[campaignId]/responses — the interested
// list (lot 6): counted answers, ?filtre=oui (default) or non, newest first,
// with a cursor. Free gets masked numbers.
export const runtime = 'nodejs';

import 'server-only';
import { decodeCursor } from '@/lib/server/notifications/cursor';
import { clampLimit } from '@/lib/server/pagination/paginate';
import { prisma } from '@/lib/server/prisma';
import { listCampaignResponses, parseResponseFilter } from '@/lib/server/tamani/campaign-responses';
import { tamaniError } from '@/lib/server/tamani/errors';
import { jsonOk, validationFailed } from '@/lib/server/tamani/http';
import { shopHandler } from '@/lib/server/tamani/route';
import { shopPlan } from '@/lib/server/tamani/shop';

type Params = { orgId: string; campaignId: string };

export const GET = shopHandler<Params>('MEMBER', async (req, { params }) => {
  const url = new URL(req.url);
  const filter = parseResponseFilter(url.searchParams.get('filtre'));
  if (!filter) return validationFailed();
  const campaign = await prisma.campaign.findFirst({
    where: { id: params.campaignId, organizationId: params.orgId },
    select: { id: true },
  });
  if (!campaign) return tamaniError('CAMPAIGN_NOT_FOUND', 404);
  const plan = await shopPlan(prisma, params.orgId, new Date());
  const page = await listCampaignResponses(
    prisma,
    params.orgId,
    campaign.id,
    filter,
    decodeCursor(url.searchParams.get('cursor')),
    {
      canSeeContacts: plan.features.respondentContacts,
      limit: clampLimit(url.searchParams.get('limit')),
    },
  );
  return jsonOk(page);
});
