// GET|PATCH /api/shops/[orgId] — read (MEMBER) and edit (ADMIN) the shop
// settings. The slug never changes after creation: "Propulsé par Tamani"
// links carry it as ?ref=.
export const runtime = 'nodejs';

import 'server-only';
import { prisma } from '@/lib/server/prisma';
import { tamaniError } from '@/lib/server/tamani/errors';
import { jsonOk, readJson, validationFailed } from '@/lib/server/tamani/http';
import { ShopPatch, compact } from '@/lib/server/tamani/inputs';
import { normalizePhone, shopCountry } from '@/lib/server/tamani/phone';
import { shopHandler } from '@/lib/server/tamani/route';
import { toShop } from '@/lib/server/tamani/serializers';

export const GET = shopHandler('MEMBER', async (_req, { params }) => {
  const org = await prisma.organization.findUnique({
    where: { id: params.orgId },
    include: { subscription: true },
  });
  if (!org) return tamaniError('SHOP_NOT_FOUND', 404);
  return jsonOk({ shop: toShop(org, org.subscription, new Date()) });
});

export const PATCH = shopHandler('ADMIN', async (req, { params }) => {
  const parsed = ShopPatch.safeParse(await readJson(req));
  if (!parsed.success) return validationFailed();
  const data = compact(parsed.data);

  if (data.whatsappPhone !== undefined) {
    const current = await prisma.organization.findUnique({
      where: { id: params.orgId },
      select: { country: true },
    });
    const phone = normalizePhone(
      data.whatsappPhone,
      shopCountry(data.country ?? current?.country ?? 'SN'),
    );
    if (!phone) return tamaniError('INVALID_PHONE', 400);
    data.whatsappPhone = phone;
  }

  const org = await prisma.organization.update({
    where: { id: params.orgId },
    data,
    include: { subscription: true },
  });
  return jsonOk({ shop: toShop(org, org.subscription, new Date()) });
});
