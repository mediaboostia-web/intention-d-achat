// GET /api/shops/[orgId]/search?q= — the top bar's search (lot 7a): five
// campaigns, products and clients whose name holds q. 2 to 60 characters
// once trimmed, else 400.
export const runtime = 'nodejs';

import 'server-only';
import { prisma } from '@/lib/server/prisma';
import { jsonOk, validationFailed } from '@/lib/server/tamani/http';
import { SEARCH_MAX } from '@/lib/server/tamani/inputs';
import { shopHandler } from '@/lib/server/tamani/route';
import { searchShop } from '@/lib/server/tamani/search';
import { shopPlan } from '@/lib/server/tamani/shop';
import { SEARCH_MIN } from '@/lib/tamani/search-view';

export const GET = shopHandler('MEMBER', async (req, { params }) => {
  const q = (new URL(req.url).searchParams.get('q') ?? '').trim();
  if (q.length < SEARCH_MIN || q.length > SEARCH_MAX) return validationFailed();
  const now = new Date();
  const plan = await shopPlan(prisma, params.orgId, now);
  const results = await searchShop(prisma, {
    organizationId: params.orgId,
    q,
    canSeeContacts: plan.features.respondentContacts,
    now,
  });
  return jsonOk({ results });
});
