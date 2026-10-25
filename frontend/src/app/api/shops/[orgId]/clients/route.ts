// GET /api/shops/[orgId]/clients — the client book, most recently seen
// first, with ?type=revendeurs|usagers and ?q= (first name, or digits of
// the number on a plan with contacts). Free gets masked numbers.
export const runtime = 'nodejs';

import 'server-only';
import { clampLimit, decodeCursor } from '@/lib/server/pagination/paginate';
import { prisma } from '@/lib/server/prisma';
import { listClients, parseClientFilters } from '@/lib/server/tamani/clients';
import { jsonOk, validationFailed } from '@/lib/server/tamani/http';
import { shopHandler } from '@/lib/server/tamani/route';
import { shopPlan } from '@/lib/server/tamani/shop';

export const GET = shopHandler('MEMBER', async (req, { params }) => {
  const url = new URL(req.url);
  const filters = parseClientFilters(url.searchParams);
  if (!filters) return validationFailed();
  const plan = await shopPlan(prisma, params.orgId, new Date());
  const page = await listClients(
    prisma,
    params.orgId,
    filters,
    decodeCursor(url.searchParams.get('cursor')),
    {
      canSeeContacts: plan.features.respondentContacts,
      limit: clampLimit(url.searchParams.get('limit')),
    },
  );
  return jsonOk(page);
});
