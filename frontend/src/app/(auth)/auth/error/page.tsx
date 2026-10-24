'use client';

// /auth/error: where a failed Google sign-in lands. The callback redirects
// with one of the five UPPERCASE codes of lib/server/oauth/error-redirect.ts
// (`?code=`); `?error=` is read too. Unknown codes get the generic message.
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthTitle } from '@/components/app/AuthForm';
import { Button } from '@/components/ui';

const MESSAGES: Record<string, string> = {
  GOOGLE_EMAIL_NOT_VERIFIED:
    "Ton adresse Google n'est pas vérifiée. Vérifie-la dans ton compte Google, puis réessaie.",
  OAUTH_STATE_MISMATCH:
    'La connexion a été interrompue, souvent parce que la page Google est restée ouverte trop longtemps. Réessaie.',
  OAUTH_CODE_EXCHANGE_FAILED: 'Google a refusé la connexion. Réessaie dans un instant.',
  OAUTH_PROVIDER_DISABLED:
    "La connexion avec Google n'est pas activée. Connecte-toi avec ton email et ton mot de passe.",
};
const GENERIC = 'La connexion a échoué. Réessaie, ou connecte-toi avec ton email.';

function AuthErrorBody() {
  const params = useSearchParams();
  const code = (params.get('code') ?? params.get('error') ?? '').toUpperCase();
  return (
    <>
      <AuthTitle title="La connexion n'a pas marché" />
      <p className="mt-6 text-ink">{MESSAGES[code] ?? GENERIC}</p>
      <Button href="/login" size="lg" className="mt-8 w-full shadow-press">
        Revenir à la connexion
      </Button>
    </>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={null}>
      <AuthErrorBody />
    </Suspense>
  );
}
