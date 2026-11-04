// The support-admin gate for server pages (lot 11). Next renders a page and
// its layout side by side, so each one asks for itself.
import 'server-only';
import { NextResponse } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/server/middleware';
import { ADMIN_HOME, adminGate } from '@/lib/tamani/admin-nav';

export type AdminViewer = { id: string; email: string; role: string };

/** The signed-in admin, or sign in (no session), or not found (not an admin). */
export async function adminOnly(): Promise<AdminViewer> {
  const auth = await requireAdmin('ADMIN');
  if (!(auth instanceof NextResponse)) return auth.admin;
  if (adminGate(auth.status === 401 ? 401 : 403) === 'login') {
    redirect(`/login?next=${encodeURIComponent(ADMIN_HOME)}`);
  }
  notFound();
}
