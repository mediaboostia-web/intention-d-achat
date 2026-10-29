// GET|POST /api/shops/[orgId]/products — the shop's catalogue. Listing
// hides archived products unless ?archived=1, keeps those with an open
// campaign with ?inCampaign=1 and searches names with ?q=; cursor
// pagination as in the kit's admin listings. The first page also counts
// the products on sale, in a campaign and archived, for the filter chips.
export const runtime = 'nodejs';

import 'server-only';
import { prisma } from '@/lib/server/prisma';
import { buildPage, clampLimit, cursorWhere, decodeCursor } from '@/lib/server/pagination/paginate';
import { jsonOk, readJson, validationFailed } from '@/lib/server/tamani/http';
import { activeCampaignWhere } from '@/lib/server/tamani/campaign-status';
import { ProductCreate, SEARCH_MAX, checkProductRules } from '@/lib/server/tamani/inputs';
import { advisoryXactLock } from '@/lib/server/tamani/locks';
import { shopHandler } from '@/lib/server/tamani/route';
import { shopCountryLock } from '@/lib/server/tamani/shop';
import { toShopProduct } from '@/lib/server/tamani/serializers';

async function countViews(organizationId: string, now: Date) {
  const [sale, campaign, archived] = await Promise.all([
    prisma.product.count({ where: { organizationId, archivedAt: null } }),
    prisma.product.count({
      where: { organizationId, archivedAt: null, campaigns: { some: activeCampaignWhere(now) } },
    }),
    prisma.product.count({ where: { organizationId, archivedAt: { not: null } } }),
  ]);
  return { sale, campaign, archived };
}

export const GET = shopHandler('MEMBER', async (req, { params }) => {
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  if (q.length > SEARCH_MAX) return validationFailed('Search too long');
  const now = new Date();
  const limit = clampLimit(url.searchParams.get('limit'));
  const cursor = decodeCursor(url.searchParams.get('cursor'));
  const [rows, counts] = await Promise.all([
    prisma.product.findMany({
      where: {
        organizationId: params.orgId,
        ...(url.searchParams.get('archived') === '1' ? {} : { archivedAt: null }),
        ...(url.searchParams.get('inCampaign') === '1'
          ? { campaigns: { some: activeCampaignWhere(now) } }
          : {}),
        ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}),
        ...cursorWhere(cursor),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    }),
    cursor ? null : countViews(params.orgId, now),
  ]);
  const page = buildPage(rows, limit);
  return jsonOk({ items: page.items.map(toShopProduct), nextCursor: page.nextCursor, counts });
});

export const POST = shopHandler('MEMBER', async (req, { params }) => {
  const parsed = ProductCreate.safeParse(await readJson(req));
  if (!parsed.success) return validationFailed();
  const broken = checkProductRules(parsed.data);
  if (broken) return validationFailed(broken);
  // The shop-country lock: a country change running now waits, then sees this product (lot 7b).
  const product = await prisma.$transaction(async (tx) => {
    await advisoryXactLock(tx, shopCountryLock(params.orgId));
    return tx.product.create({ data: { ...parsed.data, organizationId: params.orgId } });
  });
  return jsonOk({ product: toShopProduct(product) }, 201);
});
