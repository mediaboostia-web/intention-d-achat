'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { Button, Input, Select } from '@/components/ui';
import { ApiError, api } from '@/lib/api';
import { userRoleLabel, type AdminUserRow } from '@/lib/tamani/admin-users';

const ROLES = ['USER', 'ADMIN', 'SUPERADMIN'] as const;

function failure(err: unknown): string {
  if (err instanceof ApiError && err.code === 'LAST_SUPERADMIN') {
    return "Impossible : c'est le dernier super-admin.";
  }
  if (err instanceof ApiError && err.status === 403) return 'Réservé au super-admin.';
  if (err instanceof ApiError && err.code === 'VALIDATION_FAILED') return 'Vérifier le champ.';
  return "La modification n'a pas été enregistrée. Réessayer.";
}

/**
 * Rename (any admin), change the role (super-admin, through the kit's route)
 * and suspend or restore (the kit's route: restoring is a super-admin's call).
 */
export function UserActions({
  user,
  viewer,
}: {
  user: AdminUserRow;
  viewer: { id: string; role: string };
}) {
  const router = useRouter();
  const busy = useRef(false);
  const [name, setName] = useState(user.name ?? '');
  const [role, setRole] = useState(user.role);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const superadmin = viewer.role === 'SUPERADMIN';
  const self = viewer.id === user.id;
  const suspended = user.status === 'SUSPENDED';

  async function run(path: string, body: unknown, done: string) {
    if (busy.current) return;
    busy.current = true;
    setMessage(null);
    try {
      await api(path, { method: 'PATCH', body });
      setMessage({ ok: true, text: done });
      router.refresh();
    } catch (err) {
      setMessage({ ok: false, text: failure(err) });
    } finally {
      busy.current = false;
    }
  }

  const base = `/api/admin/users/${user.id}`;
  const rename = (e: FormEvent) => {
    e.preventDefault();
    void run(base, { name }, 'Nom enregistré.');
  };
  const changeRole = (e: FormEvent) => {
    e.preventDefault();
    void run(`${base}/role`, { role }, `Rôle : ${userRoleLabel(role)}.`);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={rename} className="flex flex-wrap items-end gap-3">
        <Input
          id="user-name"
          label="Nom"
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="min-w-0 flex-1"
        />
        <Button type="submit" variant="secondary">
          Renommer
        </Button>
      </form>

      {superadmin && (
        <form onSubmit={changeRole} className="flex flex-wrap items-end gap-3">
          <Select
            id="user-role"
            label="Rôle"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            options={ROLES.map((r) => ({ value: r, label: userRoleLabel(r) }))}
            className="min-w-0 flex-1"
          />
          <Button type="submit" variant="secondary">
            Changer le rôle
          </Button>
        </form>
      )}

      {!self && !suspended && (
        <Button
          variant="secondary"
          onClick={() => void run(`${base}/status`, { status: 'SUSPENDED' }, 'Compte suspendu.')}
        >
          Suspendre le compte
        </Button>
      )}
      {suspended && superadmin && (
        <Button onClick={() => void run(`${base}/status`, { status: 'ACTIVE' }, 'Compte rétabli.')}>
          Rétablir le compte
        </Button>
      )}

      <p role="status" className={message?.ok === false ? 'font-bold text-danger' : 'text-ink'}>
        {message?.text ?? ''}
      </p>
    </div>
  );
}
