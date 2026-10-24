import type { Metadata } from 'next';
import { Suspense } from 'react';
import { googleSignInEnabled } from '@/lib/server/oauth/google-enabled';
import { SignupForm } from './signup-form';

export const metadata: Metadata = { title: 'Créer un compte — Tamani' };

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm google={googleSignInEnabled()} />
    </Suspense>
  );
}
