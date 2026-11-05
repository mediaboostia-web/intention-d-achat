'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { Button, Input, Notice, Select } from '@/components/ui';
import { ApiError, api } from '@/lib/api';
import type { AdminRole, AdminRow } from '@/lib/tamani/admin-team';
import { errorMessage } from '@/lib/tamani/api-messages';

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
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<Added | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setError(null);
    setAdded(null);
    try {
      const body = { email, role, ...(name.trim() ? { name } : {}) };
      const r = await api<Added>('/api/admin/admins', { method: 'POST', body });
      setAdded(r);
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
    <form id="add-admin" onSubmit={submit} className="admin-card space-y-3 p-4">
      <h3 className="text-lg font-bold text-ink">Ajouter un admin</h3>
      <div className="grid gap-3 md:grid-cols-3">
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
        Si le compte existe, il devient admin. Sinon, il est créé vérifié, avec un mot de passe
        temporaire.
      </p>
      <Button type="submit">Ajouter</Button>
      <div role="status">
        {error && <p className="font-bold text-danger">{error}</p>}
        {added && !added.temporaryPassword && (
          <Notice tone="info" title={`${added.admin.email} est maintenant admin.`}>
            <p>Son mot de passe ne change pas.</p>
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
