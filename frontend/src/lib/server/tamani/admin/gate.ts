// The support-admin door (lot 11c, porteur 2026-11-08). A session opened on
// the shop's sign-in page is not enough for the back-office: the admin also
// proves the account's mailbox with a code, which sets this cookie. Every
// /api/admin route and every support-admin page asks for it.
//
// The cookie is a JWT signed with a key DERIVED from JWT_SECRET, so it can
// never pass as an access token (and an access token never passes as it).
import 'server-only';
import crypto from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { JWT_SECRET_BYTES } from '@/lib/server/auth';
import { requireAdmin, requireSuperadmin, type AdminContext } from '@/lib/server/middleware';
import { tamaniError } from '../errors';

const COOKIE_PREFIX = process.env.COOKIE_PREFIX || 'app';
export const ADMIN_GATE_COOKIE = `${COOKIE_PREFIX}-admin-gate`;
/** One working day: the code is asked again after 12 hours. */
export const ADMIN_GATE_TTL_S = 12 * 60 * 60;

const GATE_KEY = crypto.createHmac('sha256', JWT_SECRET_BYTES).update('tamani:admin-gate').digest();
const TYP = 'admin-gate';

/**
 * The door is closed unless ADMIN_GATE=off. That switch is the way back in
 * if the e-mail provider is down and no code can be sent: set it on the
 * host, sign in, fix the provider, remove it.
 */
export function adminGateEnforced(): boolean {
  return process.env.ADMIN_GATE !== 'off';
}

export async function createGateToken(userId: string, ttlSeconds = ADMIN_GATE_TTL_S) {
  return new SignJWT({ typ: TYP })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ttlSeconds)
    .sign(GATE_KEY);
}

/** True only for an unexpired door token issued to this very account. */
export async function verifyGateToken(token: string | undefined, userId: string) {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, GATE_KEY, { algorithms: ['HS256'] });
    return payload.typ === TYP && payload.sub === userId;
  } catch {
    return false;
  }
}

function cookieOptions(maxAge: number) {
  const prod = process.env.NODE_ENV === 'production';
  const domain = prod ? process.env.COOKIE_DOMAIN || undefined : undefined;
  return {
    httpOnly: true,
    secure: prod,
    sameSite: 'strict' as const,
    maxAge,
    path: '/',
    ...(domain ? { domain } : {}),
  };
}

export async function setAdminGateCookie(userId: string): Promise<void> {
  const store = await cookies();
  store.set(ADMIN_GATE_COOKIE, await createGateToken(userId), cookieOptions(ADMIN_GATE_TTL_S));
}

export async function clearAdminGateCookie(): Promise<void> {
  const store = await cookies();
  store.set(ADMIN_GATE_COOKIE, '', cookieOptions(0));
}

/** Has this admin passed the door on this browser? */
export async function hasAdminGate(userId: string): Promise<boolean> {
  if (!adminGateEnforced()) return true;
  const store = await cookies();
  return verifyGateToken(store.get(ADMIN_GATE_COOKIE)?.value, userId);
}

async function gated(auth: AdminContext | NextResponse): Promise<AdminContext | NextResponse> {
  if (auth instanceof NextResponse) return auth;
  if (await hasAdminGate(auth.admin.id)) return auth;
  return tamaniError('ADMIN_GATE_REQUIRED', 401);
}

/** requireAdmin, then the door. What every /api/admin route calls. */
export async function gatedAdmin(
  minRole: 'ADMIN' | 'SUPERADMIN' = 'ADMIN',
): Promise<AdminContext | NextResponse> {
  return gated(await requireAdmin(minRole));
}

/** requireSuperadmin, then the door. */
export async function gatedSuperadmin(): Promise<AdminContext | NextResponse> {
  return gated(await requireSuperadmin());
}
