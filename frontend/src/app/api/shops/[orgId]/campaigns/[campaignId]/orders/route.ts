// GET /api/shops/[orgId]/campaigns/[campaignId]/orders (lot 7, spec
// §5.5.1): the campaign's orders, newest first with a cursor, and its
// quantities to confirm, confirmed and delivered against the stock. The
// stock left is a display, never a block. Free gets masked numbers.
export const runtime = 'nodejs';

import 'server-only';
import { decodeCursor } from '@/lib/server/notifications/cursor';
import { clampLimit } from '@/lib/server/pagination/paginate';
import { prisma } from '@/lib/server/prisma';
import { jsonOk } from '@/lib/server/tamani/http';
import { campaignOrderSummary, listOrders } from '@/lib/server/tamani/order-queries';
import { orderFailure } from '@/lib/server/tamani/orders';
import { shopHandler } from '@/lib/server/tamani/route';
import { shopPlan } from '@/lib/server/tamani/shop';
import { NO_ORDER_FILTERS } from '@/lib/tamani/orders-view';

type Params = { orgId: string; campaignId: string };

export const GET = shopHandler<Params>('MEMBER', async (req, { params }) => {
  const url = new URL(req.url);
  try {
    const summary = await campaignOrderSummary(prisma, params.orgId, params.campaignId);
    const plan = await shopPlan(prisma, params.orgId, new Date());
    const page = await listOrders(
      prisma,
      params.orgId,
      { ...NO_ORDER_FILTERS, campaignId: params.campaignId },
      decodeCursor(url.searchParams.get('cursor')),
      {
        canSeeContacts: plan.features.respondentContacts,
        limit: clampLimit(url.searchParams.get('limit')),
        counts: false,
      },
    );
    return jsonOk({ items: page.items, nextCursor: page.nextCursor, summary });
  } catch (err) {
    return orderFailure(err);
  }
});
