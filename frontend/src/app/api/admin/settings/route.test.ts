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
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { revalidatePath } from 'next/cache';
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
import { GET, PUT } from './route';

const BODY = {
  displayName: 'Tamani',
  contactEmail: 'contact@tamani.app',
  whatsappContact: 'https://wa.me/2290195831126',
  community: '',
  facebook: 'https://www.facebook.com/tamani',
  instagram: '',
  tiktok: 'https://www.tiktok.com/@tamani',
  videoUrl: '',
  captionsUrl: '',
};

const SAVED = {
  id: 'platform',
  displayName: 'Tamani',
  contactEmail: 'contact@tamani.app',
  whatsappContact: 'https://wa.me/2290195831126',
  community: null,
  facebook: 'https://www.facebook.com/tamani',
  instagram: null,
  tiktok: 'https://www.tiktok.com/@tamani',
  videoUrl: null,
  captionsUrl: null,
  updatedAt: new Date('2026-11-05T10:00:00Z'),
  updatedById: 'superadmin_1',
};

const put = (body: unknown) => PUT(adminRequest('/api/admin/settings', 'PUT', body));

beforeEach(() => {
  vi.mocked(verifyCsrf).mockReturnValue(null);
  vi.mocked(requireAdmin).mockReset().mockResolvedValue(ADMIN_CTX);
  vi.mocked(requireSuperadmin).mockReset().mockResolvedValue(SUPERADMIN_CTX);
  vi.mocked(enforceAdminRateLimit).mockResolvedValue(null);
  vi.mocked(logAdminAction).mockReset().mockResolvedValue(undefined);
  vi.mocked(revalidatePath).mockReset();
  runTransactionsInline();
  prismaMock.platformSetting.findUnique.mockResolvedValue({
    ...SAVED,
    facebook: null,
    tiktok: null,
  } as never);
  prismaMock.platformSetting.upsert.mockResolvedValue(SAVED as never);
});

describe('PUT /api/admin/settings', () => {
  it('saves the settings, journals the changed fields, and rebuilds the public pages', async () => {
    const res = await put(BODY);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { settings: { links: { facebook: string | null } } };
    expect(json.settings.links.facebook).toBe('https://www.facebook.com/tamani');
    expect(prismaMock.platformSetting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'platform' },
        create: expect.objectContaining({
          id: 'platform',
          community: null,
          updatedById: 'superadmin_1',
        }),
        update: expect.objectContaining({ facebook: 'https://www.facebook.com/tamani' }),
      }),
    );
    expect(logAdminAction).toHaveBeenCalledWith(prismaMock, {
      actorId: 'superadmin_1',
      action: 'platform.settings_update',
      targetType: 'PlatformSetting',
      targetId: 'platform',
      metadata: { changed: ['facebook', 'tiktok'] },
    });
    // The three public pages, then the shop space's layout (its « Aide » link).
    expect(vi.mocked(revalidatePath).mock.calls).toEqual([
      ['/'],
      ['/forfaits'],
      ['/llms.txt'],
      ['/app', 'layout'],
    ]);
  });

  it('refuses a link that is not https on its own site', async () => {
    const res = await put({ ...BODY, facebook: 'http://www.facebook.com/tamani' });
    expect(res.status).toBe(400);
    expect((await res.json()) as { error: string }).toMatchObject({ error: 'VALIDATION_FAILED' });
    expect(prismaMock.platformSetting.upsert).not.toHaveBeenCalled();
  });

  it('is for a super-admin only', async () => {
    vi.mocked(requireSuperadmin).mockResolvedValue(SUPERADMIN_REQUIRED());
    const res = await put(BODY);
    expect(res.status).toBe(403);
    expect(prismaMock.platformSetting.upsert).not.toHaveBeenCalled();
  });

  it('checks the CSRF token first', async () => {
    vi.mocked(verifyCsrf).mockReturnValue(NextResponse.json({}, { status: 403 }));
    const res = await put(BODY);
    expect(res.status).toBe(403);
    expect(requireSuperadmin).not.toHaveBeenCalled();
  });
});

describe('GET /api/admin/settings', () => {
  it('lets any admin read the settings', async () => {
    prismaMock.platformSetting.findUnique.mockResolvedValue(SAVED as never);
    const res = await GET(adminRequest('/api/admin/settings', 'GET'));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { settings: { contactEmail: string } };
    expect(json.settings.contactEmail).toBe('contact@tamani.app');
    expect(requireAdmin).toHaveBeenCalledWith('ADMIN');
  });
});
