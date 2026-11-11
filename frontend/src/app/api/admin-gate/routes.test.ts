import { prismaMock } from '@/test-utils/prisma-mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { mockNextCookies, __cookieStore } from '@/test-utils/mock-cookies';

mockNextCookies();
const later = vi.hoisted(() => ({ after: vi.fn() }));
vi.mock('next/server', async () => ({
  ...(await vi.importActual<typeof import('next/server')>('next/server')),
  after: later.after,
}));
vi.mock('@/lib/server/middleware', () => ({ requireAdmin: vi.fn(), requireSuperadmin: vi.fn() }));
vi.mock('@/lib/server/middleware/rate-limit-by-userid', () => ({
  enforceAdminRateLimit: vi.fn(),
}));
vi.mock('@/lib/server/auth', async () => ({
  ...(await vi.importActual<typeof import('@/lib/server/auth')>('@/lib/server/auth')),
  verifyCsrf: vi.fn(),
}));
vi.mock('@/lib/server/admin/audit', () => ({ logAdminAction: vi.fn() }));
vi.mock('@/lib/server/queues/email-queue-singleton', () => ({ getEmailQueue: vi.fn() }));
vi.mock('@/lib/server/tamani/admin/gate-code', () => ({
  issueAdminCode: vi.fn(),
  checkAdminCode: vi.fn(),
}));

import { verifyCsrf } from '@/lib/server/auth';
import { logAdminAction } from '@/lib/server/admin/audit';
import { requireAdmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { getEmailQueue } from '@/lib/server/queues/email-queue-singleton';
import { ADMIN_GATE_COOKIE, verifyGateToken } from '@/lib/server/tamani/admin/gate';
import { checkAdminCode, issueAdminCode } from '@/lib/server/tamani/admin/gate-code';
import { ADMIN_CTX, adminRequest } from '@/test-utils/admin-contexts';
import { POST as sendCode } from './code/route';
import { POST as leave } from './leave/route';
import { POST as verify } from './verify/route';

const queue = { enqueue: vi.fn(), drainOne: vi.fn() };
const CSRF_FAIL = () => NextResponse.json({ error: 'CSRF_INVALID' }, { status: 403 });
const NOT_ADMIN = () => NextResponse.json({ error: 'ADMIN_REQUIRED' }, { status: 403 });
const NO_SESSION = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

beforeEach(() => {
  __cookieStore.clear();
  vi.mocked(verifyCsrf).mockReset().mockReturnValue(null);
  vi.mocked(requireAdmin).mockReset().mockResolvedValue(ADMIN_CTX);
  vi.mocked(enforceAdminRateLimit).mockReset().mockResolvedValue(null);
  vi.mocked(logAdminAction).mockReset().mockResolvedValue(undefined);
  later.after.mockClear();
  queue.enqueue.mockReset();
  queue.drainOne.mockReset().mockResolvedValue(true);
  vi.mocked(getEmailQueue)
    .mockReset()
    .mockReturnValue(queue as never);
  vi.mocked(issueAdminCode).mockReset().mockResolvedValue('sent');
  vi.mocked(checkAdminCode).mockReset().mockResolvedValue('ok');
});

describe('POST /api/admin-gate/code', () => {
  const post = () => sendCode(adminRequest('/api/admin-gate/code', 'POST'));

  it('e-mails the code to the signed-in admin and sends it at once', async () => {
    const res = await post();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: true });
    expect(issueAdminCode).toHaveBeenCalledWith(prismaMock, queue, ADMIN_CTX.admin);
    // The send happens past the reply: the admin's screen does not wait for the provider.
    expect(queue.drainOne).not.toHaveBeenCalled();
    expect(later.after).toHaveBeenCalledTimes(1);
    await (later.after.mock.calls[0]![0] as () => Promise<void>)();
    expect(queue.drainOne).toHaveBeenCalledTimes(1);
  });

  it('still answers « sent » when the immediate send fails: the cron retries', async () => {
    queue.drainOne.mockRejectedValue(new Error('resend down'));
    expect((await post()).status).toBe(200);
    await expect((later.after.mock.calls[0]![0] as () => Promise<void>)()).resolves.not.toThrow();
  });

  it('refuses without CSRF, without a session, and to a non-admin, sending nothing', async () => {
    vi.mocked(verifyCsrf).mockReturnValueOnce(CSRF_FAIL());
    expect((await post()).status).toBe(403);
    vi.mocked(requireAdmin).mockResolvedValueOnce(NO_SESSION());
    expect((await post()).status).toBe(401);
    vi.mocked(requireAdmin).mockResolvedValueOnce(NOT_ADMIN());
    expect((await post()).status).toBe(403);
    expect(issueAdminCode).not.toHaveBeenCalled();
  });

  it('429 after three codes in ten minutes', async () => {
    vi.mocked(issueAdminCode).mockResolvedValue('too-many');
    const res = await post();
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ error: 'ADMIN_CODE_TOO_MANY' });
    expect(later.after).not.toHaveBeenCalled();
  });

  it('503 when no e-mail can leave', async () => {
    vi.mocked(getEmailQueue).mockReturnValue(null);
    const res = await post();
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: 'ADMIN_CODE_UNAVAILABLE' });
  });

  it('honours the admin rate limit', async () => {
    vi.mocked(enforceAdminRateLimit).mockResolvedValue(
      NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 }),
    );
    expect((await post()).status).toBe(429);
    expect(issueAdminCode).not.toHaveBeenCalled();
  });
});

describe('POST /api/admin-gate/verify', () => {
  const post = (body: unknown) => verify(adminRequest('/api/admin-gate/verify', 'POST', body));

  it('opens the door for this admin, on this browser, and writes it to the journal', async () => {
    const res = await post({ code: 'abcd 2345' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ open: true });
    expect(checkAdminCode).toHaveBeenCalledWith(prismaMock, 'admin_1', 'ABCD2345');
    const cookie = __cookieStore.get(ADMIN_GATE_COOKIE);
    expect(await verifyGateToken(cookie?.value, 'admin_1')).toBe(true);
    expect(logAdminAction).toHaveBeenCalledWith(
      prismaMock,
      expect.objectContaining({ actorId: 'admin_1', action: 'admin.door_opened' }),
    );
  });

  it('a wrong, expired or used code answers the same 400 and sets no cookie', async () => {
    vi.mocked(checkAdminCode).mockResolvedValue('invalid');
    const res = await post({ code: 'ABCD2345' });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'ADMIN_CODE_INVALID' });
    expect(__cookieStore.has(ADMIN_GATE_COOKIE)).toBe(false);
    expect(logAdminAction).not.toHaveBeenCalled();
  });

  it('a malformed code never reaches the database', async () => {
    for (const body of [
      null,
      {},
      { code: 'short' },
      { code: 'abcd-2345-and-more-text' },
      { code: 12345678 },
    ]) {
      expect((await post(body)).status).toBe(400);
    }
    expect(checkAdminCode).not.toHaveBeenCalled();
  });

  it('refuses without CSRF, without a session, and to a non-admin', async () => {
    vi.mocked(verifyCsrf).mockReturnValueOnce(CSRF_FAIL());
    expect((await post({ code: 'ABCD2345' })).status).toBe(403);
    vi.mocked(requireAdmin).mockResolvedValueOnce(NO_SESSION());
    expect((await post({ code: 'ABCD2345' })).status).toBe(401);
    vi.mocked(requireAdmin).mockResolvedValueOnce(NOT_ADMIN());
    expect((await post({ code: 'ABCD2345' })).status).toBe(403);
    expect(checkAdminCode).not.toHaveBeenCalled();
    expect(__cookieStore.has(ADMIN_GATE_COOKIE)).toBe(false);
  });
});

describe('POST /api/admin-gate/leave', () => {
  it('closes the door, CSRF checked', async () => {
    const res = await leave(adminRequest('/api/admin-gate/leave', 'POST'));
    expect(await res.json()).toEqual({ closed: true });
    expect(__cookieStore.get(ADMIN_GATE_COOKIE)?.options).toMatchObject({ maxAge: 0 });
    vi.mocked(verifyCsrf).mockReturnValueOnce(CSRF_FAIL());
    expect((await leave(adminRequest('/api/admin-gate/leave', 'POST'))).status).toBe(403);
  });
});

describe('the door routes', () => {
  it.each(['code', 'verify', 'leave'])('%s runs on nodejs and checks CSRF first', (name) => {
    const src = readFileSync(
      path.join(process.cwd(), 'src/app/api/admin-gate', name, 'route.ts'),
      'utf8',
    );
    expect(src).toContain("export const runtime = 'nodejs'");
    expect(src.indexOf('verifyCsrf(req)')).toBeGreaterThan(0);
  });
});
