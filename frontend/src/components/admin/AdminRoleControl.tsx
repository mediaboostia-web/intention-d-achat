'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';
import type { AdminRow } from '@/lib/tamani/admin-team';
import { errorMessage } from '@/lib/tamani/api-messages';

/** One admin's line: switch the role, or remove them after a confirmation in the page. */
export function AdminRoleControl({ admin }: { admin: AdminRow }) {
  const router = useRouter();
  const busy = useRef(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setRole(role: 'USER' | 'ADMIN' | 'SUPERADMIN') {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    try {
      await api(`/api/admin/admins/${admin.id}`, { method: 'PATCH', body: { role } });
      setAsking(false);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      busy.current = false;
    }
  }

  const other = admin.role === 'SUPERADMIN' ? 'ADMIN' : 'SUPERADMIN';
  return (
    <div className="flex flex-col items-end gap-2">
      {asking ? (
        <div role="group" aria-label={`Retirer ${admin.email}`} className="space-y-2 text-right">
          <p className="text-sm text-ink">
            Retirer {admin.email} des admins ? Le compte reste, sans accès au support-admin.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => setAsking(false)}>
              Annuler
            </Button>
            <Button onClick={() => void setRole('USER')}>Oui, retirer</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => void setRole(other)}>
            {other === 'SUPERADMIN' ? 'Passer super-admin' : 'Passer admin'}
          </Button>
          <Button variant="secondary" onClick={() => setAsking(true)}>
            Retirer
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm font-bold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
