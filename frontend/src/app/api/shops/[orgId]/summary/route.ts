// GET /api/shops/[orgId]/summary — the home page: this week's answers, the
// latest activity, what is coming up (porteur's feedback §3 bis).
export const runtime = 'nodejs';

import 'server-only';
import { prisma } from '@/lib/server/prisma';
import { jsonOk } from '@/lib/server/tamani/http';
import { shopHandler } from '@/lib/server/tamani/route';
import { buildShopSummary } from '@/lib/server/tamani/summary';

export const GET = shopHandler('MEMBER', async (_req, { params }) => {
  return jsonOk({ summary: await buildShopSummary(prisma, params.orgId, new Date()) });
});
