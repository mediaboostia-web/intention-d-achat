// Helpers for Tamani shop route tests. They sign a real access token and
// answer the membership lookup through prismaMock, so the kit's real
// requireAuth + requireOrgRole run: a non-member really gets the 404.
//
// Usage (test file top): import prismaMock first, call mockNextCookies(),
// then in beforeEach: __cookieStore.clear(); await signIn(); asMember('org_1').
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_NAME, createAccessToken } from '@/lib/server/auth';
import type { OrgRole } from '@/lib/server/middleware/require-org-role';
import { prismaMock } from './prisma-mock';

export const TEST_USER = { id: 'user_1', email: 'awa@test.local' };
const CSRF = 'csrf-tok';

export async function signIn(user = TEST_USER): Promise<void> {
  const token = await createAccessToken({ sub: user.id, email: user.email, tokenVersion: 0 });
  (await cookies()).set(COOKIE_NAME, token);
  prismaMock.user.findUnique.mockResolvedValue({ ...user, tokenVersion: 0 } as never);
}

export function asMember(organizationId: string, role: OrgRole = 'OWNER'): void {
  prismaMock.organizationMember.findUnique.mockResolvedValue({
    organizationId,
    userId: TEST_USER.id,
    role,
  } as never);
}

export function asNonMember(): void {
  prismaMock.organizationMember.findUnique.mockResolvedValue(null);
}

/** Interactive transactions run their callback against prismaMock itself. */
export function runTransactionsInline(): void {
  prismaMock.$transaction.mockImplementation(((arg: unknown) =>
    typeof arg === 'function'
      ? (arg as (tx: typeof prismaMock) => unknown)(prismaMock)
      : Promise.all(arg as Promise<unknown>[])) as never);
}

export function apiRequest(
  path: string,
  init: { method?: string; body?: unknown; csrf?: boolean } = {},
): NextRequest {
  const { method = 'GET', body, csrf = true } = init;
  const headers = new Headers({ 'content-type': 'application/json' });
  if (csrf && method !== 'GET') {
    headers.set('x-csrf-token', CSRF);
    headers.set('cookie', `app-csrf=${CSRF}`);
  }
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
  });
}

export function routeParams<P>(params: P): { params: Promise<P> } {
  return { params: Promise.resolve(params) };
}
