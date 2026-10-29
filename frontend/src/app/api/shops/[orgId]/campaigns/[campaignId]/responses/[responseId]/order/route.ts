// POST /api/shops/[orgId]/campaigns/[campaignId]/responses/[responseId]/order
// (lot 7, spec §5.5.1): « Transformer en commande ». One order per answer:
// a second tap, even at the same instant, is 409 ORDER_ALREADY_EXISTS. A
// « Non » is 409 RESPONSE_NOT_INTERESTED; an answer absent, of another shop
// or campaign, or not counted is 404 RESPONSE_NOT_FOUND.
export const runtime = 'nodejs';

import 'server-only';
import { prisma } from '@/lib/server/prisma';
import { jsonOk } from '@/lib/server/tamani/http';
import { getOrder } from '@/lib/server/tamani/order-queries';
import { convertResponseToOrder, orderFailure } from '@/lib/server/tamani/orders';
import { shopHandler } from '@/lib/server/tamani/route';
import { shopPlan } from '@/lib/server/tamani/shop';

type Params = { orgId: string; campaignId: string; responseId: string };

export const POST = shopHandler<Params>('MEMBER', async (_req, { params }) => {
  const now = new Date();
  const plan = await shopPlan(prisma, params.orgId, now);
  try {
    const order = await prisma.$transaction(async (tx) => {
      const { id } = await convertResponseToOrder(tx, params.orgId, params.responseId, now, {
        campaignId: params.campaignId,
      });
      return getOrder(tx, params.orgId, id, {
        canSeeContacts: plan.features.respondentContacts,
      });
    });
    return jsonOk({ order }, 201);
  } catch (err) {
    return orderFailure(err);
  }
});
