// GET|POST /api/shops/[orgId]/campaigns.
//
// POST creates the campaign and its default share link in one transaction.
// An ACTIVE campaign passes the plan limit first (FREE: 3 effectively
// active). A link-code collision aborts the Postgres transaction, so
// withUniqueCode retries the whole transaction with a new code.
export const runtime = 'nodejs';

import 'server-only';
import { prisma } from '@/lib/server/prisma';
import { buildPage, clampLimit, cursorWhere, decodeCursor } from '@/lib/server/pagination/paginate';
import { CampaignLimitReached, assertActivationAllowed } from '@/lib/server/tamani/campaign-limit';
import { effectiveStatusWhere, type CampaignStatus } from '@/lib/server/tamani/campaign-status';
import { tamaniError } from '@/lib/server/tamani/errors';
import { jsonOk, readJson, validationFailed } from '@/lib/server/tamani/http';
import { CampaignCreate } from '@/lib/server/tamani/inputs';
import { shopHandler } from '@/lib/server/tamani/route';
import { toCampaign } from '@/lib/server/tamani/serializers';
import { withUniqueCode } from '@/lib/server/tamani/short-code';

const STATUSES: readonly string[] = ['DRAFT', 'ACTIVE', 'CLOSED', 'ARRIVED'];

export const GET = shopHandler('MEMBER', async (req, { params }) => {
  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  if (status !== null && !STATUSES.includes(status)) return validationFailed('Unknown status');
  const now = new Date();
  const limit = clampLimit(url.searchParams.get('limit'));
  const cursor = decodeCursor(url.searchParams.get('cursor'));
  const rows = await prisma.campaign.findMany({
    where: {
      organizationId: params.orgId,
      // AND, not a spread: both fragments may carry an OR.
      AND: [status ? effectiveStatusWhere(status as CampaignStatus, now) : {}, cursorWhere(cursor)],
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    include: { product: true, links: { where: { isDefault: true } } },
  });
  const page = buildPage(rows, limit);
  return jsonOk({ items: page.items.map((c) => toCampaign(c, now)), nextCursor: page.nextCursor });
});

export const POST = shopHandler('MEMBER', async (req, { params }) => {
  const parsed = CampaignCreate.safeParse(await readJson(req));
  if (!parsed.success) return validationFailed();
  const { productId, title, status, ...fields } = parsed.data;
  const now = new Date();
  if (fields.endsAt && fields.endsAt <= now)
    return validationFailed('endsAt must be in the future');

  const product = await prisma.product.findFirst({
    where: { id: productId, organizationId: params.orgId, archivedAt: null },
  });
  if (!product) return tamaniError('PRODUCT_NOT_FOUND', 404);

  try {
    const campaign = await withUniqueCode((code) =>
      prisma.$transaction(async (tx) => {
        if (status === 'ACTIVE') await assertActivationAllowed(tx, params.orgId, now, null);
        return tx.campaign.create({
          data: {
            ...fields,
            title: title ?? product.name,
            status,
            organizationId: params.orgId,
            productId: product.id,
            links: { create: { code, label: 'Lien principal', isDefault: true } },
          },
          include: { product: true, links: true },
        });
      }),
    );
    return jsonOk({ campaign: toCampaign(campaign, now) }, 201);
  } catch (err) {
    if (err instanceof CampaignLimitReached) return tamaniError('CAMPAIGN_LIMIT_REACHED', 409);
    throw err;
  }
});
