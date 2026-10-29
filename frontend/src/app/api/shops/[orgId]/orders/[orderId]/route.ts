// GET|PATCH /api/shops/[orgId]/orders/[orderId] (lot 7, spec §5.5.1).
//
// PATCH moves the status (TO_CONFIRM → CONFIRMED | CANCELLED, CONFIRMED →
// FULFILLED | CANCELLED, each dated), sets « payé » apart from the status,
// and changes the price or the quantity only before confirmation; anything
// else is 409 INVALID_ORDER_TRANSITION. An order of another shop is 404
// ORDER_NOT_FOUND.
export const runtime = 'nodejs';

import 'server-only';
import { prisma } from '@/lib/server/prisma';
import { tamaniError } from '@/lib/server/tamani/errors';
import { jsonOk, readJson, validationFailed } from '@/lib/server/tamani/http';
import { OrderPatch, compact } from '@/lib/server/tamani/inputs';
import { getOrder, updateOrder } from '@/lib/server/tamani/order-queries';
import { orderFailure } from '@/lib/server/tamani/orders';
import { shopHandler } from '@/lib/server/tamani/route';
import { shopPlan } from '@/lib/server/tamani/shop';

type Params = { orgId: string; orderId: string };

export const GET = shopHandler<Params>('MEMBER', async (_req, { params }) => {
  const plan = await shopPlan(prisma, params.orgId, new Date());
  const order = await getOrder(prisma, params.orgId, params.orderId, {
    canSeeContacts: plan.features.respondentContacts,
  });
  if (!order) return tamaniError('ORDER_NOT_FOUND', 404);
  return jsonOk({ order });
});

export const PATCH = shopHandler<Params>('MEMBER', async (req, { params }) => {
  const parsed = OrderPatch.safeParse(await readJson(req));
  if (!parsed.success) return validationFailed();
  const now = new Date();
  const plan = await shopPlan(prisma, params.orgId, now);
  try {
    const order = await prisma.$transaction((tx) =>
      updateOrder(tx, params.orgId, params.orderId, compact(parsed.data), now, {
        canSeeContacts: plan.features.respondentContacts,
      }),
    );
    return jsonOk({ order });
  } catch (err) {
    return orderFailure(err);
  }
});
