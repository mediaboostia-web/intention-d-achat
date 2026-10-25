// GET /api/shops/[orgId]/products/units — the units the shop's products
// already use (archived ones too), for the product form's chips.
export const runtime = 'nodejs';

import 'server-only';
import { prisma } from '@/lib/server/prisma';
import { jsonOk } from '@/lib/server/tamani/http';
import { shopHandler } from '@/lib/server/tamani/route';

export const GET = shopHandler('MEMBER', async (_req, { params }) => {
  const rows = await prisma.product.findMany({
    where: { organizationId: params.orgId },
    distinct: ['unitLabel'],
    select: { unitLabel: true },
    orderBy: { unitLabel: 'asc' },
    take: 50,
  });
  return jsonOk({ units: rows.map((r) => r.unitLabel) });
});
