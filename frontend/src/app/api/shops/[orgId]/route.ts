// GET|PATCH /api/shops/[orgId] — read (MEMBER) and edit (ADMIN) the shop
// settings. The slug never changes after creation: "Propulsé par Tamani"
// links carry it as ?ref=. The country carries the currency (lot 7b): it
// changes only while the shop has no product, under the shop-country lock
// every product creation also takes, so a racing first product cannot slip
// under a currency change.
export const runtime = 'nodejs';

import 'server-only';
import { prisma } from '@/lib/server/prisma';
import { tamaniError } from '@/lib/server/tamani/errors';
import { jsonOk, readJson, validationFailed } from '@/lib/server/tamani/http';
import { ShopPatch, compact } from '@/lib/server/tamani/inputs';
import { advisoryXactLock } from '@/lib/server/tamani/locks';
import { normalizePhone, shopCountry } from '@/lib/server/tamani/phone';
import { shopHandler } from '@/lib/server/tamani/route';
import { toShop } from '@/lib/server/tamani/serializers';
import { shopCountryLock, shopHasProducts } from '@/lib/server/tamani/shop';
import { currencyForCountry } from '@/lib/tamani/countries';

class CountryLocked extends Error {}

export const GET = shopHandler('MEMBER', async (_req, { params }) => {
  const [org, locked] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: params.orgId },
      include: { subscription: true },
    }),
    shopHasProducts(prisma, params.orgId),
  ]);
  if (!org) return tamaniError('SHOP_NOT_FOUND', 404);
  return jsonOk({ shop: toShop(org, org.subscription, new Date(), locked) });
});

export const PATCH = shopHandler('ADMIN', async (req, { params }) => {
  const parsed = ShopPatch.safeParse(await readJson(req));
  if (!parsed.success) return validationFailed();
  const data = compact(parsed.data);

  const current = await prisma.organization.findUnique({
    where: { id: params.orgId },
    select: { country: true },
  });
  if (data.whatsappPhone !== undefined) {
    const phone = normalizePhone(
      data.whatsappPhone,
      shopCountry(data.country ?? current?.country ?? 'SN'),
    );
    if (!phone) return tamaniError('INVALID_PHONE', 400);
    data.whatsappPhone = phone;
  }

  const moves = data.country !== undefined && data.country !== current?.country;
  try {
    const org = moves
      ? await prisma.$transaction(async (tx) => {
          await advisoryXactLock(tx, shopCountryLock(params.orgId));
          if (await shopHasProducts(tx, params.orgId)) throw new CountryLocked();
          return tx.organization.update({
            where: { id: params.orgId },
            data: { ...data, currency: currencyForCountry(data.country ?? 'SN') },
            include: { subscription: true },
          });
        })
      : await prisma.organization.update({
          where: { id: params.orgId },
          data,
          include: { subscription: true },
        });
    const locked = await shopHasProducts(prisma, params.orgId);
    return jsonOk({ shop: toShop(org, org.subscription, new Date(), locked) });
  } catch (err) {
    if (err instanceof CountryLocked) return tamaniError('SHOP_COUNTRY_LOCKED', 409);
    throw err;
  }
});
