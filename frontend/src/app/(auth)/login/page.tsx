import type { Metadata } from 'next';
import { Suspense } from 'react';
import { googleSignInEnabled } from '@/lib/server/oauth/google-enabled';
import { LoginForm } from './login-form';

// Copy brief §9.4 and §9.7: its own title, and out of search but its links followed.
export const metadata: Metadata = {
  title: { absolute: 'Connexion à Tamani | Espace commerçant' },
  description:
    'Connecte-toi à ton espace Tamani pour retrouver tes produits, campagnes et réponses clients.',
  robots: { index: false, follow: true },
};

// useSearchParams (?next=, ?reset=) needs a Suspense boundary in Next 16.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm google={googleSignInEnabled()} />
    </Suspense>
  );
}
