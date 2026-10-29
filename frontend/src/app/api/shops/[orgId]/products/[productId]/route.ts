// GET|PATCH|DELETE /api/shops/[orgId]/products/[productId].
//
// DELETE (ADMIN) never breaks a campaign: a product with an active
// campaign is refused (409 PRODUCT_IN_USE), a product with past campaigns
// or with orders is archived (its share links then read "campagne
// terminée"), and only a product never tested nor ordered is really deleted.
export const runtime = 'nodejs';

import 'server-only';
import { prisma } from '@/lib/server/prisma';
import { activeCampaignWhere } from '@/lib/server/tamani/campaign-status';
import { tamaniError } from '@/lib/server/tamani/errors';
import { jsonOk, readJson, validationFailed } from '@/lib/server/tamani/http';
import { ProductPatch, checkProductRules, compact } from '@/lib/server/tamani/inputs';
import { shopHandler } from '@/lib/server/tamani/route';
import { toShopProduct } from '@/lib/server/tamani/serializers';

type Params = { orgId: string; productId: string };

const findProduct = (p: Params) =>
  prisma.product.findFirst({ where: { id: p.productId, organizationId: p.orgId } });

export const GET = shopHandler<Params>('MEMBER', async (_req, { params }) => {
  const product = await findProduct(params);
  if (!product) return tamaniError('PRODUCT_NOT_FOUND', 404);
  return jsonOk({ product: toShopProduct(product) });
});

export const PATCH = shopHandler<Params>('MEMBER', async (req, { params }) => {
  const parsed = ProductPatch.safeParse(await readJson(req));
  if (!parsed.success) return validationFailed();
  const existing = await findProduct(params);
  if (!existing) return tamaniError('PRODUCT_NOT_FOUND', 404);
  const data = compact(parsed.data);
  const broken = checkProductRules({ ...existing, ...data });
  if (broken) return validationFailed(broken);
  const product = await prisma.product.update({ where: { id: existing.id }, data });
  return jsonOk({ product: toShopProduct(product) });
});

export const DELETE = shopHandler<Params>('ADMIN', async (_req, { params }) => {
  const existing = await findProduct(params);
  if (!existing) return tamaniError('PRODUCT_NOT_FOUND', 404);
  const now = new Date();
  const scope = { organizationId: params.orgId, productId: existing.id };

  const active = await prisma.campaign.count({ where: { ...scope, ...activeCampaignWhere(now) } });
  if (active > 0) return tamaniError('PRODUCT_IN_USE', 409);

  // Past campaigns or orders (lot 7, SaleOrder.product is Restrict): archived, never deleted.
  const [campaigns, orders] = await Promise.all([
    prisma.campaign.count({ where: scope }),
    prisma.saleOrder.count({ where: scope }),
  ]);
  if (campaigns > 0 || orders > 0) {
    const product = await prisma.product.update({
      where: { id: existing.id },
      data: { archivedAt: now },
    });
    return jsonOk({ archived: true, product: toShopProduct(product) });
  }

  await prisma.product.deleteMany({ where: { id: existing.id, organizationId: params.orgId } });
  return jsonOk({ deleted: true });
});
