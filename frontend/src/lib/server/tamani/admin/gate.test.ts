import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { mockNextCookies, __cookieStore } from '@/test-utils/mock-cookies';

mockNextCookies();
vi.mock('@/lib/server/middleware', () => ({ requireAdmin: vi.fn(), requireSuperadmin: vi.fn() }));

import { createAccessToken } from '@/lib/server/auth';
import { requireAdmin, requireSuperadmin } from '@/lib/server/middleware';
import { ADMIN_CTX, SUPERADMIN_CTX, SUPERADMIN_REQUIRED } from '@/test-utils/admin-contexts';
import {
  ADMIN_GATE_COOKIE,
  ADMIN_GATE_TTL_S,
  clearAdminGateCookie,
  createGateToken,
  gatedAdmin,
  gatedSuperadmin,
  hasAdminGate,
  setAdminGateCookie,
  verifyGateToken,
} from './gate';

const cookies = async () => (await import('next/headers')).cookies();

beforeEach(() => {
  __cookieStore.clear();
  vi.stubEnv('ADMIN_GATE', '');
  vi.mocked(requireAdmin).mockReset().mockResolvedValue(ADMIN_CTX);
  vi.mocked(requireSuperadmin).mockReset().mockResolvedValue(SUPERADMIN_CTX);
});
afterEach(() => vi.unstubAllEnvs());

describe('the door token', () => {
  it('opens for the account it was issued to, and for no other', async () => {
    const token = await createGateToken('admin_1');
    expect(await verifyGateToken(token, 'admin_1')).toBe(true);
    expect(await verifyGateToken(token, 'admin_2')).toBe(false);
  });

  it('refuses nothing, garbage, a tampered token and an expired one', async () => {
    expect(await verifyGateToken(undefined, 'admin_1')).toBe(false);
    expect(await verifyGateToken('nope', 'admin_1')).toBe(false);
    const token = await createGateToken('admin_1');
    expect(await verifyGateToken(token.slice(0, -2) + 'xx', 'admin_1')).toBe(false);
    expect(await verifyGateToken(await createGateToken('admin_1', -10), 'admin_1')).toBe(false);
  });

  // The session cookie must never open the door: signed with another key.
  it('refuses an access token of the same account', async () => {
    const access = await createAccessToken({ sub: 'admin_1', email: 'admin@test.local' } as never);
    expect(await verifyGateToken(access, 'admin_1')).toBe(false);
  });
});

describe('the door cookie', () => {
  it('is httpOnly, strict, twelve hours, and only this browser has it', async () => {
    await setAdminGateCookie('admin_1');
    const entry = __cookieStore.get(ADMIN_GATE_COOKIE);
    expect(entry?.options).toMatchObject({
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
      maxAge: ADMIN_GATE_TTL_S,
    });
    expect(ADMIN_GATE_TTL_S).toBe(12 * 60 * 60);
    expect(await hasAdminGate('admin_1')).toBe(true);
    expect(await hasAdminGate('admin_2')).toBe(false);
  });

  it('closes on leave', async () => {
    await setAdminGateCookie('admin_1');
    await clearAdminGateCookie();
    expect(await hasAdminGate('admin_1')).toBe(false);
    expect(__cookieStore.get(ADMIN_GATE_COOKIE)?.options).toMatchObject({ maxAge: 0 });
  });

  it('ADMIN_GATE=off is the way back in when no code can be sent', async () => {
    expect(await hasAdminGate('admin_1')).toBe(false);
    vi.stubEnv('ADMIN_GATE', 'off');
    expect(await hasAdminGate('admin_1')).toBe(true);
  });
});

describe('gatedAdmin / gatedSuperadmin', () => {
  it('answer 401 ADMIN_GATE_REQUIRED to an admin whose session came from the shop sign-in', async () => {
    const res = await gatedAdmin('ADMIN');
    expect(res).toBeInstanceOf(NextResponse);
    expect((res as NextResponse).status).toBe(401);
    expect(await (res as NextResponse).json()).toMatchObject({ error: 'ADMIN_GATE_REQUIRED' });
    const sup = await gatedSuperadmin();
    expect((sup as NextResponse).status).toBe(401);
  });

  it('let the admin through once the code was entered', async () => {
    (await cookies()).set(ADMIN_GATE_COOKIE, await createGateToken('admin_1'));
    expect(await gatedAdmin('ADMIN')).toEqual(ADMIN_CTX);
    expect(requireAdmin).toHaveBeenCalledWith('ADMIN');
    (await cookies()).set(ADMIN_GATE_COOKIE, await createGateToken('superadmin_1'));
    expect(await gatedSuperadmin()).toEqual(SUPERADMIN_CTX);
  });

  it('keep the role refusal as it is, and never read the door for a non-admin', async () => {
    vi.mocked(requireSuperadmin).mockResolvedValue(SUPERADMIN_REQUIRED());
    const res = await gatedSuperadmin();
    expect((res as NextResponse).status).toBe(403);
  });

  it("another admin's door cookie does not open mine", async () => {
    (await cookies()).set(ADMIN_GATE_COOKIE, await createGateToken('superadmin_1'));
    const res = await gatedAdmin('ADMIN');
    expect((res as NextResponse).status).toBe(401);
  });
});

function routes(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? routes(path.join(dir, e.name))
      : e.name === 'route.ts'
        ? [path.join(dir, e.name)]
        : [],
  );
}

describe('every /api/admin route stands behind the door', () => {
  const files = routes(path.join(process.cwd(), 'src/app/api/admin'));
  it('finds the routes', () => expect(files.length).toBeGreaterThanOrEqual(13));
  it.each(files.map((f) => [path.relative(process.cwd(), f).replace(/\\/g, '/'), f]))(
    '%s',
    (_name, file) => {
      const src = readFileSync(file, 'utf8');
      expect(src).toMatch(/await gated(Admin|Superadmin)\(/);
      expect(src).not.toMatch(/await require(Admin|Superadmin)\(/);
      expect(src).not.toContain("from '@/lib/server/middleware'");
    },
  );
});
