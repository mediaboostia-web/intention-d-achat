// The support-admin gate for server pages (lot 11). Next renders a page and
// its layout side by side, so each one asks for itself.
import 'server-only';
import { NextResponse } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/server/middleware';
import { ADMIN_DOOR, adminGate } from '@/lib/tamani/admin-nav';
import { hasAdminGate } from './gate';

export type AdminViewer = { id: string; email: string; role: string };

/**
 * The signed-in admin who passed the door, or the door (no session, or no
 * code entered on this browser), or not found (not an admin).
 */
export async function adminOnly(): Promise<AdminViewer> {
  const auth = await requireAdmin('ADMIN');
  if (auth instanceof NextResponse) {
    if (adminGate(auth.status === 401 ? 401 : 403) === 'login') redirect(ADMIN_DOOR);
    notFound();
  }
  if (adminGate('ok', await hasAdminGate(auth.admin.id)) === 'login') redirect(ADMIN_DOOR);
  return auth.admin;
}
