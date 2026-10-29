// The shop's client book (porteur's feedback §3 bis, advanced from lot 7).
// A client shows once one of their answers counts (completed, not over the
// monthly quota, not suspicious) or once they have an order: a manual order
// adds its client to the book (spec §5.5.1). A client whose answers are all
// locked, and who never ordered, stays hidden until the upgrade, like the
// answers themselves. An anonymized client (spec §6.9) never shows; their
// answers and orders keep counting, without an identity.
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
import { clientReliability, learnableCampaignIds } from './reliability';
import { ORDER_SELECT, toOrderRow } from './serializers';

/** An answer that counts: completed, within the quota, not suspicious. */
const COUNTED = {
  completedAt: { not: null },
  locked: false,
  suspicious: false,
} satisfies Prisma.ResponseWhereInput;

/** « A commandé »: at least one order that is not cancelled. */
const LIVE_ORDER = { status: { not: 'CANCELLED' } } satisfies Prisma.SaleOrderWhereInput;

/** The newest orders a client card carries; the total spent counts them all. */
const CARD_ORDERS = 100;

/**
 * Respondents the shop may see: not anonymized, with at least one counted
 * answer or at least one order (any status: a cancelled manual order still
 * put its client in the book). The list, its counts, the card, the exports
 * and the home page all start from here.
 */
export function visibleClientWhere(organizationId: string) {
  return {
    organizationId,
    anonymizedAt: null,
    OR: [{ responses: { some: COUNTED } }, { orders: { some: {} } }],
  } satisfies Prisma.RespondentWhereInput;
}

export type ClientKind = 'ALL' | BuyerType;

/** The filters of lib/tamani/client-filters.ts, the type read as a kind. */
export interface ClientFilters extends Partial<Omit<ClientFilterState, 'type' | 'q'>> {
  q: string | null;
  kind: ClientKind;
}

/** ?type, ?reponse, ?campagne, ?quartier, ?periode, ?pays, ?commande and ?q; null when one is unknown (400). */
export function parseClientFilters(params: URLSearchParams): ClientFilters | null {
  const state = parseClientSearch(params);
  return state ? clientFiltersOf(state) : null;
}

export function clientFiltersOf(state: ClientFilterState): ClientFilters {
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

/** The filters as AND clauses on the visible clients (the list and the export). */
export function clientFilterWhere(
  filters: ClientFilters,
  canSeeContacts: boolean,
  now: Date,
): Prisma.RespondentWhereInput[] {
  const and: Prisma.RespondentWhereInput[] = [];
  const answers = answerWhere(filters, now);
  if (answers) and.push(answers);
  // The country is the number's dial code, read here: the number itself never leaves.
  const prefix = filters.country ? dialPrefixFor(filters.country) : null;
  if (prefix) and.push({ phoneE164: { startsWith: prefix } });
  // Like the country, « a commandé » is about the client, not one answer.
  if (filters.ordered === true) and.push({ orders: { some: LIVE_ORDER } });
  if (filters.ordered === false) and.push({ orders: { none: LIVE_ORDER } });
  if (filters.q) and.push(clientSearchWhere(filters.q, canSeeContacts));
  return and;
}

/** Digits search the numbers only on a plan that shows them: no guessing a masked one. */
export function clientSearchWhere(q: string, canSeeContacts: boolean): Prisma.RespondentWhereInput {
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
  const and = clientFilterWhere(filters, opts.canSeeContacts, opts.now ?? new Date());
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

/**
 * One client: every counted answer and the newest orders, newest first, the
 * total of the fulfilled orders, the note and, on a plan with `reliability`,
 * how often their yes became a purchase. Null when hidden or elsewhere.
 */
export async function getClient(
  db: Db,
  organizationId: string,
  respondentId: string,
  opts: { canSeeContacts: boolean; reliability: boolean; now?: Date },
): Promise<ClientDetail | null> {
  const now = opts.now ?? new Date();
  const r = await db.respondent.findFirst({
    where: { id: respondentId, ...visibleClientWhere(organizationId) },
    select: {
      id: true,
      firstName: true,
      phoneE164: true,
      notes: true,
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
          order: { select: { status: true } },
          campaign: {
            select: {
              title: true,
              status: true,
              endsAt: true,
              product: { select: { name: true, unitLabel: true } },
            },
          },
        },
      },
    },
  });
  if (!r) return null;
  const own = { organizationId, respondentId: r.id };
  const [orders, spent] = await Promise.all([
    db.saleOrder.findMany({
      where: own,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: CARD_ORDERS,
      select: ORDER_SELECT,
    }),
    db.saleOrder.aggregate({
      where: { ...own, status: 'FULFILLED' },
      _sum: { totalAmount: true },
    }),
  ]);
  // Only the campaigns the shop followed up in orders say whether a yes buys.
  const learnable = opts.reliability
    ? await learnableCampaignIds(
        db,
        organizationId,
        [...new Set(r.responses.map((x) => x.campaignId))],
        now,
      )
    : null;
  const reliability = learnable
    ? clientReliability(
        r.responses.map((x) => ({
          interested: x.interested === true,
          campaignFinished: learnable.has(x.campaignId),
          fulfilled: x.order?.status === 'FULFILLED',
        })),
      )
    : null;
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
    notes: r.notes,
    orders: orders.map((o) => toOrderRow(o, opts.canSeeContacts)),
    totalSpent: spent._sum.totalAmount ?? 0,
    reliability,
  };
}

/** The wholesaler's note on a client the shop sees; null when hidden, anonymized or elsewhere. */
export async function updateClientNotes(
  db: Db,
  organizationId: string,
  respondentId: string,
  notes: string | null,
): Promise<{ notes: string | null } | null> {
  const { count } = await db.respondent.updateMany({
    where: { id: respondentId, ...visibleClientWhere(organizationId) },
    data: { notes },
  });
  return count === 0 ? null : { notes };
}

/**
 * Deletes a client's identity on request (spec §6.9), in the caller's
 * transaction: first name, number and note go, and so do the notes of their
 * orders (a « Lieu : X » or a free note may name the person). The answers
 * and the orders stay, still counted, without an identity. False when the
 * client is of another shop or already anonymized.
 */
export async function anonymizeClient(
  tx: Db,
  organizationId: string,
  respondentId: string,
  now: Date,
): Promise<boolean> {
  const { count } = await tx.respondent.updateMany({
    where: { id: respondentId, organizationId, anonymizedAt: null },
    data: { firstName: null, phoneE164: null, notes: null, anonymizedAt: now },
  });
  if (count === 0) return false;
  await tx.saleOrder.updateMany({
    where: { organizationId, respondentId },
    data: { notes: null },
  });
  // A place typed after « Autre endroit » may name the person ("chez Awa"):
  // it becomes those very words, so the stats still count it elsewhere.
  await tx.response.updateMany({
    where: { organizationId, respondentId, deliveryPlace: { not: null } },
    data: { deliveryPlace: 'Autre endroit' },
  });
  return true;
}
