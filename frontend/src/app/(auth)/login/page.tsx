import type { Metadata } from 'next';
import { Suspense } from 'react';
import { googleSignInEnabled } from '@/lib/server/oauth/google-enabled';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Se connecter — Tamani' };

// useSearchParams (?next=, ?reset=) needs a Suspense boundary in Next 16.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm google={googleSignInEnabled()} />
    </Suspense>
  );
}
