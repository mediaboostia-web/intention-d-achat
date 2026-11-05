'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
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
  const [firstName, setFirstName] = useState('');
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
      await api('/api/auth/signup', {
        method: 'POST',
        body: { firstName: firstName.trim(), email, password },
      });
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
      title="Créer un compte"
      note="Tu crées ta boutique juste après."
      error={error}
      submitLabel="Créer mon compte"
      submittingLabel="Création…"
      submitting={submitting}
      onSubmit={onSubmit}
      before={google ? <GoogleButton next={next} /> : undefined}
      after={
        <>
          <p className="text-center text-sm text-ink-soft">
            En créant ton compte, tu acceptes les{' '}
            <Link href="/cgu" className="font-bold text-primary underline">
              conditions d&apos;utilisation
            </Link>{' '}
            et la{' '}
            <Link href="/confidentialite" className="font-bold text-primary underline">
              politique de confidentialité
            </Link>
            .
          </p>
        </>
      }
      switchLink={
        <AuthLink question="Déjà un compte ?" href="/login">
          Se connecter
        </AuthLink>
      }
    >
      <Input
        id="firstName"
        label="Ton prénom"
        required
        maxLength={60}
        autoComplete="given-name"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
      />
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
