// The code that opens the support-admin door (lot 11c). It lives in the
// kit's VerificationCode table under its own type, hashed: a database read
// alone does not open the back-office.
import 'server-only';
import crypto from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { generateVerificationCode, timingSafeCompare } from '@/lib/server/auth';

export const ADMIN_CODE_TYPE = 'ADMIN_LOGIN';
export const ADMIN_CODE_TTL_MS = 10 * 60 * 1000;
/** Codes one account may ask for in ten minutes. */
export const ADMIN_CODE_MAX_SENDS = 3;
/** Wrong tries a code survives. */
export const ADMIN_CODE_MAX_TRIES = 5;

type Db = Pick<PrismaClient, 'verificationCode'>;

export interface AdminCodeMailer {
  enqueue(input: { to: string; subject: string; html: string; text?: string }): Promise<string>;
}

const hash = (code: string) => crypto.createHash('sha256').update(code).digest('hex');

/** The e-mail. The code is [A-Z2-9]{8}: nothing to escape. */
export function adminCodeEmail(code: string) {
  const spaced = `${code.slice(0, 4)} ${code.slice(4)}`;
  return {
    subject: `${spaced} : ton code Support-admin Tamani`,
    html: `<p>Ton code pour ouvrir le Support-admin Tamani :</p><p style="font-size:28px;font-weight:700;letter-spacing:4px">${spaced}</p><p>Il est valable 10 minutes et ne sert qu'une fois.</p><p>Si tu n'as pas demandé ce code, change ton mot de passe : quelqu'un le connaît.</p>`,
    text: `Ton code pour ouvrir le Support-admin Tamani : ${spaced}\nIl est valable 10 minutes et ne sert qu'une fois.\nSi tu n'as pas demandé ce code, change ton mot de passe : quelqu'un le connaît.`,
  };
}

export type IssueResult = 'sent' | 'too-many';

/** A new code for this admin; the older ones stop working. */
export async function issueAdminCode(
  db: Db,
  mailer: AdminCodeMailer,
  admin: { id: string; email: string },
  now: Date = new Date(),
): Promise<IssueResult> {
  const recent = await db.verificationCode.count({
    where: {
      userId: admin.id,
      type: ADMIN_CODE_TYPE,
      createdAt: { gt: new Date(now.getTime() - ADMIN_CODE_TTL_MS) },
    },
  });
  if (recent >= ADMIN_CODE_MAX_SENDS) return 'too-many';

  const code = generateVerificationCode();
  await db.verificationCode.updateMany({
    where: { userId: admin.id, type: ADMIN_CODE_TYPE, usedAt: null },
    data: { usedAt: now },
  });
  await db.verificationCode.create({
    data: {
      userId: admin.id,
      type: ADMIN_CODE_TYPE,
      code: hash(code),
      expiresAt: new Date(now.getTime() + ADMIN_CODE_TTL_MS),
    },
  });
  await mailer.enqueue({ to: admin.email, ...adminCodeEmail(code) });
  return 'sent';
}

export type CheckResult = 'ok' | 'invalid';

/**
 * Is this the admin's live code? A wrong try is counted, and the code dies
 * at the fifth; a right one is consumed, so it never opens the door twice.
 * Every failure answers the same, whatever its cause.
 */
export async function checkAdminCode(
  db: Db,
  userId: string,
  code: string,
  now: Date = new Date(),
): Promise<CheckResult> {
  const row = await db.verificationCode.findFirst({
    where: { userId, type: ADMIN_CODE_TYPE, usedAt: null, expiresAt: { gt: now } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, code: true },
  });
  if (!row) return 'invalid';

  // Take one of the five tries first, in one statement: a burst of parallel
  // guesses cannot get more than five looks at the same code.
  const claimed = await db.verificationCode.updateMany({
    where: { id: row.id, usedAt: null, attempts: { lt: ADMIN_CODE_MAX_TRIES } },
    data: { attempts: { increment: 1 } },
  });
  if (claimed.count !== 1) return 'invalid';
  if (!timingSafeCompare(hash(code.toUpperCase()), row.code)) return 'invalid';

  const consumed = await db.verificationCode.updateMany({
    where: { id: row.id, usedAt: null },
    data: { usedAt: now },
  });
  return consumed.count === 1 ? 'ok' : 'invalid';
}
