// POST /api/shops — create the caller's shop (one per account in v1).
//
// The Organization, its OWNER membership and the trial Subscription are
// created in one transaction. A transaction-scoped advisory lock on the
// user, then a membership re-check inside it, make a double tap on
// "Créer ma boutique" create a single shop (409 SHOP_ALREADY_EXISTS for
// the second). A slug taken by another shop is retried as "<slug>-2"…
export const runtime = 'nodejs';

import 'server-only';
import { currencyForCountry } from '@/lib/tamani/countries';
import { NextResponse, type NextRequest } from 'next/server';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { ensureUniqueSlug, slugify } from '@/lib/server/slug';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { isUniqueViolation, tamaniError } from '@/lib/server/tamani/errors';
import { jsonOk, readJson, validationFailed } from '@/lib/server/tamani/http';
import { ShopCreate } from '@/lib/server/tamani/inputs';
import { advisoryXactLock } from '@/lib/server/tamani/locks';
import { normalizePhone, shopCountry } from '@/lib/server/tamani/phone';
import { toShop } from '@/lib/server/tamani/serializers';
import { getShopForUser } from '@/lib/server/tamani/shop';
import { trialPass } from '@/lib/server/tamani/subscription';

class ShopAlreadyExists extends Error {}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return withRequestContext(makeRequestContext(req.headers), async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const parsed = ShopCreate.safeParse(await readJson(req));
    if (!parsed.success) return validationFailed();
    const { name, whatsappPhone, country, logoUrl } = parsed.data;
    const phone = normalizePhone(whatsappPhone, shopCountry(country));
    if (!phone) return tamaniError('INVALID_PHONE', 400);

    const userId = auth.user.sub;
    const createShop = (slug: string) =>
      prisma.$transaction(async (tx) => {
        await advisoryXactLock(tx, `shop-create:${userId}`);
        if (await getShopForUser(tx, userId)) throw new ShopAlreadyExists();
        return tx.organization.create({
          data: {
            slug,
            name,
            ownerId: userId,
            whatsappPhone: phone,
            country,
            currency: currencyForCountry(country),
            logoUrl: logoUrl ?? null,
            members: { create: { userId, role: 'OWNER' } },
            subscription: { create: trialPass(new Date()) },
          },
          include: { subscription: true },
        });
      });

    let shop: Awaited<ReturnType<typeof createShop>> | undefined;
    try {
      await ensureUniqueSlug(
        slugify(name, { maxLength: 48 }) || 'boutique',
        async (slug) => {
          shop = await createShop(slug);
        },
        { isCollision: (err) => isUniqueViolation(err, 'slug') },
      );
    } catch (err) {
      if (err instanceof ShopAlreadyExists) return tamaniError('SHOP_ALREADY_EXISTS', 409);
      throw err;
    }
    if (!shop) throw new Error('shop creation returned nothing');
    return jsonOk({ shop: toShop(shop, shop.subscription, new Date()) }, 201);
  });
}
