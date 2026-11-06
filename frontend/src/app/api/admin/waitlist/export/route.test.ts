import { prismaMock } from '@/test-utils/prisma-mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

vi.mock('@/lib/server/middleware', () => ({ requireAdmin: vi.fn() }));
vi.mock('@/lib/server/middleware/rate-limit-by-userid', () => ({
  enforceAdminRateLimit: vi.fn(),
}));

import { requireAdmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { NextRequest } from 'next/server';
import { GET } from './route';

const ADMIN = {
  user: { sub: 'admin_1', email: 'admin@test.local' },
  admin: { id: 'admin_1', email: 'admin@test.local', role: 'ADMIN' as const },
};
const get = () => GET(new NextRequest('http://localhost:3001/api/admin/waitlist/export'));

beforeEach(() => {
  vi.mocked(requireAdmin).mockReset().mockResolvedValue(ADMIN);
  vi.mocked(enforceAdminRateLimit).mockResolvedValue(null);
  prismaMock.waitlistEntry.findMany.mockResolvedValue([
    {
      id: 'w_1',
      firstName: 'Awa',
      phone: '+2290197000000',
      email: null,
      channels: ['CHAINE_WHATSAPP'],
      source: 'dm',
      consentAt: new Date('2026-11-06T08:00:00Z'),
      createdAt: new Date('2026-11-06T08:00:00Z'),
    },
  ] as never);
});

describe('GET /api/admin/waitlist/export', () => {
  it('hands the list as a dated spreadsheet, never cached', async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/csv; charset=utf-8');
    expect(res.headers.get('content-disposition')).toMatch(
      /^attachment; filename="liste-attente-\d{4}-\d{2}-\d{2}\.csv"$/,
    );
    expect(res.headers.get('cache-control')).toBe('no-store');
    const body = await res.text();
    expect(body).toContain('Rang;Prénom;WhatsApp;E-mail;Où il vend;Source;Date');
    expect(body).toContain('Awa');
    expect(requireAdmin).toHaveBeenCalledWith('ADMIN');
  });

  it('is for the admins only', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(
      NextResponse.json({ error: 'ADMIN_REQUIRED' }, { status: 403 }),
    );
    expect((await get()).status).toBe(403);
    expect(prismaMock.waitlistEntry.findMany).not.toHaveBeenCalled();
  });
});
