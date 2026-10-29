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
class InvalidPhone extends Error {}

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

  try {
    const org = await prisma.$transaction(async (tx) => {
      // A country sent is read under the lock, so two tabs cannot leave a
      // country with another country's currency; a refused move answers
      // before the number is checked against the new country.
      if (data.country !== undefined) await advisoryXactLock(tx, shopCountryLock(params.orgId));
      const current = await tx.organization.findUnique({
        where: { id: params.orgId },
        select: { country: true },
      });
      const moves = data.country !== undefined && data.country !== current?.country;
      if (moves && (await shopHasProducts(tx, params.orgId))) throw new CountryLocked();
      if (data.whatsappPhone !== undefined) {
        const phone = normalizePhone(
          data.whatsappPhone,
          shopCountry(data.country ?? current?.country ?? 'SN'),
        );
        if (!phone) throw new InvalidPhone();
        data.whatsappPhone = phone;
      }
      return tx.organization.update({
        where: { id: params.orgId },
        data: {
          ...data,
          ...(data.country !== undefined && { currency: currencyForCountry(data.country) }),
        },
        include: { subscription: true },
      });
    });
    const locked = await shopHasProducts(prisma, params.orgId);
    return jsonOk({ shop: toShop(org, org.subscription, new Date(), locked) });
  } catch (err) {
    if (err instanceof CountryLocked) return tamaniError('SHOP_COUNTRY_LOCKED', 409);
    if (err instanceof InvalidPhone) return tamaniError('INVALID_PHONE', 400);
    throw err;
  }
});
