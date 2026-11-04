import Link from 'next/link';
import { Button } from '@/components/ui';
import {
  userRoleLabel,
  userStatusLabel,
  usersHref,
  type AdminUserList,
  type UserQuery,
} from '@/lib/tamani/admin-users';
import { shopsHref } from '@/lib/tamani/admin-shops';
import { dateLabel, planLabel } from '@/lib/tamani/admin-view';
import { AdminTable } from './AdminTable';
import { CreateUserForm } from './CreateUserForm';

const link = 'font-bold text-primary underline';

export function UsersView({
  list,
  query,
  canCreate,
}: {
  list: AdminUserList;
  query: UserQuery;
  canCreate: boolean;
}) {
  const action = usersHref({});
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-hand text-3xl font-bold text-primary">Utilisateurs</h1>
        <p className="text-ink-soft">
          {list.total} compte{list.total > 1 ? 's' : ''}
        </p>
      </header>

      {canCreate && <CreateUserForm />}

      <form action={action} role="search" className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-sm font-bold">E-mail ou nom</span>
          <input
            name="q"
            defaultValue={query.q}
            className="frame min-h-12 rounded-control bg-surface px-4 text-base text-ink"
          />
        </label>
        <Button type="submit" variant="secondary">
          Chercher
        </Button>
      </form>

      {list.items.length === 0 ? (
        <p className="text-ink-soft">Aucun compte ne correspond.</p>
      ) : (
        <AdminTable
          caption="Comptes"
          columns={[
            { label: 'E-mail' },
            { label: 'Nom' },
            { label: 'Rôle' },
            { label: 'Statut' },
            { label: 'E-mail vérifié' },
            { label: 'Boutique' },
            { label: 'Forfait' },
            { label: 'Créé' },
          ]}
          rows={list.items.map((u) => [
            <Link key="email" href={`${action}/${u.id}`} className={link}>
              {u.email}
            </Link>,
            u.name ?? '—',
            userRoleLabel(u.role),
            userStatusLabel(u.status),
            u.verified ? 'Vérifié' : 'Non vérifié',
            u.shop ? (
              <Link key="shop" href={`${shopsHref({})}/${u.shop.id}`} className={link}>
                {u.shop.name}
              </Link>
            ) : (
              '—'
            ),
            u.shop ? planLabel(u.shop.plan) : '—',
            dateLabel(u.createdAt),
          ])}
        />
      )}

      {list.pages > 1 && (
        <nav aria-label="Pages" className="flex flex-wrap items-center gap-4">
          {list.page > 1 && (
            <Link href={usersHref({ ...query, page: list.page - 1 })} className={link}>
              ‹ Précédente
            </Link>
          )}
          <span className="text-ink-soft">
            Page {list.page} sur {list.pages}
          </span>
          {list.page < list.pages && (
            <Link href={usersHref({ ...query, page: list.page + 1 })} className={link}>
              Suivante ›
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
