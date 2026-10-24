// GET|POST /api/shops/[orgId]/zones — the neighbourhoods a shop delivers
// to; the popup offers them when a campaign proposes delivery.
export const runtime = 'nodejs';

import 'server-only';
import { prisma } from '@/lib/server/prisma';
import { isUniqueViolation, tamaniError } from '@/lib/server/tamani/errors';
import { jsonOk, readJson, validationFailed } from '@/lib/server/tamani/http';
import { ZoneCreate } from '@/lib/server/tamani/inputs';
import { shopHandler } from '@/lib/server/tamani/route';
import { toZone } from '@/lib/server/tamani/serializers';

export const GET = shopHandler('MEMBER', async (_req, { params }) => {
  const zones = await prisma.deliveryZone.findMany({
    where: { organizationId: params.orgId },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  return jsonOk({ items: zones.map(toZone) });
});

export const POST = shopHandler('ADMIN', async (req, { params }) => {
  const parsed = ZoneCreate.safeParse(await readJson(req));
  if (!parsed.success) return validationFailed();
  try {
    const zone = await prisma.deliveryZone.create({
      data: { organizationId: params.orgId, ...parsed.data },
    });
    return jsonOk({ zone: toZone(zone) }, 201);
  } catch (err) {
    if (isUniqueViolation(err, 'name')) return tamaniError('ZONE_ALREADY_EXISTS', 409);
    throw err;
  }
});
