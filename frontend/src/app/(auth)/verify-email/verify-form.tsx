'use client';

// The link in the email carries ?email= and ?code=: the code is then sent
// at once, and the form is only the fallback for typing it by hand. A
// success sets the session cookies and opens the shop space.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthForm, AuthLink } from '@/components/app/AuthForm';
import { Input } from '@/components/ui';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/tamani/api-messages';
import { normalizeCode } from '@/lib/tamani/auth-code';
import { safeNextPath } from '@/lib/tamani/safe-next';

export function VerifyEmailForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get('next'));
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [code, setCode] = useState(normalizeCode(params.get('code') ?? ''));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Effects run twice in development: send the emailed code only once.
  const autoSent = useRef(false);

  async function verify(emailValue: string, codeValue: string) {
    setSubmitting(true);
    setError(null);
    try {
      await api('/api/auth/verify-email', {
        method: 'POST',
        body: { email: emailValue, code: codeValue },
      });
      router.replace(next);
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (autoSent.current || !email || code.length !== 8) return;
    autoSent.current = true;
    void verify(email, code);
    // Only the values that came with the link, once, on arrival.
  }, []);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void verify(email, code);
  }

  return (
    <AuthForm
      title="Vérifie ton email"
      note="On t'a envoyé un code de 8 caractères. Il reste valable 15 minutes."
      error={error}
      submitLabel="Valider mon email"
      submittingLabel="Vérification…"
      submitting={submitting}
      onSubmit={onSubmit}
      after={
        <AuthLink question="Pas reçu de code ? Regarde dans les spams, ou" href="/signup">
          recommence l&apos;inscription
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
    </AuthForm>
  );
}
