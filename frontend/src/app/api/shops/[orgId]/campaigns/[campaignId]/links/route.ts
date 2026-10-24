// GET|POST /api/shops/[orgId]/campaigns/[campaignId]/links — share links
// by source ("Groupe Revendeurs Dakar", "Statut WhatsApp") to see where
// responses come from. Creating one needs a plan with sourceLinks.
export const runtime = 'nodejs';

import 'server-only';
import { prisma } from '@/lib/server/prisma';
import { PLANS } from '@/lib/tamani/plans';
import { tamaniError } from '@/lib/server/tamani/errors';
import { jsonOk, readJson, validationFailed } from '@/lib/server/tamani/http';
import { LinkCreate } from '@/lib/server/tamani/inputs';
import { shopHandler } from '@/lib/server/tamani/route';
import { toLink } from '@/lib/server/tamani/serializers';
import { withUniqueCode } from '@/lib/server/tamani/short-code';
import { effectivePlan } from '@/lib/server/tamani/subscription';

type Params = { orgId: string; campaignId: string };

const findCampaign = (p: Params) =>
  prisma.campaign.findFirst({
    where: { id: p.campaignId, organizationId: p.orgId },
    select: { id: true },
  });

export const GET = shopHandler<Params>('MEMBER', async (_req, { params }) => {
  const campaign = await findCampaign(params);
  if (!campaign) return tamaniError('CAMPAIGN_NOT_FOUND', 404);
  const links = await prisma.campaignLink.findMany({
    where: { campaignId: campaign.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });
  return jsonOk({ items: links.map(toLink) });
});

export const POST = shopHandler<Params>('MEMBER', async (req, { params }) => {
  const parsed = LinkCreate.safeParse(await readJson(req));
  if (!parsed.success) return validationFailed();
  const campaign = await findCampaign(params);
  if (!campaign) return tamaniError('CAMPAIGN_NOT_FOUND', 404);

  const sub = await prisma.subscription.findUnique({ where: { organizationId: params.orgId } });
  if (!PLANS[effectivePlan(sub, new Date()).plan].features.sourceLinks) {
    return tamaniError('PLAN_FEATURE_LOCKED', 403);
  }

  const link = await withUniqueCode((code) =>
    prisma.campaignLink.create({
      data: { campaignId: campaign.id, code, label: parsed.data.label, isDefault: false },
    }),
  );
  return jsonOk({ link: toLink(link) }, 201);
});
