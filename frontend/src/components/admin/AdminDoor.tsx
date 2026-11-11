'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AuthForm } from '@/components/app/AuthForm';
import { PasswordInput } from '@/components/app/PasswordInput';
import { Button, Input, Notice } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { ADMIN_HOME } from '@/lib/tamani/admin-nav';
import { errorMessage } from '@/lib/tamani/api-messages';

const NO_ACCESS = "Ce compte n'a pas accès au Support-admin.";

/** A signed-in account that is not an admin is told so. */
function doorMessage(err: unknown): string {
  if (err instanceof ApiError && err.status === 403) return NO_ACCESS;
  return errorMessage(err);
}

/**
 * The two steps of the support-admin door: the password (skipped when a
 * session is already open), then the code received by e-mail.
 */
export function AdminDoor({ signedInAs }: { signedInAs?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<'password' | 'code'>(signedInAs ? 'code' : 'password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode() {
    await api('/api/admin-gate/code', { method: 'POST' });
    setSent(true);
  }

  async function onPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/api/auth/login', { method: 'POST', body: { email, password } });
      await sendCode();
      setPassword('');
      setStep('code');
    } catch (err) {
      setError(doorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onResend() {
    setBusy(true);
    setError(null);
    try {
      await sendCode();
    } catch (err) {
      setError(doorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/api/admin-gate/verify', { method: 'POST', body: { code } });
      router.replace(ADMIN_HOME);
    } catch (err) {
      setError(doorMessage(err));
      setBusy(false);
    }
  }

  if (step === 'password') {
    return (
      <AuthForm
        title="Connexion admin"
        note="Ton mot de passe, puis un code envoyé sur ton e-mail."
        error={error}
        submitLabel="Continuer"
        submittingLabel="Vérification…"
        submitting={busy}
        onSubmit={onPassword}
      >
        <Input
          id="admin-email"
          label="Ton e-mail"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <PasswordInput
          id="admin-password"
          label="Mot de passe"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </AuthForm>
    );
  }

  return (
    <AuthForm
      title="Ton code"
      note={
        sent
          ? 'Le code vient de partir sur ton e-mail. Il est valable 10 minutes.'
          : `Tu es connecté${signedInAs ? ` (${signedInAs})` : ''}. Demande ton code pour ouvrir le Support-admin.`
      }
      error={error}
      submitLabel="Ouvrir le Support-admin"
      submittingLabel="Vérification…"
      submitting={busy}
      onSubmit={onCode}
      after={
        <Button type="button" variant="secondary" disabled={busy} onClick={() => void onResend()}>
          {sent ? 'Renvoyer un code' : 'Recevoir mon code par e-mail'}
        </Button>
      }
    >
      {sent && (
        <Notice tone="info">
          Pas reçu après 2 minutes ? Regarde dans les courriers indésirables.
        </Notice>
      )}
      <Input
        id="admin-code"
        label="Code reçu par e-mail"
        required
        inputMode="text"
        autoComplete="one-time-code"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={9}
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
      />
    </AuthForm>
  );
}
