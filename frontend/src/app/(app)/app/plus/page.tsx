'use client';

// /app/plus: what the phone's bottom bar has no room for (porteur's
// feedback 2, §8), as one list. The account moved to /app/profil.
import { useRouter } from 'next/navigation';
import { PlusMenu } from '@/components/app/PlusMenu';
import { useShop } from '@/components/app/ShopProvider';
import { PageHeader } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { LANDING_LINKS } from '@/lib/tamani/landing';

export default function PlusPage() {
  const router = useRouter();
  const { shop } = useShop();
  const { logout, loggingOut } = useAuth();

  async function signOut() {
    await logout();
    router.replace('/login');
  }

  return (
    <>
      <PageHeader title="Plus" />
      <PlusMenu
        plan={shop.plan}
        help={LANDING_LINKS.whatsappContact}
        signingOut={loggingOut}
        onSignOut={() => void signOut()}
      />
    </>
  );
}
