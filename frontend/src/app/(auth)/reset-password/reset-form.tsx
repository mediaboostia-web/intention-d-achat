'use client';

// The link in the reset email carries ?email= and ?code=. A new password
// signs every device out (tokenVersion bump), so there is no auto sign-in:
// the wholesaler signs in again with it.
import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthForm, AuthLink } from '@/components/app/AuthForm';
import { Input } from '@/components/ui';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/tamani/api-messages';
import { normalizeCode } from '@/lib/tamani/auth-code';

const PASSWORD_MIN = 10;

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [code, setCode] = useState(normalizeCode(params.get('code') ?? ''));
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api('/api/auth/reset-password', {
        method: 'POST',
        body: { email, code, newPassword },
      });
      router.push('/login?reset=ok');
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <AuthForm
      title="Choisis un nouveau mot de passe"
      error={error}
      submitLabel="Changer mon mot de passe"
      submittingLabel="Changement…"
      submitting={submitting}
      onSubmit={onSubmit}
      after={<AuthLink href="/login">Retour à la connexion</AuthLink>}
    >
      <Input
        id="email"
        label="Ton email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        id="code"
        label="Code reçu par email"
        type="text"
        required
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="one-time-code"
        spellCheck={false}
        minLength={8}
        maxLength={8}
        value={code}
        onChange={(e) => setCode(normalizeCode(e.target.value))}
      />
      <Input
        id="password"
        label="Nouveau mot de passe"
        hint={`${PASSWORD_MIN} caractères au moins.`}
        type="password"
        required
        minLength={PASSWORD_MIN}
        autoComplete="new-password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />
    </AuthForm>
  );
}
