'use client';

import { useState, type FormEvent } from 'react';
import { AuthForm, AuthLink, AuthTitle } from '@/components/app/AuthForm';
import { Button, Input, Notice } from '@/components/ui';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/tamani/api-messages';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api('/api/auth/forgot-password', { method: 'POST', body: { email } });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  // The server answers the same whether the account exists or not.
  if (sent) {
    return (
      <>
        <AuthTitle title="Regarde tes emails" />
        <Notice tone="info" className="mt-8">
          Si un compte existe pour <strong>{email}</strong>, tu reçois un code dans la minute.
        </Notice>
        <Button
          href={`/reset-password?email=${encodeURIComponent(email)}`}
          size="lg"
          className="mt-8 w-full shadow-press"
        >
          J&apos;ai mon code
        </Button>
      </>
    );
  }

  return (
    <AuthForm
      title="Mot de passe oublié ?"
      note="Écris ton email : on t'envoie un code pour en choisir un nouveau."
      error={error}
      submitLabel="Recevoir un code"
      submittingLabel="Envoi…"
      submitting={submitting}
      onSubmit={onSubmit}
      after={
        <AuthLink question="Tu t'en souviens ?" href="/login">
          Connecte-toi
        </AuthLink>
      }
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
    </AuthForm>
  );
}
