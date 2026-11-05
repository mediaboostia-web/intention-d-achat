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
}));
vi.mock('@/lib/server/admin/audit', () => ({ logAdminAction: vi.fn() }));
vi.mock('@/lib/server/tamani/admin/admins', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server/tamani/admin/admins')>()),
  listAdmins: vi.fn(),
  addAdmin: vi.fn(),
  changeAdminRole: vi.fn(),
}));

import { requireAdmin, requireSuperadmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { verifyCsrf } from '@/lib/server/auth';
import { logAdminAction } from '@/lib/server/admin/audit';
import { addAdmin, changeAdminRole, listAdmins } from '@/lib/server/tamani/admin/admins';
import { runTransactionsInline } from '@/test-utils/shop-fixtures';
import {
  ADMIN_CTX,
  SUPERADMIN_CTX,
  SUPERADMIN_REQUIRED,
  adminRequest,
} from '@/test-utils/admin-contexts';
import { GET, POST } from './route';
import { PATCH } from './[id]/route';

const ROW = {
  id: 'a_2',
  email: 'fatou@test.local',
  name: 'Fatou',
  role: 'ADMIN',
  createdAt: '2026-10-01T08:00:00.000Z',
};
const DB_USER = { ...ROW, status: 'ACTIVE', createdAt: new Date(ROW.createdAt) };

const post = (body: unknown) => POST(adminRequest('/api/admin/admins', 'POST', body));
const patch = (id: string, body: unknown) =>
  PATCH(adminRequest(`/api/admin/admins/${id}`, 'PATCH', body), {
    params: Promise.resolve({ id }),
  });

beforeEach(() => {
  vi.mocked(verifyCsrf).mockReturnValue(null);
  vi.mocked(requireAdmin).mockReset().mockResolvedValue(ADMIN_CTX);
  vi.mocked(requireSuperadmin).mockReset().mockResolvedValue(SUPERADMIN_CTX);
  vi.mocked(enforceAdminRateLimit).mockResolvedValue(null);
  vi.mocked(logAdminAction).mockReset().mockResolvedValue(undefined);
  vi.mocked(addAdmin).mockReset();
  vi.mocked(changeAdminRole).mockReset();
  runTransactionsInline();
});

describe('GET /api/admin/admins', () => {
  it('lets any admin read the team', async () => {
    vi.mocked(listAdmins).mockResolvedValue([ROW] as never);
    const res = await GET(adminRequest('/api/admin/admins', 'GET'));
    expect(res.status).toBe(200);
    expect(((await res.json()) as { admins: unknown[] }).admins).toEqual([ROW]);
    expect(requireAdmin).toHaveBeenCalledWith('ADMIN');
  });
});

describe('POST /api/admin/admins', () => {
  it('opens an account and hands its temporary password back once, uncached', async () => {
    vi.mocked(addAdmin).mockResolvedValue({
      kind: 'CREATED',
      user: DB_USER,
      temporaryPassword: 'abcdEFGH2345',
    } as never);
    const res = await post({ email: 'fatou@test.local', name: 'Fatou', role: 'ADMIN' });
    expect(res.status).toBe(201);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const json = (await res.json()) as { admin: typeof ROW; temporaryPassword?: string };
    expect(json.temporaryPassword).toBe('abcdEFGH2345');
    expect(json.admin).toEqual(ROW);
    expect(logAdminAction).toHaveBeenCalledWith(prismaMock, {
      actorId: 'superadmin_1',
      action: 'admin.add',
      targetType: 'User',
      targetId: 'a_2',
      metadata: { created: true, role: 'ADMIN' },
    });
    // The password is never journaled.
    expect(JSON.stringify(vi.mocked(logAdminAction).mock.calls)).not.toContain('abcdEFGH2345');
  });

  it('promotes an account with no password in the answer', async () => {
    vi.mocked(addAdmin).mockResolvedValue({ kind: 'PROMOTED', user: DB_USER } as never);
    const res = await post({ email: 'fatou@test.local', role: 'ADMIN' });
    expect(res.status).toBe(201);
    expect(await res.json()).not.toHaveProperty('temporaryPassword');
    expect(vi.mocked(logAdminAction).mock.calls[0]?.[1].metadata).toEqual({
      created: false,
      role: 'ADMIN',
    });
  });

  it('answers 409 ADMIN_ALREADY for an admin', async () => {
    vi.mocked(addAdmin).mockResolvedValue({ kind: 'ALREADY_ADMIN', user: DB_USER } as never);
    const res = await post({ email: 'fatou@test.local', role: 'SUPERADMIN' });
    expect(res.status).toBe(409);
    expect(((await res.json()) as { error: string }).error).toBe('ADMIN_ALREADY');
    expect(logAdminAction).not.toHaveBeenCalled();
  });

  it('refuses a role other than admin or super-admin', async () => {
    const res = await post({ email: 'fatou@test.local', role: 'USER' });
    expect(res.status).toBe(400);
    expect(addAdmin).not.toHaveBeenCalled();
  });

  it('is for a super-admin only, behind the CSRF check', async () => {
    vi.mocked(requireSuperadmin).mockResolvedValue(SUPERADMIN_REQUIRED());
    expect((await post({ email: 'fatou@test.local', role: 'ADMIN' })).status).toBe(403);
    vi.mocked(verifyCsrf).mockReturnValue(NextResponse.json({}, { status: 403 }));
    vi.mocked(requireSuperadmin).mockClear();
    expect((await post({ email: 'fatou@test.local', role: 'ADMIN' })).status).toBe(403);
    expect(requireSuperadmin).not.toHaveBeenCalled();
    expect(addAdmin).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/admin/admins/[id]', () => {
  it('changes a role and journals from and to', async () => {
    vi.mocked(changeAdminRole).mockResolvedValue({
      kind: 'OK',
      from: 'ADMIN',
      to: 'SUPERADMIN',
      user: { ...DB_USER, role: 'SUPERADMIN' },
    } as never);
    const res = await patch('a_2', { role: 'SUPERADMIN' });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { admin: { role: string } }).admin.role).toBe('SUPERADMIN');
    expect(changeAdminRole).toHaveBeenCalledWith(prismaMock, 'superadmin_1', 'a_2', 'SUPERADMIN');
    expect(logAdminAction).toHaveBeenCalledWith(prismaMock, {
      actorId: 'superadmin_1',
      action: 'admin.role_change',
      targetType: 'User',
      targetId: 'a_2',
      metadata: { from: 'ADMIN', to: 'SUPERADMIN' },
    });
  });

  it.each([
    ['SELF', 409, 'ADMIN_SELF_CHANGE'],
    ['LAST_SUPERADMIN', 409, 'ADMIN_LAST_SUPERADMIN'],
    ['NOT_FOUND', 404, 'ADMIN_NOT_FOUND'],
  ] as const)('answers %s with %i %s', async (kind, status, code) => {
    vi.mocked(changeAdminRole).mockResolvedValue({ kind } as never);
    const res = await patch('a_2', { role: 'USER' });
    expect(res.status).toBe(status);
    expect(((await res.json()) as { error: string }).error).toBe(code);
    expect(logAdminAction).not.toHaveBeenCalled();
  });

  it('is for a super-admin only, behind the CSRF check', async () => {
    vi.mocked(requireSuperadmin).mockResolvedValue(SUPERADMIN_REQUIRED());
    expect((await patch('a_2', { role: 'USER' })).status).toBe(403);
    vi.mocked(verifyCsrf).mockReturnValue(NextResponse.json({}, { status: 403 }));
    vi.mocked(requireSuperadmin).mockClear();
    expect((await patch('a_2', { role: 'USER' })).status).toBe(403);
    expect(requireSuperadmin).not.toHaveBeenCalled();
    expect(changeAdminRole).not.toHaveBeenCalled();
  });
});
