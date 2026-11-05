import { adminRoleLabel } from '@/lib/tamani/admin-nav';
import type { AdminRow } from '@/lib/tamani/admin-team';
import { dateLabel } from '@/lib/tamani/admin-view';
import { AddAdminForm } from './AddAdminForm';
import { AdminRoleControl } from './AdminRoleControl';

/**
 * The team, under the platform's details (lot 13a, spec §5.2). A super-admin
 * adds admins, changes a role and removes one, except on their own line; an
 * admin reads the list.
 */
export function AdminsSection({
  admins,
  viewerId,
  canEdit,
}: {
  admins: AdminRow[];
  viewerId: string;
  canEdit: boolean;
}) {
  return (
    <section aria-labelledby="admins-title" className="space-y-4">
      <header>
        <h2 id="admins-title" className="text-xl font-bold text-ink">
          Admins
        </h2>
        <p className="text-ink-soft">
          {admins.length} admin{admins.length > 1 ? 's' : ''}. Admin : lecture seule. Super-admin :
          tout.
        </p>
      </header>

      {canEdit && <AddAdminForm />}

      <ul className="admin-card divide-y divide-grid">
        {admins.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-bold break-words text-ink">{a.email}</p>
              <p className="text-sm text-ink-soft">
                {a.name ? `${a.name} · ` : ''}
                {adminRoleLabel(a.role)} · compte ouvert le {dateLabel(a.createdAt)}
              </p>
            </div>
            {a.id === viewerId ? (
              <span className="text-sm font-bold text-ink-soft">C&apos;est toi</span>
            ) : (
              canEdit && <AdminRoleControl admin={a} />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
