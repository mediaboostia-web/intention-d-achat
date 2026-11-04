import Link from 'next/link';
import { Button } from '@/components/ui';
import { shopsHref, type AdminShopList, type ShopQuery } from '@/lib/tamani/admin-shops';
import {
  PLAN_ORDER,
  channelLabel,
  countryLabel,
  dateLabel,
  passLine,
  planLabel,
  typeLabel,
} from '@/lib/tamani/admin-view';
import { AdminTable } from './AdminTable';

const field = 'frame min-h-12 rounded-control bg-surface px-4 text-base text-ink';

export function ShopsView({ list, query }: { list: AdminShopList; query: ShopQuery }) {
  const action = shopsHref({});
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-hand text-3xl font-bold text-primary">Boutiques</h1>
        <p className="text-ink-soft">
          {list.total} boutique{list.total > 1 ? 's' : ''}
        </p>
      </header>

      {/* A plain GET form: the search lives in the address, like every list. */}
      <form action={action} className="flex flex-wrap items-end gap-3" role="search">
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-sm font-bold">Nom ou e-mail du propriétaire</span>
          <input name="q" defaultValue={query.q} className={field} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-bold">Forfait en cours</span>
          <select name="forfait" defaultValue={query.plan ?? ''} className={field}>
            <option value="">Tous</option>
            {PLAN_ORDER.map((p) => (
              <option key={p} value={p}>
                {planLabel(p)}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="secondary">
          Filtrer
        </Button>
      </form>

      {list.items.length === 0 ? (
        <p className="text-ink-soft">Aucune boutique ne correspond.</p>
      ) : (
        <AdminTable
          caption="Boutiques"
          columns={[
            { label: 'Boutique' },
            { label: 'Propriétaire' },
            { label: 'Pays' },
            { label: 'Activité' },
            { label: 'Vente' },
            { label: 'Forfait' },
            { label: 'Fin' },
            { label: 'Créée' },
          ]}
          rows={list.items.map((s) => [
            <Link
              key="name"
              href={`${action}/${s.id}`}
              className="font-bold text-primary underline"
            >
              {s.name}
            </Link>,
            s.ownerEmail ?? '—',
            countryLabel(s.country),
            typeLabel(s.businessType ?? 'NONE'),
            channelLabel(s.salesChannel ?? 'NONE'),
            passLine(s.plan, s.inGrace),
            s.endsAt ? dateLabel(s.endsAt) : '—',
            dateLabel(s.createdAt),
          ])}
        />
      )}

      {list.pages > 1 && (
        <nav aria-label="Pages" className="flex flex-wrap items-center gap-4">
          {list.page > 1 && (
            <Link
              href={shopsHref({ ...query, page: list.page - 1 })}
              className="font-bold text-primary underline"
            >
              ‹ Précédente
            </Link>
          )}
          <span className="text-ink-soft">
            Page {list.page} sur {list.pages}
          </span>
          {list.page < list.pages && (
            <Link
              href={shopsHref({ ...query, page: list.page + 1 })}
              className="font-bold text-primary underline"
            >
              Suivante ›
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
