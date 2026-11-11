import type { Metadata } from 'next';
import { NextResponse } from 'next/server';
import { redirect } from 'next/navigation';
import { AdminDoor } from '@/components/admin/AdminDoor';
import { Logo } from '@/components/ui';
import { requireAdmin } from '@/lib/server/middleware';
import { hasAdminGate } from '@/lib/server/tamani/admin/gate';
import { ADMIN_HOME, maskEmail } from '@/lib/tamani/admin-nav';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { absolute: 'Support-admin · Connexion' },
  robots: { index: false, follow: false },
};

/**
 * The support-admin's own door (lot 11c): the password, then a code sent to
 * the admin's mailbox. It sits outside the back-office layout, in its own
 * route group, so it renders without a session.
 */
export default async function AdminDoorPage() {
  const auth = await requireAdmin('ADMIN');
  const admin = auth instanceof NextResponse ? null : auth.admin;
  if (admin && (await hasAdminGate(admin.id))) redirect(ADMIN_HOME);

  return (
    <div className="grid min-h-dvh place-items-center bg-admin-bg px-4 py-10">
      <main className="admin-card w-full max-w-md rounded-sheet p-6 sm:p-8">
        <Logo size={30} />
        <p className="mt-3 inline-flex rounded-full bg-admin-soft px-3 py-1 text-sm font-bold text-admin">
          Support-admin
        </p>
        <div className="mt-6">
          <AdminDoor {...(admin ? { signedInAs: maskEmail(admin.email) } : {})} />
        </div>
      </main>
    </div>
  );
}
