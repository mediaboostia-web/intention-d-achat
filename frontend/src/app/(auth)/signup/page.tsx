import type { Metadata } from 'next';
import { Suspense } from 'react';
import { googleSignInEnabled } from '../google';
import { SignupForm } from './signup-form';

export const metadata: Metadata = { title: 'Créer un compte — Tamani' };

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm google={googleSignInEnabled()} />
    </Suspense>
  );
}
