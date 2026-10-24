// GET|POST /api/shops/[orgId]/products — the shop's catalogue. Listing
// hides archived products unless ?archived=1; cursor pagination as in the
// kit's admin listings.
export const runtime = 'nodejs';

import 'server-only';
import { prisma } from '@/lib/server/prisma';
import { buildPage, clampLimit, cursorWhere, decodeCursor } from '@/lib/server/pagination/paginate';
import { jsonOk, readJson, validationFailed } from '@/lib/server/tamani/http';
import { ProductCreate, checkProductRules } from '@/lib/server/tamani/inputs';
import { shopHandler } from '@/lib/server/tamani/route';
import { toShopProduct } from '@/lib/server/tamani/serializers';

export const GET = shopHandler('MEMBER', async (req, { params }) => {
  const url = new URL(req.url);
  const limit = clampLimit(url.searchParams.get('limit'));
  const cursor = decodeCursor(url.searchParams.get('cursor'));
  const rows = await prisma.product.findMany({
    where: {
      organizationId: params.orgId,
      ...(url.searchParams.get('archived') === '1' ? {} : { archivedAt: null }),
      ...cursorWhere(cursor),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
  });
  const page = buildPage(rows, limit);
  return jsonOk({ items: page.items.map(toShopProduct), nextCursor: page.nextCursor });
});

export const POST = shopHandler('MEMBER', async (req, { params }) => {
  const parsed = ProductCreate.safeParse(await readJson(req));
  if (!parsed.success) return validationFailed();
  const broken = checkProductRules(parsed.data);
  if (broken) return validationFailed(broken);
  const product = await prisma.product.create({
    data: { ...parsed.data, organizationId: params.orgId },
  });
  return jsonOk({ product: toShopProduct(product) }, 201);
});
