import Link from 'next/link';
import type { ReactNode } from 'react';
import { shopsHref, type AdminShop } from '@/lib/tamani/admin-shops';
import {
  channelLabel,
  countryLabel,
  dateLabel,
  memberRoleLabel,
  orderStatusLabel,
  passLine,
  planLabel,
  providerLabel,
  typeLabel,
} from '@/lib/tamani/admin-view';
import { formatMoney } from '@/lib/tamani/currency';
import { AdminTable } from './AdminTable';
import { EndPassButton } from './EndPassButton';
import { GrantPassForm } from './GrantPassForm';

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="frame space-y-3 rounded-card bg-surface p-4">
      <h2 className="font-hand text-2xl font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className="font-bold text-ink">{value}</dd>
    </div>
  );
}

export function ShopDetailView({ shop, canEdit }: { shop: AdminShop; canEdit: boolean }) {
  const { pass, campaigns } = shop;
  return (
    <div className="space-y-6">
      <Link
        href={shopsHref({})}
        className="inline-flex min-h-11 items-center font-bold text-primary underline"
      >
        ‹ Boutiques
      </Link>
      <header>
        <h1 className="font-hand text-3xl font-bold break-words text-primary">{shop.name}</h1>
        <p className="text-ink-soft">
          {countryLabel(shop.country)} · créée le {dateLabel(shop.createdAt)} · /{shop.slug}
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Fact label="Activité" value={typeLabel(shop.businessType ?? 'NONE')} />
        <Fact label="Vente" value={channelLabel(shop.salesChannel ?? 'NONE')} />
        <Fact label="Campagnes en cours" value={campaigns.running} />
        <Fact label="Membres" value={shop.members.length} />
      </dl>

      <div className="grid gap-6 lg:grid-cols-2">
        <Block title="Pass">
          <p className="text-xl font-bold text-ink">{passLine(pass.plan, pass.inGrace)}</p>
          <dl className="grid grid-cols-2 gap-3">
            <Fact label="Fin" value={pass.endsAt ? dateLabel(pass.endsAt) : '—'} />
            <Fact label="Réponses" value={`${pass.used} / ${pass.included} réponses`} />
          </dl>
          {pass.pending > 0 && (
            <p className="text-ink">{pass.pending} en attente d&apos;un pass.</p>
          )}
          {canEdit && pass.plan !== 'FREE' && <EndPassButton shopId={shop.id} />}
        </Block>
        {canEdit && (
          <Block title="Attribuer un pass">
            <GrantPassForm shopId={shop.id} />
          </Block>
        )}
      </div>

      <Block title="Campagnes">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Fact label="En cours" value={campaigns.running} />
          <Fact label="Brouillons" value={campaigns.drafts} />
          <Fact label="Terminées" value={campaigns.finished} />
          <Fact label="Archivées" value={campaigns.archived} />
        </dl>
      </Block>

      <Block title="Membres">
        <ul className="space-y-1">
          {shop.members.map((m) => (
            <li key={m.email} className="break-words text-ink">
              <b>{m.email}</b>
              {m.name ? ` · ${m.name}` : ''} · {memberRoleLabel(m.role)}
            </li>
          ))}
        </ul>
      </Block>

      <section className="space-y-3">
        <h2 className="font-hand text-2xl font-bold text-ink">Achats</h2>
        {shop.purchases.length === 0 ? (
          <p className="text-ink-soft">Aucun achat.</p>
        ) : (
          <AdminTable
            caption={`Achats de ${shop.name}`}
            columns={[
              { label: 'Date' },
              { label: 'Pass' },
              { label: 'Montant', numeric: true },
              { label: 'Statut' },
              { label: 'Moyen' },
            ]}
            rows={shop.purchases.map((p) => [
              dateLabel(p.at),
              planLabel(p.offer),
              formatMoney(p.amount, p.currency),
              orderStatusLabel(p.status),
              providerLabel(p.provider),
            ])}
          />
        )}
      </section>
    </div>
  );
}
