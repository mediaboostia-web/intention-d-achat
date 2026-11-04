import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

vi.mock('@/lib/server/middleware', () => ({ requireAdmin: vi.fn() }));
vi.mock('next/navigation', async () => (await import('@/test-utils/next-navigation')).navigation);

import { requireAdmin } from '@/lib/server/middleware';
import { ADMIN_CTX } from '@/test-utils/admin-contexts';
import { adminOnly } from './guard';

beforeEach(() => vi.mocked(requireAdmin).mockReset());

describe('adminOnly', () => {
  it('returns the signed-in admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(ADMIN_CTX);
    await expect(adminOnly()).resolves.toEqual(ADMIN_CTX.admin);
  });

  it('sends a visitor without a session to sign in, then back', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(NextResponse.json({}, { status: 401 }));
    await expect(adminOnly()).rejects.toThrow('NEXT_REDIRECT /login?next=%2Fsupport-admin');
  });

  it('answers « not found » to a signed-in user who is not an admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(NextResponse.json({}, { status: 403 }));
    await expect(adminOnly()).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
