// Support-admin route tests (lot 11). Each test file still mocks
// '@/lib/server/middleware', the rate limit, verifyCsrf and the audit at its
// own top level (vi.mock hoists per file); this holds what they share.
import { NextRequest, NextResponse } from 'next/server';

export const ADMIN_CTX = {
  user: { sub: 'admin_1', email: 'admin@test.local' },
  admin: { id: 'admin_1', email: 'admin@test.local', role: 'ADMIN' as const },
};

export const SUPERADMIN_CTX = {
  user: { sub: 'superadmin_1', email: 'superadmin@test.local' },
  admin: { id: 'superadmin_1', email: 'superadmin@test.local', role: 'SUPERADMIN' as const },
};

/** What requireSuperadmin answers an ADMIN. */
export const SUPERADMIN_REQUIRED = () =>
  NextResponse.json({ error: 'ADMIN_REQUIRED', message: 'Admin access required' }, { status: 403 });

export function adminRequest(path: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost:3001${path}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-csrf-token': 'csrf' },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
}
