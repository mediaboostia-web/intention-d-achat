import { prismaMock } from '@/test-utils/prisma-mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/server/middleware', () => ({ requireAdmin: vi.fn(), requireSuperadmin: vi.fn() }));
vi.mock('@/lib/server/middleware/rate-limit-by-userid', () => ({
  enforceAdminRateLimit: vi.fn(),
}));
vi.mock('@/lib/server/auth', async () => ({
  ...(await vi.importActual<typeof import('@/lib/server/auth')>('@/lib/server/auth')),
  verifyCsrf: vi.fn(),
}));
vi.mock('@/lib/server/admin/audit', () => ({ logAdminAction: vi.fn() }));

import { requireSuperadmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { verifyCsrf } from '@/lib/server/auth';
import { logAdminAction } from '@/lib/server/admin/audit';
import { runTransactionsInline } from '@/test-utils/shop-fixtures';
import { SUPERADMIN_CTX, SUPERADMIN_REQUIRED, adminRequest } from '@/test-utils/admin-contexts';
import { DELETE, runtime } from './route';

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const del = (id: string) => DELETE(adminRequest(`/api/admin/waitlist/${id}`, 'DELETE'), params(id));

beforeEach(() => {
  vi.mocked(verifyCsrf).mockReturnValue(null);
  vi.mocked(requireSuperadmin).mockReset().mockResolvedValue(SUPERADMIN_CTX);
  vi.mocked(enforceAdminRateLimit).mockResolvedValue(null);
  vi.mocked(logAdminAction).mockReset().mockResolvedValue(undefined);
  runTransactionsInline();
});

describe('DELETE /api/admin/waitlist/[id]', () => {
  it('runs on node', () => expect(runtime).toBe('nodejs'));

  it('removes one entry and journals it, without its contact', async () => {
    prismaMock.waitlistEntry.findUnique.mockResolvedValue({ id: 'w1' } as never);
    const res = await del('w1');
    expect(await res.json()).toEqual({ deleted: true });
    expect(prismaMock.waitlistEntry.delete).toHaveBeenCalledWith({ where: { id: 'w1' } });
    expect(logAdminAction).toHaveBeenCalledWith(prismaMock, {
      actorId: SUPERADMIN_CTX.admin.id,
      action: 'waitlist.delete',
      targetType: 'WaitlistEntry',
      targetId: 'w1',
    });
  });

  it('an unknown entry is a 404', async () => {
    prismaMock.waitlistEntry.findUnique.mockResolvedValue(null);
    expect((await del('x')).status).toBe(404);
  });

  it('is for a super-admin only', async () => {
    vi.mocked(requireSuperadmin).mockResolvedValue(SUPERADMIN_REQUIRED());
    expect((await del('w1')).status).toBe(403);
    expect(prismaMock.waitlistEntry.delete).not.toHaveBeenCalled();
  });
});
