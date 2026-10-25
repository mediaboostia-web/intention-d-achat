'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthForm, AuthLink, GoogleButton } from '@/components/app/AuthForm';
import { PasswordInput } from '@/components/app/PasswordInput';
import { Input } from '@/components/ui';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/tamani/api-messages';
import { safeNextPath } from '@/lib/tamani/safe-next';

// Mirrors AUTH_PASSWORD_MIN_LENGTH (server default 10); the server has the last word.
const PASSWORD_MIN = 10;

export function SignupForm({ google }: { google: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      // Signup never signs in: the account opens once the emailed code is entered.
      await api('/api/auth/signup', { method: 'POST', body: { email, password } });
      router.push(
        `/verify-email?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`,
      );
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <AuthForm
      title="Crée ton espace"
      note="Tu crées ta boutique juste après."
      error={error}
      submitLabel="Créer mon compte"
      submittingLabel="Création…"
      submitting={submitting}
      onSubmit={onSubmit}
      after={
        <>
          {google && <GoogleButton next={next} />}
          <AuthLink question="Déjà un compte ?" href="/login">
            Connecte-toi
          </AuthLink>
        </>
      }
    >
      <Input
        id="email"
        label="Ton email"
        hint="On t'y envoie un code pour ouvrir ton compte."
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <PasswordInput
        id="password"
        label="Mot de passe"
        hint={`${PASSWORD_MIN} caractères au moins.`}
        required
        minLength={PASSWORD_MIN}
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
    </AuthForm>
  );
}
