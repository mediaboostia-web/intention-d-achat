'use client';

// /app/profil: the person behind the shop (porteur's feedback 2, §8). The
// account comes from GET /api/auth/me through useAuth (hasPassword picks
// « Changer » or « Créer un mot de passe »); a new name reloads the shop so
// the header's avatar and the greeting follow.
import { useRouter } from 'next/navigation';
import { ProfileView, type PasswordChange } from '@/components/app/ProfileView';
import { useShop } from '@/components/app/ShopProvider';
import { PageHeader } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';

export default function ProfilePage() {
  const router = useRouter();
  const { shop, me, reload } = useShop();
  const { user, refresh, logout, loggingOut } = useAuth();
  const { toast } = useToast();

  async function rename(name: string) {
    await api('/api/account', { method: 'PATCH', body: { name } });
    await reload();
    toast('Nom enregistré.', 'success');
  }

  async function changePassword({ currentPassword, newPassword }: PasswordChange) {
    if (currentPassword === null) {
      await api('/api/auth/set-password', { method: 'POST', body: { newPassword } });
      toast('Mot de passe créé : tu peux aussi te connecter par e-mail.', 'success');
    } else {
      await api('/api/auth/change-password', {
        method: 'PUT',
        body: { currentPassword, newPassword },
      });
      toast('Mot de passe changé.', 'success');
    }
    await refresh();
  }

  async function signOut() {
    await logout();
    router.replace('/login');
  }

  return (
    <>
      <PageHeader title="Ton profil" />
      {user ? (
        <ProfileView
          name={me.name}
          shopName={shop.name}
          email={user.email}
          hasPassword={user.hasPassword}
          logoUrl={shop.logoUrl}
          signingOut={loggingOut}
          onRename={rename}
          onPassword={changePassword}
          onSignOut={() => void signOut()}
        />
      ) : (
        <p role="status" className="mt-8 text-ink-muted">
          Chargement du profil…
        </p>
      )}
    </>
  );
}
