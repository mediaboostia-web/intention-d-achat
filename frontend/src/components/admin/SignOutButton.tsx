'use client';

import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { ADMIN_DOOR } from '@/lib/tamani/admin-nav';
import { cn } from '@/lib/utils';

/** Closes the support-admin door, ends the session, then the admin's sign-in page. */
export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const { logout, loggingOut } = useAuth();
  async function signOut() {
    // The door first, while the CSRF token still exists. Sign-out goes on
    // even if this call fails: the door cookie is useless without a session.
    await api('/api/admin-gate/leave', { method: 'POST' }).catch(() => undefined);
    await logout();
    router.replace(ADMIN_DOOR);
  }
  return (
    <button
      type="button"
      disabled={loggingOut}
      onClick={() => void signOut()}
      className={cn(
        'flex min-h-11 items-center gap-3 rounded-control px-3 font-bold text-ink-soft hover:bg-admin-soft hover:text-admin disabled:opacity-60',
        className,
      )}
    >
      <Icon name="logout" className="size-5 shrink-0" />
      {loggingOut ? 'Déconnexion…' : 'Se déconnecter'}
    </button>
  );
}
