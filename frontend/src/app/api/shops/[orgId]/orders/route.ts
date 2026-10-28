// GET|POST /api/shops/[orgId]/orders (lot 7, spec §5.5.1).
//
// GET: the shop's orders, newest first, filtered by ?statut, ?campagne,
// ?produit and ?quartier, with a cursor and the counts per status on the
// first page; ?vue=a-livrer answers { groups } instead, the confirmed
// deliveries grouped by zone. POST: an order typed by hand, the client
// found by their number or added to the book. Free gets masked numbers.
export const runtime = 'nodejs';

import 'server-only';
import { decodeCursor } from '@/lib/server/notifications/cursor';
import { clampLimit } from '@/lib/server/pagination/paginate';
import { prisma } from '@/lib/server/prisma';
import { tamaniError } from '@/lib/server/tamani/errors';
import { jsonOk, readJson, validationFailed } from '@/lib/server/tamani/http';
import { OrderCreate } from '@/lib/server/tamani/inputs';
import {
  createManualOrder,
  getOrder,
  listOrders,
  ordersToDeliver,
} from '@/lib/server/tamani/order-queries';
import { orderFailure } from '@/lib/server/tamani/orders';
import { shopCountry } from '@/lib/server/tamani/phone';
import { shopHandler } from '@/lib/server/tamani/route';
import { shopPlan } from '@/lib/server/tamani/shop';
import { parseOrderSearch } from '@/lib/tamani/orders-view';

export const GET = shopHandler('MEMBER', async (req, { params }) => {
  const url = new URL(req.url);
  const filters = parseOrderSearch(url.searchParams);
  if (!filters) return validationFailed();
  const plan = await shopPlan(prisma, params.orgId, new Date());
  const canSeeContacts = plan.features.respondentContacts;
  if (filters.view === 'to-deliver') {
    return jsonOk({ groups: await ordersToDeliver(prisma, params.orgId, { canSeeContacts }) });
  }
  const page = await listOrders(
    prisma,
    params.orgId,
    filters,
    decodeCursor(url.searchParams.get('cursor')),
    { canSeeContacts, limit: clampLimit(url.searchParams.get('limit')) },
  );
  return jsonOk(page);
});

export const POST = shopHandler('MEMBER', async (req, { params }) => {
  const parsed = OrderCreate.safeParse(await readJson(req));
  if (!parsed.success) return validationFailed();
  const now = new Date();
  const [shop, plan] = await Promise.all([
    prisma.organization.findFirst({ where: { id: params.orgId }, select: { country: true } }),
    shopPlan(prisma, params.orgId, now),
  ]);
  if (!shop) return tamaniError('SHOP_NOT_FOUND', 404);
  try {
    const order = await prisma.$transaction(async (tx) => {
      const { id } = await createManualOrder(
        tx,
        params.orgId,
        parsed.data,
        shopCountry(shop.country),
        now,
      );
      return getOrder(tx, params.orgId, id, {
        canSeeContacts: plan.features.respondentContacts,
      });
    });
    return jsonOk({ order }, 201);
  } catch (err) {
    return orderFailure(err);
  }
});
