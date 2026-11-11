// The pre-launch waitlist (lot 14): add a seller, give back their place.
// The same WhatsApp or e-mail twice is the same seller: no second line, the
// first place given back. Never logs a contact.
import 'server-only';
import type { PrismaClient } from '@prisma/client';
import { waitlistChannelsText, type WaitlistRow, type WaitlistStats } from '@/lib/tamani/waitlist';
import { toExcelCsv } from './csv';
import { displayPhone } from './phone';

type Db = Pick<PrismaClient, 'waitlistEntry'>;
const WEEK_MS = 7 * 86_400_000;

/** Everyone on the list, ranked by arrival, the newest first. */
export async function listWaitlist(db: Db): Promise<WaitlistRow[]> {
  const rows = await db.waitlistEntry.findMany({
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      firstName: true,
      phone: true,
      email: true,
      channels: true,
      source: true,
      createdAt: true,
    },
  });
  return rows
    .map((r, i) => ({
      id: r.id,
      position: i + 1,
      firstName: r.firstName,
      phone: r.phone ? displayPhone(r.phone) : null,
      email: r.email,
      channels: r.channels,
      source: r.source,
      createdAt: r.createdAt.toISOString(),
    }))
    .reverse();
}

export async function waitlistStats(db: Db, now: Date): Promise<WaitlistStats> {
  const [total, thisWeek, groups] = await Promise.all([
    db.waitlistEntry.count(),
    db.waitlistEntry.count({ where: { createdAt: { gte: new Date(now.getTime() - WEEK_MS) } } }),
    db.waitlistEntry.groupBy({ by: ['source'], _count: { _all: true } }),
  ]);
  return {
    total,
    thisWeek,
    bySource: groups
      .map((g) => ({ source: g.source, count: g._count._all }))
      .sort((a, b) => b.count - a.count),
  };
}

const CSV_COLUMNS = [
  { key: 'position', header: 'Rang' },
  { key: 'firstName', header: 'Prénom' },
  { key: 'phone', header: 'WhatsApp' },
  { key: 'email', header: 'E-mail' },
  { key: 'channels', header: 'Où il vend' },
  { key: 'source', header: 'Source' },
  { key: 'createdAt', header: 'Date' },
] as const;

/** The list for Excel, in the order of arrival. */
export function waitlistCsv(rows: readonly WaitlistRow[]): string {
  return toExcelCsv(
    CSV_COLUMNS,
    [...rows]
      .sort((a, b) => a.position - b.position)
      .map((r) => ({
        position: r.position,
        firstName: r.firstName,
        phone: r.phone,
        email: r.email,
        channels: waitlistChannelsText(r.channels),
        source: r.source,
        createdAt: r.createdAt.slice(0, 16).replace('T', ' '),
      })),
  );
}

export interface WaitlistJoin {
  firstName: string;
  phone: string | null;
  email: string | null;
  channels: string[];
  source: string | null;
}

export interface WaitlistPlace {
  position: number;
  firstName: string;
  already: boolean;
}

function contactWhere(input: Pick<WaitlistJoin, 'phone' | 'email'>) {
  return {
    OR: [
      ...(input.phone ? [{ phone: input.phone }] : []),
      ...(input.email ? [{ email: input.email }] : []),
    ],
  };
}

async function placeOf(db: Db, createdAt: Date): Promise<number> {
  return (await db.waitlistEntry.count({ where: { createdAt: { lt: createdAt } } })) + 1;
}

const SELECT = { firstName: true, createdAt: true } as const;

export async function joinWaitlist(db: Db, input: WaitlistJoin, now: Date): Promise<WaitlistPlace> {
  const where = contactWhere(input);
  const known = await db.waitlistEntry.findFirst({ where, select: SELECT });
  if (known) {
    return {
      position: await placeOf(db, known.createdAt),
      firstName: known.firstName,
      already: true,
    };
  }
  try {
    const row = await db.waitlistEntry.create({
      data: { ...input, consentAt: now },
      select: SELECT,
    });
    return { position: await placeOf(db, row.createdAt), firstName: row.firstName, already: false };
  } catch (err) {
    // The same contact sent twice at the same moment: the unique index kept one.
    if ((err as { code?: string }).code !== 'P2002') throw err;
    const first = await db.waitlistEntry.findFirst({ where, select: SELECT });
    if (!first) throw err;
    return {
      position: await placeOf(db, first.createdAt),
      firstName: first.firstName,
      already: true,
    };
  }
}

export async function waitlistCount(db: Db): Promise<number> {
  return db.waitlistEntry.count();
}
