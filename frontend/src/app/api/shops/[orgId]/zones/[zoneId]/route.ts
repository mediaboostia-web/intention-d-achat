// PATCH|DELETE /api/shops/[orgId]/zones/[zoneId] (ADMIN). Every query is
// scoped by organizationId: a zone of another shop is 404. Deleting a zone
// leaves past responses in place with zoneId set to null.
export const runtime = 'nodejs';

import 'server-only';
import { prisma } from '@/lib/server/prisma';
import { isUniqueViolation, tamaniError } from '@/lib/server/tamani/errors';
import { jsonOk, readJson, validationFailed } from '@/lib/server/tamani/http';
import { ZonePatch, compact } from '@/lib/server/tamani/inputs';
import { shopHandler } from '@/lib/server/tamani/route';
import { toZone } from '@/lib/server/tamani/serializers';

type Params = { orgId: string; zoneId: string };

export const PATCH = shopHandler<Params>('ADMIN', async (req, { params }) => {
  const parsed = ZonePatch.safeParse(await readJson(req));
  if (!parsed.success) return validationFailed();
  const existing = await prisma.deliveryZone.findFirst({
    where: { id: params.zoneId, organizationId: params.orgId },
  });
  if (!existing) return tamaniError('ZONE_NOT_FOUND', 404);
  try {
    const zone = await prisma.deliveryZone.update({
      where: { id: existing.id },
      data: compact(parsed.data),
    });
    return jsonOk({ zone: toZone(zone) });
  } catch (err) {
    if (isUniqueViolation(err, 'name')) return tamaniError('ZONE_ALREADY_EXISTS', 409);
    throw err;
  }
});

export const DELETE = shopHandler<Params>('ADMIN', async (_req, { params }) => {
  const { count } = await prisma.deliveryZone.deleteMany({
    where: { id: params.zoneId, organizationId: params.orgId },
  });
  if (count === 0) return tamaniError('ZONE_NOT_FOUND', 404);
  return jsonOk({ deleted: true });
});
