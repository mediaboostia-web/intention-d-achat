// GET /api/shops/[orgId]/campaigns/[campaignId]/export — the campaign's
// counted answers as a CSV file Excel opens as is (spec §5.4). A Pro
// feature: the free plan gets 403 PLAN_FEATURE_LOCKED.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { exportFilename, responsesCsv } from '@/lib/server/tamani/campaign-export';
import { campaignExportRows } from '@/lib/server/tamani/campaign-responses';
import { tamaniError } from '@/lib/server/tamani/errors';
import { requestIdHeaders } from '@/lib/server/tamani/http';
import { shopHandler } from '@/lib/server/tamani/route';
import { shopPlan } from '@/lib/server/tamani/shop';

type Params = { orgId: string; campaignId: string };

export const GET = shopHandler<Params>('MEMBER', async (_req, { params }) => {
  const now = new Date();
  const plan = await shopPlan(prisma, params.orgId, now);
  if (!plan.features.csvExport || !plan.features.respondentContacts) {
    return tamaniError('PLAN_FEATURE_LOCKED', 403);
  }
  const campaign = await prisma.campaign.findFirst({
    where: { id: params.campaignId, organizationId: params.orgId },
    select: { id: true, title: true },
  });
  if (!campaign) return tamaniError('CAMPAIGN_NOT_FOUND', 404);

  const csv = responsesCsv(await campaignExportRows(prisma, params.orgId, campaign.id));
  return new NextResponse(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${exportFilename(campaign.title, now)}"`,
      'cache-control': 'no-store',
      ...requestIdHeaders(),
    },
  });
});
