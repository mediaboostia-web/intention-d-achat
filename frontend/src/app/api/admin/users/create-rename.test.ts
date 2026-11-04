// Lot 11: POST /api/admin/users (create an account) and
// PATCH /api/admin/users/[id] (rename), next to the kit's reads.
import { prismaMock } from '@/test-utils/prisma-mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

vi.mock('@/lib/server/middleware', () => ({ requireAdmin: vi.fn(), requireSuperadmin: vi.fn() }));
vi.mock('@/lib/server/middleware/rate-limit-by-userid', () => ({
  enforceAdminRateLimit: vi.fn(),
}));
vi.mock('@/lib/server/auth', async () => ({
  ...(await vi.importActual<typeof import('@/lib/server/auth')>('@/lib/server/auth')),
  verifyCsrf: vi.fn(),
  hashPassword: vi.fn(async () => 'bcrypt-hash'),
}));
vi.mock('@/lib/server/admin/audit', () => ({ logAdminAction: vi.fn() }));

import { requireAdmin, requireSuperadmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { verifyCsrf } from '@/lib/server/auth';
import { logAdminAction } from '@/lib/server/admin/audit';
import { runTransactionsInline } from '@/test-utils/shop-fixtures';
import {
  ADMIN_CTX,
  SUPERADMIN_CTX,
  SUPERADMIN_REQUIRED,
  adminRequest,
} from '@/test-utils/admin-contexts';
import { POST } from './route';
import { PATCH } from './[id]/route';

const create = (body: unknown) => POST(adminRequest('/api/admin/users', 'POST', body));
const rename = (body: unknown) =>
  PATCH(adminRequest('/api/admin/users/u_1', 'PATCH', body), {
    params: Promise.resolve({ id: 'u_1' }),
  });

beforeEach(() => {
  vi.mocked(verifyCsrf).mockReturnValue(null);
  vi.mocked(requireAdmin).mockReset().mockResolvedValue(ADMIN_CTX);
  vi.mocked(requireSuperadmin).mockReset().mockResolvedValue(SUPERADMIN_CTX);
  vi.mocked(enforceAdminRateLimit).mockResolvedValue(null);
  vi.mocked(logAdminAction).mockReset().mockResolvedValue(undefined);
  runTransactionsInline();
  prismaMock.user.findUnique.mockResolvedValue(null);
  prismaMock.user.create.mockResolvedValue({
    id: 'u_1',
    email: 'awa@test.local',
    name: 'Awa',
    role: 'USER',
    status: 'ACTIVE',
  } as never);
});

describe('POST /api/admin/users', () => {
  it('creates the account, hands the temporary password back once, journals no secret', async () => {
    const res = await create({ email: '  Awa@Test.local ', name: ' Awa ' });
    expect(res.status).toBe(201);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const body = await res.json();
    expect(body.user).toMatchObject({ id: 'u_1', email: 'awa@test.local' });
    expect(body.temporaryPassword).toHaveLength(12);
    expect(prismaMock.user.create.mock.calls[0]![0].data).toMatchObject({
      email: 'awa@test.local',
      name: 'Awa',
    });
    expect(logAdminAction).toHaveBeenCalledWith(prismaMock, {
      actorId: 'superadmin_1',
      action: 'user.create',
      targetType: 'User',
      targetId: 'u_1',
      metadata: { role: 'USER' },
    });
    const journaled = JSON.stringify(vi.mocked(logAdminAction).mock.calls);
    expect(journaled).not.toContain(body.temporaryPassword);
    expect(journaled).not.toContain('awa@test.local');
  });

  it('answers 409 for an e-mail already taken, writes nothing', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u_0' } as never);
    const res = await create({ email: 'awa@test.local', name: 'Awa' });
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: 'EMAIL_TAKEN' });
    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(logAdminAction).not.toHaveBeenCalled();
  });

  it.each([
    { email: 'pas-un-email', name: 'Awa' },
    { email: 'awa@test.local', name: '   ' },
    { email: 'awa@test.local', name: 'x'.repeat(81) },
  ])('refuses %o', async (body) => {
    expect((await create(body)).status).toBe(400);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('is for a super-admin only', async () => {
    vi.mocked(requireSuperadmin).mockResolvedValue(SUPERADMIN_REQUIRED());
    expect((await create({ email: 'awa@test.local', name: 'Awa' })).status).toBe(403);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('checks the CSRF token first', async () => {
    vi.mocked(verifyCsrf).mockReturnValue(NextResponse.json({}, { status: 403 }));
    expect((await create({ email: 'awa@test.local', name: 'Awa' })).status).toBe(403);
    expect(requireSuperadmin).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/admin/users/[id]', () => {
  beforeEach(() => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u_1' } as never);
    prismaMock.user.update.mockResolvedValue({ id: 'u_1', name: 'Awa Diallo' } as never);
  });

  it('renames the account, journaled without the name', async () => {
    const res = await rename({ name: ' Awa Diallo ' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user: { id: 'u_1', name: 'Awa Diallo' } });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'u_1' },
      data: { name: 'Awa Diallo' },
      select: { id: true, name: true },
    });
    expect(logAdminAction).toHaveBeenCalledWith(prismaMock, {
      actorId: 'admin_1',
      action: 'user.rename',
      targetType: 'User',
      targetId: 'u_1',
    });
  });

  it('answers 404 for an unknown account', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    expect((await rename({ name: 'Awa' })).status).toBe(404);
    expect(logAdminAction).not.toHaveBeenCalled();
  });

  it('refuses an empty name', async () => {
    expect((await rename({ name: '  ' })).status).toBe(400);
  });

  it('checks the CSRF token first', async () => {
    vi.mocked(verifyCsrf).mockReturnValue(NextResponse.json({}, { status: 403 }));
    expect((await rename({ name: 'Awa' })).status).toBe(403);
    expect(requireAdmin).not.toHaveBeenCalled();
  });
});
