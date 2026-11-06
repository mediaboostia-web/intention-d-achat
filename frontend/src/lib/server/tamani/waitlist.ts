// The pre-launch waitlist (lot 14): add a seller, give back their place.
// The same WhatsApp or e-mail twice is the same seller: no second line, the
// first place given back. Never logs a contact.
import 'server-only';
import type { PrismaClient } from '@prisma/client';

type Db = Pick<PrismaClient, 'waitlistEntry'>;

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
