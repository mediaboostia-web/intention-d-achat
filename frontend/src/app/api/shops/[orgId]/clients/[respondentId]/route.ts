// GET /api/shops/[orgId]/clients/[respondentId] — one client and every
// counted answer. A hidden client (all answers locked or suspicious) or a
// client of another shop is 404 CLIENT_NOT_FOUND.
export const runtime = 'nodejs';

import 'server-only';
import { prisma } from '@/lib/server/prisma';
import { getClient } from '@/lib/server/tamani/clients';
import { tamaniError } from '@/lib/server/tamani/errors';
import { jsonOk } from '@/lib/server/tamani/http';
import { shopHandler } from '@/lib/server/tamani/route';
import { shopPlan } from '@/lib/server/tamani/shop';

export const GET = shopHandler<{ orgId: string; respondentId: string }>(
  'MEMBER',
  async (_req, { params }) => {
    const plan = await shopPlan(prisma, params.orgId, new Date());
    const client = await getClient(prisma, params.orgId, params.respondentId, {
      canSeeContacts: plan.features.respondentContacts,
    });
    if (!client) return tamaniError('CLIENT_NOT_FOUND', 404);
    return jsonOk({ client });
  },
);
