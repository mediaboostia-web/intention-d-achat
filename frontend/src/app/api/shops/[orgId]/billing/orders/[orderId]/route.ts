// GET /api/shops/[orgId]/billing/orders/[orderId] — where a pass purchase
// stands (lot 8). The return page polls it: each call first asks SasPay
// (reconcileOrder) unless the pass is already active. SasPay down is not an
// error here: the purchase is sent as it stands and the next poll retries.
export const runtime = 'nodejs';

import 'server-only';
import { CircuitOpenError } from '@/lib/server/payments/circuit-breaker';
import { SaspayError, getSaspay } from '@/lib/server/payments/saspay';
import { prisma } from '@/lib/server/prisma';
import { reconcileOrder } from '@/lib/server/tamani/billing';
import { tamaniError } from '@/lib/server/tamani/errors';
import { jsonOk } from '@/lib/server/tamani/http';
import { shopHandler } from '@/lib/server/tamani/route';

const SELECT = { id: true, offer: true, status: true, activatedAt: true } as const;

export const GET = shopHandler<{ orgId: string; orderId: string }>(
  'MEMBER',
  async (_req, { params }) => {
    const where = { id: params.orderId, organizationId: params.orgId, provider: 'saspay' };
    let purchase = await prisma.order.findFirst({ where, select: SELECT });
    if (!purchase) return tamaniError('PURCHASE_NOT_FOUND', 404);

    const saspay = getSaspay();
    if (!purchase.activatedAt && saspay) {
      try {
        await reconcileOrder(prisma, saspay, purchase.id, new Date());
        purchase = (await prisma.order.findFirst({ where, select: SELECT })) ?? purchase;
      } catch (err) {
        if (!(err instanceof SaspayError || err instanceof CircuitOpenError)) throw err;
      }
    }
    return jsonOk({
      purchase: {
        id: purchase.id,
        offer: purchase.offer,
        status: purchase.status,
        activated: purchase.activatedAt !== null,
      },
    });
  },
);
