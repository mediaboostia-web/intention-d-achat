// Short codes of share links (/c/k3P9xQa): 7 base62 characters drawn with
// crypto.randomInt, i.e. 62^7 ≈ 3.5e12 codes; a collision is retried.
import 'server-only';
import { randomInt } from 'node:crypto';
import { isUniqueViolation } from './errors';

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export const SHORT_CODE_REGEX = /^[0-9A-Za-z]{7}$/;

export function generateShortCode(length = 7): string {
  let code = '';
  for (let i = 0; i < length; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}

/**
 * Runs `create` with a fresh code until no unique violation on `code`
 * occurs. Wrap the whole transaction: a P2002 aborts the Postgres
 * transaction it happened in.
 */
export async function withUniqueCode<T>(
  create: (code: string) => Promise<T>,
  attempts = 5,
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await create(generateShortCode());
    } catch (err) {
      if (attempt >= attempts || !isUniqueViolation(err, 'code')) throw err;
    }
  }
}
