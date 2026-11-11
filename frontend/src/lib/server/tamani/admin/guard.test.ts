import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

vi.mock('@/lib/server/middleware', () => ({ requireAdmin: vi.fn(), requireSuperadmin: vi.fn() }));
vi.mock('next/navigation', async () => (await import('@/test-utils/next-navigation')).navigation);
vi.mock('./gate', () => ({ hasAdminGate: vi.fn() }));

import { requireAdmin } from '@/lib/server/middleware';
import { ADMIN_CTX } from '@/test-utils/admin-contexts';
import { hasAdminGate } from './gate';
import { adminOnly } from './guard';

beforeEach(() => {
  vi.mocked(requireAdmin).mockReset();
  vi.mocked(hasAdminGate).mockReset().mockResolvedValue(true);
});

describe('adminOnly', () => {
  it('returns the signed-in admin who passed the door', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(ADMIN_CTX);
    await expect(adminOnly()).resolves.toEqual(ADMIN_CTX.admin);
    expect(hasAdminGate).toHaveBeenCalledWith(ADMIN_CTX.admin.id);
  });

  // Lot 11c (porteur 2026-11-08): the back-office has its own door.
  it('sends a visitor without a session to the admin door, not to the shop sign-in', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(NextResponse.json({}, { status: 401 }));
    await expect(adminOnly()).rejects.toThrow('NEXT_REDIRECT /support-admin/connexion');
  });

  it('sends an admin signed in from the shop page, without the code, to the door', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(ADMIN_CTX);
    vi.mocked(hasAdminGate).mockResolvedValue(false);
    await expect(adminOnly()).rejects.toThrow('NEXT_REDIRECT /support-admin/connexion');
  });

  it('answers « not found » to a signed-in user who is not an admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(NextResponse.json({}, { status: 403 }));
    await expect(adminOnly()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(hasAdminGate).not.toHaveBeenCalled();
  });
});
