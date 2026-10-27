// The interested list of a campaign (spec §5.5): its counted answers, newest
// first, and the numbers to paste into a WhatsApp broadcast list. Without
// the plan's contacts (Free), no full number leaves here.
import 'server-only';
import type { Prisma } from '@prisma/client';
import type { BuyerType, NotInterestedReason } from '@/lib/tamani/labels';
import type { InterestedPage, InterestedRow } from '@/lib/tamani/results-view';
import type { Timing } from '@/lib/tamani/timing';
import type { Cursor } from '@/lib/server/notifications/cursor';
import { buildPage } from '@/lib/server/pagination/paginate';
import type { Db } from './locks';
import { displayPhone, maskPhone } from './phone';

export type ResponseFilter = 'yes' | 'no';

/** ?filtre=oui (the default) or non; anything else is refused. */
export function parseResponseFilter(raw: string | null): ResponseFilter | null {
  if (raw === null || raw === 'oui') return 'yes';
  return raw === 'non' ? 'no' : null;
}

/** An answer that counts: completed, within the quota, not suspicious. */
const COUNTED = {
  completedAt: { not: null },
  locked: false,
  suspicious: false,
} satisfies Prisma.ResponseWhereInput;

const MAX_NUMBERS = 5000;

const ROW_SELECT = {
  id: true,
  respondentId: true,
  interested: true,
  notInterestedReason: true,
  buyerType: true,
  quantity: true,
  option: true,
  timing: true,
  wantsDelivery: true,
  completedAt: true,
  zone: { select: { name: true } },
  link: { select: { label: true } },
  respondent: { select: { firstName: true, phoneE164: true, anonymizedAt: true } },
} satisfies Prisma.ResponseSelect;

type Row = Prisma.ResponseGetPayload<{ select: typeof ROW_SELECT }>;

function toRow(r: Row, canSeeContacts: boolean): InterestedRow {
  const who = r.respondent && !r.respondent.anonymizedAt ? r.respondent : null;
  const phone = who?.phoneE164 ?? null;
  return {
    id: r.id,
    respondentId: r.respondentId,
    firstName: who?.firstName ?? null,
    phone: phone === null ? null : canSeeContacts ? displayPhone(phone) : maskPhone(phone),
    phoneE164: canSeeContacts ? phone : null,
    interested: r.interested === true,
    reason: (r.notInterestedReason as NotInterestedReason | null) ?? null,
    buyerType: (r.buyerType as BuyerType | null) ?? null,
    quantity: r.quantity,
    option: r.option,
    timing: (r.timing as Timing | null) ?? null,
    wantsDelivery: r.wantsDelivery,
    zoneName: r.zone?.name ?? null,
    sourceLabel: r.link?.label ?? null,
    completedAt: (r.completedAt ?? new Date(0)).toISOString(),
  };
}

export async function listCampaignResponses(
  db: Db,
  organizationId: string,
  campaignId: string,
  filter: ResponseFilter,
  cursor: Cursor | null,
  opts: { canSeeContacts: boolean; limit: number },
): Promise<InterestedPage> {
  const scope = { campaignId, organizationId, ...COUNTED };
  const after: Prisma.ResponseWhereInput[] = cursor
    ? [
        {
          OR: [
            { completedAt: { lt: cursor.createdAt } },
            { completedAt: cursor.createdAt, id: { lt: cursor.id } },
          ],
        },
      ]
    : [];
  const [rows, counts] = await Promise.all([
    db.response.findMany({
      where: { ...scope, interested: filter === 'yes', AND: after },
      orderBy: [{ completedAt: 'desc' }, { id: 'desc' }],
      take: opts.limit + 1,
      select: ROW_SELECT,
    }),
    cursor
      ? null
      : Promise.all([
          db.response.count({ where: { ...scope, interested: true } }),
          db.response.count({ where: { ...scope, interested: false } }),
        ]).then(([yes, no]) => ({ yes, no })),
  ]);
  const page = buildPage(
    rows.map((r) => ({ ...r, createdAt: r.completedAt ?? new Date(0) })),
    opts.limit,
  );
  return {
    items: page.items.map((r) => toRow(r, opts.canSeeContacts)),
    nextCursor: page.nextCursor,
    counts,
  };
}

const MAX_EXPORT_ROWS = 20_000;

/** Every counted answer, oldest first, numbers included: the export route checks the plan. */
export async function campaignExportRows(
  db: Db,
  organizationId: string,
  campaignId: string,
): Promise<InterestedRow[]> {
  const rows = await db.response.findMany({
    where: { campaignId, organizationId, ...COUNTED },
    orderBy: [{ completedAt: 'asc' }, { id: 'asc' }],
    take: MAX_EXPORT_ROWS,
    select: ROW_SELECT,
  });
  return rows.map((r) => toRow(r, true));
}

/** The interested numbers, each once, as "+221 77 123 45 12". Pro only: the route checks. */
export async function interestedNumbers(
  db: Db,
  organizationId: string,
  campaignId: string,
): Promise<string[]> {
  const rows = await db.response.findMany({
    where: {
      campaignId,
      organizationId,
      ...COUNTED,
      interested: true,
      respondent: { anonymizedAt: null, phoneE164: { not: null } },
    },
    orderBy: [{ completedAt: 'desc' }, { id: 'desc' }],
    take: MAX_NUMBERS,
    select: { respondent: { select: { phoneE164: true } } },
  });
  const numbers = new Set<string>();
  for (const r of rows) {
    if (r.respondent?.phoneE164) numbers.add(r.respondent.phoneE164);
  }
  return [...numbers].map(displayPhone);
}
