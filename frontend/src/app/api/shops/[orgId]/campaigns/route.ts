// GET|POST /api/shops/[orgId]/campaigns.
//
// GET filters by effective status (?status=) and searches the title or the
// product name (?q=); its first page also counts the shop's campaigns per
// effective status, for the filter chips.
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
import {
  effectiveStatusWhere,
  isPastArrival,
  type CampaignStatus,
} from '@/lib/server/tamani/campaign-status';
import { tamaniError } from '@/lib/server/tamani/errors';
import { jsonOk, readJson, validationFailed } from '@/lib/server/tamani/http';
import { CampaignCreate, SEARCH_MAX } from '@/lib/server/tamani/inputs';
import { shopHandler } from '@/lib/server/tamani/route';
import { toCampaign } from '@/lib/server/tamani/serializers';
import { withUniqueCode } from '@/lib/server/tamani/short-code';

const STATUSES: readonly CampaignStatus[] = ['ACTIVE', 'DRAFT', 'CLOSED', 'ARRIVED'];

async function countByStatus(organizationId: string, now: Date) {
  const [all, ...perStatus] = await Promise.all([
    prisma.campaign.count({ where: { organizationId } }),
    ...STATUSES.map((s) =>
      prisma.campaign.count({ where: { organizationId, ...effectiveStatusWhere(s, now) } }),
    ),
  ]);
  return {
    all,
    ...Object.fromEntries(STATUSES.map((s, i) => [s, perStatus[i] ?? 0])),
  } as { all: number } & Record<CampaignStatus, number>;
}

export const GET = shopHandler('MEMBER', async (req, { params }) => {
  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  if (status !== null && !(STATUSES as readonly string[]).includes(status)) {
    return validationFailed('Unknown status');
  }
  const q = (url.searchParams.get('q') ?? '').trim();
  if (q.length > SEARCH_MAX) return validationFailed('Search too long');
  const now = new Date();
  const limit = clampLimit(url.searchParams.get('limit'));
  const cursor = decodeCursor(url.searchParams.get('cursor'));
  const search = q
    ? {
        OR: [
          { title: { contains: q, mode: 'insensitive' as const } },
          { product: { name: { contains: q, mode: 'insensitive' as const } } },
        ],
      }
    : {};
  const [rows, counts] = await Promise.all([
    prisma.campaign.findMany({
      where: {
        organizationId: params.orgId,
        // AND, not a spread: the fragments may each carry an OR.
        AND: [
          status ? effectiveStatusWhere(status as CampaignStatus, now) : {},
          search,
          cursorWhere(cursor),
        ],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: { product: true, links: { where: { isDefault: true } } },
    }),
    cursor ? null : countByStatus(params.orgId, now),
  ]);
  const page = buildPage(rows, limit);
  return jsonOk({
    items: page.items.map((c) => toCampaign(c, now)),
    nextCursor: page.nextCursor,
    counts,
  });
});

export const POST = shopHandler('MEMBER', async (req, { params }) => {
  const parsed = CampaignCreate.safeParse(await readJson(req));
  if (!parsed.success) return validationFailed();
  const { productId, title, status, ...fields } = parsed.data;
  const now = new Date();
  if (fields.endsAt && fields.endsAt <= now) {
    return validationFailed('endsAt must be in the future');
  }
  if (
    fields.availability === 'INCOMING' &&
    fields.availableAt &&
    isPastArrival(fields.availableAt, now)
  ) {
    return validationFailed('availableAt must not be in the past');
  }

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
