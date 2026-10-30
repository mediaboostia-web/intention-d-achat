// Passes never renew on their own (spec §5.6): a daily run tells the shop's
// owner and admins 3 days before a paid pass ends, when its grace starts,
// and when the free trial is over. Every notice has a dedupeKey, so a
// second run tells nobody twice; the J-3 email goes out only with a new
// notification.
import 'server-only';
import type { PrismaClient } from '@prisma/client';
import { createNotification, type CreateNotificationInput } from '@/lib/server/notifications';
import { passEndingSoon, passInGrace, trialEnded } from '@/lib/server/notifications/templates';
import type { EmailQueue } from '@/lib/server/queues/email-queue';
import { formatDateFr } from '@/lib/tamani/dates';
import { PASS_IDS } from '@/lib/tamani/plans';

const DAY_MS = 86_400_000;
const REMIND_DAYS = 3;
/** Paid passes, the quoted Illimité included. */
const PAID_PLANS = [...PASS_IDS, 'UNLIMITED'];

type Mail = Pick<EmailQueue, 'enqueue'>;
type Person = { userId: string; email: string };

async function ownersAndAdmins(
  db: PrismaClient,
  organizationIds: string[],
): Promise<Map<string, Person[]>> {
  const byShop = new Map<string, Person[]>();
  if (organizationIds.length === 0) return byShop;
  const members = await db.organizationMember.findMany({
    where: { organizationId: { in: organizationIds }, role: { in: ['OWNER', 'ADMIN'] } },
    select: { organizationId: true, userId: true, user: { select: { email: true } } },
  });
  for (const m of members) {
    const list = byShop.get(m.organizationId) ?? [];
    list.push({ userId: m.userId, email: m.user.email });
    byShop.set(m.organizationId, list);
  }
  return byShop;
}

/** Notifies each person; returns those for whom the notice is new. */
async function tell(
  db: PrismaClient,
  people: Person[],
  notice: (userId: string) => CreateNotificationInput,
): Promise<Person[]> {
  const told: Person[] = [];
  for (const person of people) {
    if (await createNotification(db, notice(person.userId))) told.push(person);
  }
  return told;
}

function reminderEmail(to: string, endsOn: string, appUrl: string) {
  const link = `${appUrl.replace(/\/+$/, '')}/app/abonnement`;
  const sentence = `Ton pass finit le ${endsOn}. Rachète-le pour garder tes réponses ouvertes.`;
  return {
    to,
    subject: `Ton pass Tamani finit le ${endsOn}`,
    html: `<p>${sentence}</p><p><a href="${link}">Prendre un autre pass</a></p>`,
    text: `${sentence}\n\n${link}`,
  };
}

export async function runRenewals(
  db: PrismaClient,
  now: Date,
  mail: Mail | null,
): Promise<{ reminders: number; graces: number; trialsEnded: number }> {
  const select = { organizationId: true, currentPeriodEnd: true, graceUntil: true } as const;
  const ending = await db.subscription.findMany({
    where: {
      plan: { in: PAID_PLANS },
      currentPeriodEnd: { gt: now, lte: new Date(now.getTime() + REMIND_DAYS * DAY_MS) },
    },
    select,
  });
  const graces = await db.subscription.findMany({
    where: { plan: { in: PAID_PLANS }, currentPeriodEnd: { lte: now }, graceUntil: { gt: now } },
    select,
  });
  const trials = await db.subscription.findMany({
    where: { plan: 'TRIAL', currentPeriodEnd: { gt: new Date(now.getTime() - DAY_MS), lte: now } },
    select,
  });

  const people = await ownersAndAdmins(db, [
    ...new Set([...ending, ...graces, ...trials].map((s) => s.organizationId)),
  ]);
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  const result = { reminders: 0, graces: 0, trialsEnded: 0 };

  for (const sub of ending) {
    const endsAt = sub.currentPeriodEnd;
    if (!endsAt) continue;
    const told = await tell(db, people.get(sub.organizationId) ?? [], (userId) =>
      passEndingSoon(userId, sub.organizationId, endsAt, now),
    );
    if (told.length > 0) result.reminders += 1;
    for (const person of told) {
      await mail?.enqueue(reminderEmail(person.email, formatDateFr(endsAt, now), appUrl));
    }
  }

  for (const sub of graces) {
    const { currentPeriodEnd: endedAt, graceUntil } = sub;
    if (!endedAt || !graceUntil) continue;
    const daysLeft = Math.max(1, Math.ceil((graceUntil.getTime() - now.getTime()) / DAY_MS));
    const told = await tell(db, people.get(sub.organizationId) ?? [], (userId) =>
      passInGrace(userId, sub.organizationId, endedAt, daysLeft),
    );
    if (told.length > 0) result.graces += 1;
  }

  for (const sub of trials) {
    const told = await tell(db, people.get(sub.organizationId) ?? [], (userId) =>
      trialEnded(userId, sub.organizationId),
    );
    if (told.length > 0) result.trialsEnded += 1;
  }

  return result;
}
