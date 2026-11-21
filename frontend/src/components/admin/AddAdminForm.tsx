'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { PasswordInput } from '@/components/app/PasswordInput';
import { Button, Input, Notice, Select } from '@/components/ui';
import { ApiError, api } from '@/lib/api';
import type { AdminRole, AdminRow } from '@/lib/tamani/admin-team';
import { errorMessage } from '@/lib/tamani/api-messages';

// Mirrors AUTH_PASSWORD_MIN_LENGTH's default; the server has the last word.
const PASSWORD_MIN = 10;

type Added = { admin: AdminRow; temporaryPassword?: string };

function failure(err: unknown): string {
  if (err instanceof ApiError && err.code === 'VALIDATION_FAILED') {
    return "Vérifier l'e-mail et le nom (80 caractères au plus).";
  }
  return errorMessage(err);
}

/**
 * A super-admin adds an admin by e-mail. An existing account is promoted; a
 * new one is opened verified, and its temporary password shows here once.
 */
export function AddAdminForm() {
  const router = useRouter();
  const busy = useRef(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<AdminRole>('ADMIN');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<Added | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy.current) return;
    if (password && password.length < PASSWORD_MIN) {
      setError(`Le mot de passe fait ${PASSWORD_MIN} caractères au moins.`);
      return;
    }
    busy.current = true;
    setError(null);
    setAdded(null);
    try {
      const body = {
        email,
        role,
        ...(name.trim() ? { name } : {}),
        ...(password ? { password } : {}),
      };
      const r = await api<Added>('/api/admin/admins', { method: 'POST', body });
      setAdded(r);
      setEmail('');
      setName('');
      setPassword('');
      router.refresh();
    } catch (err) {
      setError(failure(err));
    } finally {
      busy.current = false;
    }
  }

  return (
    <form id="add-admin" onSubmit={submit} className="admin-card space-y-3 p-4">
      <h3 className="text-lg font-bold text-ink">Ajouter un admin</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <Input
          id="add-admin-email"
          label="E-mail"
          type="email"
          autoComplete="off"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          id="add-admin-name"
          label="Nom (si le compte n'existe pas)"
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <PasswordInput
          id="add-admin-password"
          label="Mot de passe (facultatif)"
          hint={`${PASSWORD_MIN} caractères au moins. Vide : un mot de passe temporaire est créé.`}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Select
          id="add-admin-role"
          label="Rôle"
          value={role}
          onChange={(e) => setRole(e.target.value === 'SUPERADMIN' ? 'SUPERADMIN' : 'ADMIN')}
          options={[
            { value: 'ADMIN', label: 'Admin (lecture seule)' },
            { value: 'SUPERADMIN', label: 'Super-admin (tout)' },
          ]}
        />
      </div>
      <p className="text-sm text-ink-soft">
        Si le compte existe, il devient admin et son mot de passe ne change pas. Sinon, il est créé
        vérifié, avec le mot de passe que tu as choisi ou un mot de passe temporaire.
      </p>
      <Button type="submit">Ajouter</Button>
      <div role="status">
        {error && <p className="font-bold text-danger">{error}</p>}
        {added && !added.temporaryPassword && (
          <Notice tone="info" title={`${added.admin.email} est maintenant admin.`}>
            <p>Il se connecte avec son mot de passe, puis le code reçu par e-mail.</p>
          </Notice>
        )}
        {added?.temporaryPassword && (
          <Notice tone="info" title={`Compte créé : ${added.admin.email}`}>
            <p>
              Mot de passe temporaire :{' '}
              <code className="rounded-control bg-admin-soft px-2 py-1 font-bold select-all">
                {added.temporaryPassword}
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
