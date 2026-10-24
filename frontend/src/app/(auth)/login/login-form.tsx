'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthForm, AuthLink, GoogleButton } from '@/components/app/AuthForm';
import { Button, Input, Notice } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { errorMessage } from '@/lib/tamani/api-messages';
import { safeNextPath } from '@/lib/tamani/safe-next';

export function LoginForm({ google }: { google: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setUnverified(false);
    try {
      await api('/api/auth/login', { method: 'POST', body: { email, password } });
      router.replace(next);
    } catch (err) {
      setUnverified(err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED');
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  const verifyHref = `/verify-email?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`;

  return (
    <>
      {params.get('reset') === 'ok' && (
        <Notice tone="info" className="mb-8">
          Mot de passe changé. Connecte-toi.
        </Notice>
      )}
      <AuthForm
        title="Content de te revoir"
        note="Connecte-toi pour suivre tes campagnes."
        error={error}
        errorAction={
          unverified ? (
            <Button href={verifyHref} variant="secondary">
              Entrer mon code
            </Button>
          ) : undefined
        }
        submitLabel="Se connecter"
        submittingLabel="Connexion…"
        submitting={submitting}
        onSubmit={onSubmit}
        after={
          <>
            {google && <GoogleButton next={next} />}
            <AuthLink question="Pas encore de compte ?" href="/signup">
              Crée ton espace
            </AuthLink>
          </>
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
        <div className="flex flex-col gap-2">
          <Input
            id="password"
            label="Mot de passe"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Link
            href="/forgot-password"
            className="self-end text-sm font-bold text-primary underline decoration-2 underline-offset-4"
          >
            Mot de passe oublié ?
          </Link>
        </div>
      </AuthForm>
    </>
  );
}
