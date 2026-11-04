'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { Button, Input, Notice } from '@/components/ui';
import { ApiError, api } from '@/lib/api';

type Created = { user: { email: string }; temporaryPassword: string };

function failure(err: unknown): string {
  if (err instanceof ApiError && err.code === 'EMAIL_TAKEN')
    return 'Un compte utilise déjà cet e-mail.';
  if (err instanceof ApiError && err.status === 403) return 'Réservé au super-admin.';
  if (err instanceof ApiError && err.code === 'VALIDATION_FAILED') {
    return "Vérifier l'e-mail et le nom (80 caractères au plus).";
  }
  return "Le compte n'a pas été créé. Réessayer.";
}

/** A super-admin opens an account; its temporary password shows here once. */
export function CreateUserForm() {
  const router = useRouter();
  const busy = useRef(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setError(null);
    try {
      const r = await api<Created>('/api/admin/users', { method: 'POST', body: { email, name } });
      setCreated(r);
      setEmail('');
      setName('');
      router.refresh();
    } catch (err) {
      setError(failure(err));
    } finally {
      busy.current = false;
    }
  }

  return (
    <form
      id="create-user"
      onSubmit={submit}
      className="frame space-y-3 rounded-card bg-surface p-4"
    >
      <h2 className="font-hand text-2xl font-bold text-ink">Ajouter un utilisateur</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          id="create-user-email"
          label="E-mail"
          type="email"
          autoComplete="off"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          id="create-user-name"
          label="Prénom ou nom"
          required
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <p className="text-sm text-ink-soft">
        Le compte est créé vérifié, avec un mot de passe temporaire. À sa première connexion, la
        personne crée sa boutique, puis change son mot de passe dans Profil.
      </p>
      <Button type="submit">Créer le compte</Button>
      <div role="status">
        {error && <p className="font-bold text-danger">{error}</p>}
        {created && (
          <Notice tone="info" title={`Compte créé : ${created.user.email}`}>
            <p>
              Mot de passe temporaire :{' '}
              <code className="rounded-control bg-grid/60 px-2 py-1 font-bold select-all">
                {created.temporaryPassword}
              </code>
            </p>
            <p className="mt-1 text-sm">
              À transmettre maintenant : il ne sera plus jamais affiché.
            </p>
          </Notice>
        )}
      </div>
    </form>
  );
}
