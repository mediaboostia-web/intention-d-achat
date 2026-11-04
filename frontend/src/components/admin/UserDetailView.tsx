import Link from 'next/link';
import type { ReactNode } from 'react';
import { shopsHref } from '@/lib/tamani/admin-shops';
import {
  userRoleLabel,
  userStatusLabel,
  usersHref,
  type AdminUserRow,
} from '@/lib/tamani/admin-users';
import { dateLabel, planLabel } from '@/lib/tamani/admin-view';
import { UserActions } from './UserActions';

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className="font-bold break-words text-ink">{value}</dd>
    </div>
  );
}

export function UserDetailView({
  user,
  viewer,
}: {
  user: AdminUserRow;
  viewer: { id: string; role: string };
}) {
  return (
    <div className="space-y-6">
      <Link
        href={usersHref({})}
        className="inline-flex min-h-11 items-center font-bold text-primary underline"
      >
        ‹ Utilisateurs
      </Link>
      <h1 className="font-hand text-3xl font-bold break-words text-primary">{user.email}</h1>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Fact label="Nom" value={user.name ?? '—'} />
        <Fact label="Rôle" value={userRoleLabel(user.role)} />
        <Fact label="Statut" value={userStatusLabel(user.status)} />
        <Fact label="E-mail" value={user.verified ? 'Vérifié' : 'Non vérifié'} />
        <Fact label="Créé" value={dateLabel(user.createdAt)} />
        <Fact
          label="Boutique"
          value={
            user.shop ? (
              <Link href={`${shopsHref({})}/${user.shop.id}`} className="text-primary underline">
                {user.shop.name} · {planLabel(user.shop.plan)}
              </Link>
            ) : (
              'Aucune'
            )
          }
        />
      </dl>
      <section className="frame rounded-card bg-surface p-4">
        <h2 className="mb-3 font-hand text-2xl font-bold text-ink">Modifier</h2>
        <UserActions user={user} viewer={viewer} />
      </section>
    </div>
  );
}
