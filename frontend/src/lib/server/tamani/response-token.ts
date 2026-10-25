// The respondent's right to change their answer (spec §6.5): a token the
// server signs for one response and one device, kept in the phone's
// localStorage and sent back in x-response-token.
//
// The key is derived from JWT_SECRET rather than the secret itself:
// auth.ts's verifyToken checks no audience, so a token signed with the raw
// secret would pass for an access token.
import 'server-only';
import { createHmac } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { JWT_SECRET_BYTES } from '@/lib/server/auth';

const AUDIENCE = 'tamani:response';
const KEY = createHmac('sha256', JWT_SECRET_BYTES).update('tamani:response-token').digest();

export interface ResponseTokenPayload {
  responseId: string;
  deviceId: string;
}

export async function signResponseToken(p: ResponseTokenPayload): Promise<string> {
  return new SignJWT({ rid: p.responseId, did: p.deviceId })
    .setProtectedHeader({ alg: 'HS256' })
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime('90d')
    .sign(KEY);
}

export async function verifyResponseToken(token: string): Promise<ResponseTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, KEY, { audience: AUDIENCE, algorithms: ['HS256'] });
    const { rid, did } = payload as { rid?: unknown; did?: unknown };
    return typeof rid === 'string' && typeof did === 'string'
      ? { responseId: rid, deviceId: did }
      : null;
  } catch {
    return null;
  }
}
