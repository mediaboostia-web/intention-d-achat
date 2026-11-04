'use client';

import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

/** Ends the session, then the sign-in page. */
export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const { logout, loggingOut } = useAuth();
  async function signOut() {
    await logout();
    router.replace('/login');
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
