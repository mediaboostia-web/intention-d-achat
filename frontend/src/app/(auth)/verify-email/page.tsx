import type { Metadata } from 'next';
import { Suspense } from 'react';
import { VerifyEmailForm } from './verify-form';

export const metadata: Metadata = { title: 'Vérifier ton email — Tamani' };

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailForm />
    </Suspense>
  );
}
