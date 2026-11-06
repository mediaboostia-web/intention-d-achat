import { prismaMock } from '@/test-utils/prisma-mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

vi.mock('@/lib/server/middleware', () => ({ requireAdmin: vi.fn() }));
vi.mock('@/lib/server/middleware/rate-limit-by-userid', () => ({
  enforceAdminRateLimit: vi.fn(),
}));
vi.mock('@/lib/server/auth', async () => ({
  ...(await vi.importActual<typeof import('@/lib/server/auth')>('@/lib/server/auth')),
  verifyCsrf: vi.fn(),
}));
vi.mock('@/lib/server/tamani/admin/feed', () => ({ markFeedSeen: vi.fn() }));

import { requireAdmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { verifyCsrf } from '@/lib/server/auth';
import { markFeedSeen } from '@/lib/server/tamani/admin/feed';
import { ADMIN_CTX, adminRequest } from '@/test-utils/admin-contexts';
import { POST } from './route';

beforeEach(() => {
  vi.mocked(verifyCsrf).mockReturnValue(null);
  vi.mocked(requireAdmin).mockReset().mockResolvedValue(ADMIN_CTX);
  vi.mocked(enforceAdminRateLimit).mockResolvedValue(null);
  vi.mocked(markFeedSeen).mockReset().mockResolvedValue(undefined);
});

describe('POST /api/admin/feed/seen', () => {
  it('marks the feed seen for this admin only', async () => {
    const res = await POST(adminRequest('/api/admin/feed/seen', 'POST', {}));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ seen: true });
    expect(requireAdmin).toHaveBeenCalledWith('ADMIN');
    expect(markFeedSeen).toHaveBeenCalledWith(prismaMock, 'admin_1', expect.any(Date));
  });

  it('checks the CSRF token first', async () => {
    vi.mocked(verifyCsrf).mockReturnValue(NextResponse.json({}, { status: 403 }));
    const res = await POST(adminRequest('/api/admin/feed/seen', 'POST', {}));
    expect(res.status).toBe(403);
    expect(requireAdmin).not.toHaveBeenCalled();
    expect(markFeedSeen).not.toHaveBeenCalled();
  });
});
