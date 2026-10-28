// The shop's client book (porteur's feedback §3 bis, advanced from lot 7).
// A client shows only once one of their answers counts: completed, not over
// the monthly quota and not suspicious. A client whose answers are all
// locked stays hidden until the upgrade, like the answers themselves.
// Without the plan's respondentContacts (Free), no full number leaves here.
import 'server-only';
import type { Prisma } from '@prisma/client';
import {
  parseClientSearch,
  periodRange,
  type ClientFilterState,
} from '@/lib/tamani/client-filters';
import type { BuyerType } from '@/lib/tamani/labels';
import { dialPrefixFor } from '@/lib/tamani/phone-countries';
import type {
  ClientCounts,
  ClientDetail,
  ClientInterest,
  ClientLast,
  ClientRow,
} from '@/lib/tamani/client-view';
import type { Cursor } from '@/lib/server/notifications/cursor';
import { buildPage } from '@/lib/server/pagination/paginate';
import type { Db } from './locks';
import { displayPhone, maskPhone } from './phone';

/** An answer that counts: completed, within the quota, not suspicious. */
const COUNTED = {
  completedAt: { not: null },
  locked: false,
  suspicious: false,
} satisfies Prisma.ResponseWhereInput;

/** Respondents the shop may see: not anonymized, with at least one counted answer. */
export function visibleClientWhere(organizationId: string) {
  return {
    organizationId,
    anonymizedAt: null,
    responses: { some: COUNTED },
  } satisfies Prisma.RespondentWhereInput;
}

export type ClientKind = 'ALL' | BuyerType;

/** The filters of lib/tamani/client-filters.ts, the type read as a kind. */
export interface ClientFilters extends Partial<Omit<ClientFilterState, 'type' | 'q'>> {
  q: string | null;
  kind: ClientKind;
}

/** ?type, ?reponse, ?campagne, ?quartier, ?periode, ?pays and ?q; null when one is unknown (400). */
export function parseClientFilters(params: URLSearchParams): ClientFilters | null {
  const state = parseClientSearch(params);
  if (!state) return null;
  const { type, ...rest } = state;
  return { ...rest, kind: type ?? 'ALL' };
}

function kindWhere(kind: BuyerType): Prisma.RespondentWhereInput {
  return { responses: { some: { ...COUNTED, buyerType: kind } } };
}

/**
 * The answer filters, all on one counted answer: « intéressé, riz, octobre »
 * is one answer that is all three, not three answers. Null without any.
 */
function answerWhere(f: ClientFilters, now: Date): Prisma.RespondentWhereInput | null {
  const some: Prisma.ResponseWhereInput = {
    ...COUNTED,
    ...(f.kind !== 'ALL' && { buyerType: f.kind }),
    ...(f.answer && { interested: f.answer === 'yes' }),
    ...(f.campaignId && { campaignId: f.campaignId }),
    ...(f.zone === 'OTHER'
      ? { zoneId: null, deliveryPlace: { not: null } }
      : f.zone && { zoneId: f.zone }),
    ...(f.period && { completedAt: { not: null, ...periodRange(f.period, now) } }),
  };
  const filtered = f.kind !== 'ALL' || Boolean(f.answer || f.campaignId || f.zone || f.period);
  return filtered ? { responses: { some } } : null;
}

/** Digits search the numbers only on a plan that shows them: no guessing a masked one. */
function searchWhere(q: string, canSeeContacts: boolean): Prisma.RespondentWhereInput {
  const digits = q.replace(/\D/g, '');
  if (canSeeContacts && digits.length >= 3) return { phoneE164: { contains: digits } };
  return { firstName: { contains: q, mode: 'insensitive' } };
}

const LAST_SELECT = {
  campaignId: true,
  interested: true,
  quantity: true,
  buyerType: true,
  completedAt: true,
  campaign: { select: { product: { select: { name: true, unitLabel: true } } } },
} satisfies Prisma.ResponseSelect;

type LastRow = Prisma.ResponseGetPayload<{ select: typeof LAST_SELECT }>;

function toLast(r: LastRow): ClientLast {
  return {
    campaignId: r.campaignId,
    productName: r.campaign.product.name,
    unitLabel: r.campaign.product.unitLabel,
    interested: r.interested === true,
    quantity: r.quantity,
    at: (r.completedAt ?? new Date(0)).toISOString(),
  };
}

function toRow(
  r: { id: string; firstName: string | null; phoneE164: string | null; responses: LastRow[] },
  canSeeContacts: boolean,
): ClientRow {
  const last = r.responses[0];
  return {
    id: r.id,
    firstName: r.firstName,
    phone: r.phoneE164
      ? canSeeContacts
        ? displayPhone(r.phoneE164)
        : maskPhone(r.phoneE164)
      : null,
    phoneE164: canSeeContacts ? r.phoneE164 : null,
    kind: (last?.buyerType as BuyerType | null | undefined) ?? null,
    last: last ? toLast(last) : null,
  };
}

async function countClients(db: Db, organizationId: string): Promise<ClientCounts> {
  const visible = visibleClientWhere(organizationId);
  const [all, RESELLER, CONSUMER] = await Promise.all([
    db.respondent.count({ where: visible }),
    db.respondent.count({ where: { ...visible, AND: [kindWhere('RESELLER')] } }),
    db.respondent.count({ where: { ...visible, AND: [kindWhere('CONSUMER')] } }),
  ]);
  return { all, RESELLER, CONSUMER };
}

/**
 * Most recently seen first. The kit's cursor carries `lastSeenAt` in its
 * date; the first page also counts the whole book for the filter chips.
 */
export async function listClients(
  db: Db,
  organizationId: string,
  filters: ClientFilters,
  cursor: Cursor | null,
  opts: { canSeeContacts: boolean; limit: number; now?: Date },
): Promise<{ items: ClientRow[]; nextCursor: string | null; counts: ClientCounts | null }> {
  const and: Prisma.RespondentWhereInput[] = [];
  const answers = answerWhere(filters, opts.now ?? new Date());
  if (answers) and.push(answers);
  // The country is the number's dial code, read here: the number itself never leaves.
  const prefix = filters.country ? dialPrefixFor(filters.country) : null;
  if (prefix) and.push({ phoneE164: { startsWith: prefix } });
  if (filters.q) and.push(searchWhere(filters.q, opts.canSeeContacts));
  if (cursor) {
    and.push({
      OR: [
        { lastSeenAt: { lt: cursor.createdAt } },
        { lastSeenAt: cursor.createdAt, id: { lt: cursor.id } },
      ],
    });
  }
  const [rows, counts] = await Promise.all([
    db.respondent.findMany({
      where: { ...visibleClientWhere(organizationId), AND: and },
      orderBy: [{ lastSeenAt: 'desc' }, { id: 'desc' }],
      take: opts.limit + 1,
      select: {
        id: true,
        firstName: true,
        phoneE164: true,
        lastSeenAt: true,
        responses: {
          where: COUNTED,
          orderBy: [{ completedAt: 'desc' }, { id: 'desc' }],
          take: 1,
          select: LAST_SELECT,
        },
      },
    }),
    cursor ? null : countClients(db, organizationId),
  ]);
  const page = buildPage(
    rows.map((r) => ({ ...r, createdAt: r.lastSeenAt })),
    opts.limit,
  );
  return {
    items: page.items.map((r) => toRow(r, opts.canSeeContacts)),
    nextCursor: page.nextCursor,
    counts,
  };
}

/** One client and every counted answer, newest first; null when hidden or elsewhere. */
export async function getClient(
  db: Db,
  organizationId: string,
  respondentId: string,
  opts: { canSeeContacts: boolean },
): Promise<ClientDetail | null> {
  const r = await db.respondent.findFirst({
    where: { id: respondentId, ...visibleClientWhere(organizationId) },
    select: {
      id: true,
      firstName: true,
      phoneE164: true,
      firstSeenAt: true,
      lastSeenAt: true,
      responses: {
        where: COUNTED,
        orderBy: [{ completedAt: 'desc' }, { id: 'desc' }],
        select: {
          ...LAST_SELECT,
          id: true,
          option: true,
          timing: true,
          wantsDelivery: true,
          zone: { select: { name: true } },
          campaign: {
            select: { title: true, product: { select: { name: true, unitLabel: true } } },
          },
        },
      },
    },
  });
  if (!r) return null;
  const interests = r.responses.map(
    (x): ClientInterest => ({
      responseId: x.id,
      ...toLast(x),
      campaignTitle: x.campaign.title,
      buyerType: (x.buyerType as BuyerType | null) ?? null,
      option: x.option,
      timing: x.timing,
      wantsDelivery: x.wantsDelivery,
      zoneName: x.zone?.name ?? null,
    }),
  );
  return {
    ...toRow(r, opts.canSeeContacts),
    firstSeenAt: r.firstSeenAt.toISOString(),
    interests,
  };
}
