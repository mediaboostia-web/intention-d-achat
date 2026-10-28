// The « Exporter » page on the server (lot 6b, retours §6): the answers or
// the clients a query keeps, as a 10-row preview, a CSV file or the numbers
// to paste into a WhatsApp broadcast list. Every where carries the shop, and
// the preview masks the numbers on a plan without contacts; the file and
// the numbers routes check the plan before calling here.
import 'server-only';
import type { Prisma } from '@prisma/client';
import { periodRange } from '@/lib/tamani/client-filters';
import type { ExportPreview, ExportQuery, ResponsesExport } from '@/lib/tamani/export-view';
import type { BuyerType } from '@/lib/tamani/labels';
import { dialPrefixFor } from '@/lib/tamani/phone-countries';
import {
  CLIENT_COLUMNS,
  RESPONSE_COLUMNS,
  clientCells,
  clientsCsv,
  exportFilename,
  mostFrequent,
  responseCells,
  responsesCsv,
  type ExportClientRow,
  type ExportKind,
  type ExportResponseRow,
} from './campaign-export';
import { COUNTED, ROW_SELECT, toRow } from './campaign-responses';
import { clientFilterWhere, clientFiltersOf, visibleClientWhere } from './clients';
import type { Db } from './locks';
import { displayPhone, maskPhone, phoneCountryOf } from './phone';

const PREVIEW_ROWS = 10;
const MAX_FILE_ROWS = 20_000;
const MAX_NUMBERS = 5000;

const NEWEST = [{ completedAt: 'desc' as const }, { id: 'desc' as const }];

/** Every filter on the counted answers of one shop. */
function responsesWhere(
  organizationId: string,
  q: ResponsesExport,
  now: Date,
): Prisma.ResponseWhereInput {
  const prefix = q.country ? dialPrefixFor(q.country) : null;
  return {
    organizationId,
    ...COUNTED,
    ...(q.answer !== 'all' && { interested: q.answer === 'yes' }),
    ...(q.campaignId && { campaignId: q.campaignId }),
    ...(q.period && { completedAt: { not: null, ...periodRange(q.period, now) } }),
    ...(q.zone === 'OTHER'
      ? { zoneId: null, deliveryPlace: { not: null } }
      : q.zone && { zoneId: q.zone }),
    ...(q.timing && { timing: q.timing }),
    ...(q.buyerType && { buyerType: q.buyerType }),
    ...(prefix && { respondent: { phoneE164: { startsWith: prefix } } }),
  };
}

const EXPORT_SELECT = {
  ...ROW_SELECT,
  campaign: { select: { product: { select: { name: true } } } },
} satisfies Prisma.ResponseSelect;

async function responseRows(
  db: Db,
  where: Prisma.ResponseWhereInput,
  take: number,
  canSeeContacts: boolean,
): Promise<ExportResponseRow[]> {
  const rows = await db.response.findMany({ where, orderBy: NEWEST, take, select: EXPORT_SELECT });
  return rows.map((r) => ({
    ...toRow(r, canSeeContacts),
    productName: r.campaign?.product.name ?? null,
  }));
}

function clientsWhere(
  organizationId: string,
  q: Extract<ExportQuery, { what: 'clients' }>,
  canSeeContacts: boolean,
  now: Date,
): Prisma.RespondentWhereInput {
  return {
    ...visibleClientWhere(organizationId),
    AND: clientFilterWhere(clientFiltersOf(q.filters), canSeeContacts, now),
  };
}

const CLIENT_SELECT = {
  id: true,
  firstName: true,
  phoneE164: true,
  responses: {
    where: COUNTED,
    orderBy: NEWEST,
    select: {
      interested: true,
      buyerType: true,
      completedAt: true,
      zone: { select: { name: true } },
      campaign: { select: { product: { select: { name: true } } } },
    },
  },
} satisfies Prisma.RespondentSelect;

async function clientRows(
  db: Db,
  where: Prisma.RespondentWhereInput,
  take: number,
  canSeeContacts: boolean,
): Promise<ExportClientRow[]> {
  const rows = await db.respondent.findMany({
    where,
    orderBy: [{ lastSeenAt: 'desc' }, { id: 'desc' }],
    take,
    select: CLIENT_SELECT,
  });
  return rows.map((r) => {
    const last = r.responses[0];
    const phone = r.phoneE164;
    return {
      firstName: r.firstName,
      phone: phone === null ? null : canSeeContacts ? displayPhone(phone) : maskPhone(phone),
      country: phone === null ? null : phoneCountryOf(phone),
      kind: (last?.buyerType as BuyerType | null | undefined) ?? null,
      topZone: mostFrequent(r.responses.map((a) => a.zone?.name ?? null)),
      responses: r.responses.length,
      yes: r.responses.filter((a) => a.interested === true).length,
      lastAt: last?.completedAt ? last.completedAt.toISOString() : null,
      lastProduct: last?.campaign.product.name ?? null,
    };
  });
}

const asText = (cells: Record<string, string | number | null>, keys: readonly string[]) =>
  keys.map((k) => {
    const v = cells[k];
    return v === null || v === undefined ? '' : String(v);
  });

/** The first 10 rows, in French, as the file will hold them; numbers masked without contacts. */
export async function previewExport(
  db: Db,
  organizationId: string,
  q: ExportQuery,
  opts: { canSeeContacts: boolean; now?: Date },
): Promise<ExportPreview> {
  const now = opts.now ?? new Date();
  if (q.what === 'clients') {
    const where = clientsWhere(organizationId, q, opts.canSeeContacts, now);
    const [rows, total] = await Promise.all([
      clientRows(db, where, PREVIEW_ROWS, opts.canSeeContacts),
      db.respondent.count({ where }),
    ]);
    const keys = CLIENT_COLUMNS.map((c) => c.key);
    return {
      total,
      headers: CLIENT_COLUMNS.map((c) => c.header),
      rows: rows.map((r) => asText(clientCells(r), keys)),
    };
  }
  const where = responsesWhere(organizationId, q, now);
  const [rows, total] = await Promise.all([
    responseRows(db, where, PREVIEW_ROWS, opts.canSeeContacts),
    db.response.count({ where }),
  ]);
  const keys = RESPONSE_COLUMNS.map((c) => c.key);
  return {
    total,
    headers: RESPONSE_COLUMNS.map((c) => c.header),
    rows: rows.map((r) => asText(responseCells(r), keys)),
  };
}

function kindOf(q: ExportQuery): ExportKind {
  if (q.what === 'clients') return 'clients';
  return q.answer === 'yes' ? 'interesses' : q.answer === 'no' ? 'pas-interesses' : 'reponses';
}

/** The whole file (20 000 rows at most), numbers included: the route checks the plan. */
export async function exportFile(
  db: Db,
  organizationId: string,
  q: ExportQuery,
  now: Date,
): Promise<{ csv: string; filename: string }> {
  const campaignId = q.what === 'clients' ? q.filters.campaignId : q.campaignId;
  const campaign = campaignId
    ? await db.campaign.findFirst({
        where: { id: campaignId, organizationId },
        select: { title: true },
      })
    : null;
  const csv =
    q.what === 'clients'
      ? clientsCsv(
          await clientRows(db, clientsWhere(organizationId, q, true, now), MAX_FILE_ROWS, true),
        )
      : responsesCsv(
          await responseRows(db, responsesWhere(organizationId, q, now), MAX_FILE_ROWS, true),
        );
  return { csv, filename: exportFilename(kindOf(q), campaign?.title ?? null, now) };
}

/** The numbers the query keeps, each once, as "+221 77 123 45 12". Pro only: the route checks. */
export async function exportNumbers(
  db: Db,
  organizationId: string,
  q: ExportQuery,
  now: Date,
): Promise<string[]> {
  const found: Array<string | null | undefined> = [];
  if (q.what === 'clients') {
    const where = clientsWhere(organizationId, q, true, now);
    const rows = await db.respondent.findMany({
      where: { ...where, phoneE164: { not: null } },
      orderBy: [{ lastSeenAt: 'desc' }, { id: 'desc' }],
      take: MAX_NUMBERS,
      select: { phoneE164: true },
    });
    found.push(...rows.map((r) => r.phoneE164));
  } else {
    const rows = await db.response.findMany({
      where: {
        ...responsesWhere(organizationId, q, now),
        AND: [{ respondent: { anonymizedAt: null, phoneE164: { not: null } } }],
      },
      orderBy: NEWEST,
      distinct: ['respondentId'],
      take: MAX_NUMBERS,
      select: { respondent: { select: { phoneE164: true } } },
    });
    found.push(...rows.map((r) => r.respondent?.phoneE164));
  }
  const numbers = new Set<string>();
  for (const n of found) if (n) numbers.add(n);
  return [...numbers].map(displayPhone);
}

/** A campaign or a zone of another shop gives its 404 code; null when the query stays in the shop. */
export async function exportScopeError(
  db: Db,
  organizationId: string,
  q: ExportQuery,
): Promise<'CAMPAIGN_NOT_FOUND' | 'ZONE_NOT_FOUND' | null> {
  const { campaignId, zone } = q.what === 'clients' ? q.filters : q;
  if (campaignId) {
    const found = await db.campaign.findFirst({
      where: { id: campaignId, organizationId },
      select: { id: true },
    });
    if (!found) return 'CAMPAIGN_NOT_FOUND';
  }
  if (zone && zone !== 'OTHER') {
    const found = await db.deliveryZone.findFirst({
      where: { id: zone, organizationId },
      select: { id: true },
    });
    if (!found) return 'ZONE_NOT_FOUND';
  }
  return null;
}
