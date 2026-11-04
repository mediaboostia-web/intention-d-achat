import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from '@/components/ui';
import type { AdminDashboard } from '@/lib/tamani/admin-dashboard';
import { ADMIN_HOME } from '@/lib/tamani/admin-nav';
import {
  CHANNEL_ORDER,
  PLAN_ORDER,
  TYPE_ORDER,
  adminMoney,
  breakdown,
  cacText,
  channelLabel,
  churnText,
  countryLabel,
  dateLabel,
  growthText,
  monthLabel,
  planLabel,
  providerLabel,
  typeLabel,
  withShares,
  type ShareRow,
} from '@/lib/tamani/admin-view';
import { cn } from '@/lib/utils';
import { AdminTable } from './AdminTable';
import { MarketingSpendForm } from './MarketingSpendForm';
import { RevenueChart } from './RevenueChart';

/** One figure that matters, its calculation written under it (brand rule). */
function Figure({
  label,
  value,
  calc,
  hero = false,
  badge,
}: {
  label: string;
  value: ReactNode;
  calc: string;
  hero?: boolean;
  badge?: ReactNode;
}) {
  return (
    <div className="admin-card p-4">
      <p className="text-sm font-bold text-ink-soft">{label}</p>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className={cn('text-2xl font-bold tabular-nums', hero ? 'text-admin' : 'text-ink')}>
          {value}
        </span>
        {badge}
      </p>
      <p className="mt-1 text-sm text-ink-soft">{calc}</p>
    </div>
  );
}

function Panel({
  id,
  title,
  aside,
  children,
  className,
}: {
  id: string;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} className={cn('admin-card min-w-0 p-4 lg:p-5', className)}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={id} className="text-lg font-bold text-ink">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Rows with their number, their share, and a bar to scale on the largest. */
function ShareList({
  rows,
  empty,
  value = (r) => String(r.count),
}: {
  rows: ShareRow[];
  empty: string;
  value?: (r: ShareRow) => string;
}) {
  if (rows.length === 0) return <p className="text-sm text-ink-soft">{empty}</p>;
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-ink">
              <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-admin" />
              <span className="truncate">{r.label}</span>
            </span>
            <span className="flex shrink-0 gap-3 tabular-nums">
              <b className="text-ink">{value(r)}</b>
              <span className="w-14 text-right text-ink-soft">{r.share}</span>
            </span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-admin-soft">
            <div
              aria-hidden="true"
              className="h-2 rounded-full bg-admin"
              style={{ width: `${Math.round(r.ratio * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-control bg-admin-bg p-3">
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="text-xl font-bold text-ink tabular-nums">{value}</p>
    </div>
  );
}

const TONES = {
  up: { className: 'text-success', icon: 'arrow-up-right' },
  down: { className: 'text-danger', icon: 'arrow-down-left' },
  flat: { className: 'text-ink-soft', icon: null },
} as const;

export function DashboardView({
  data,
  prevMonth,
  nextMonth,
  canEdit,
}: {
  data: AdminDashboard;
  prevMonth: string;
  /** `null` on the current month: the future has no figures. */
  nextMonth: string | null;
  canEdit: boolean;
}) {
  const month = monthLabel(data.month);
  const { revenue, shops, campaigns } = data;
  const sales = revenue.byPass.reduce((n, p) => n + p.count, 0);
  const churn = churnText(data.churn, data.month);
  const cac = cacText(data.cac);
  const growth = growthText(revenue.series);
  const tone = growth ? TONES[growth.tone] : null;
  const sixMonths = revenue.series.reduce((n, m) => n + m.total, 0);

  // Passes ranked by the money they brought in this month.
  const passRows = withShares(
    [...revenue.byPass]
      .sort((a, b) => b.amount - a.amount)
      .map((p) => ({ key: p.offer, label: planLabel(p.offer), count: p.amount })),
  );
  const salesOf = new Map(revenue.byPass.map((p) => [p.offer, p.count]));
  const countries = withShares(
    breakdown(shops.byCountry, [], countryLabel).sort((a, b) => b.count - a.count),
  );
  const monthLink =
    'inline-flex min-h-11 items-center gap-1 rounded-control px-3 font-bold text-admin hover:bg-admin-soft';

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Tableau de bord</h1>
          <p className="text-ink-soft">Les chiffres de {month}.</p>
        </div>
        <nav aria-label="Mois" className="admin-card flex flex-wrap items-center p-1">
          <Link
            href={`${ADMIN_HOME}?mois=${prevMonth}`}
            className={monthLink}
            aria-label="Mois précédent"
          >
            <Icon name="chevron-left" className="size-4" />
            {monthLabel(prevMonth)}
          </Link>
          <span className="px-3 font-bold text-ink">{month}</span>
          {nextMonth && (
            <Link
              href={`${ADMIN_HOME}?mois=${nextMonth}`}
              className={monthLink}
              aria-label="Mois suivant"
            >
              {monthLabel(nextMonth)}
              <Icon name="chevron-right" className="size-4" />
            </Link>
          )}
        </nav>
      </header>

      <section aria-label="Chiffres clés" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Figure
          hero
          label={`Encaissé en ${month}`}
          value={adminMoney(revenue.total)}
          calc={`${sales} paiement${sales > 1 ? 's' : ''} · 30 derniers jours : ${adminMoney(revenue.last30Days)}`}
          badge={
            growth &&
            tone && (
              <span
                data-tone={growth.tone}
                className={cn('inline-flex items-center gap-1 text-sm font-bold', tone.className)}
              >
                {tone.icon && <Icon name={tone.icon} className="size-4" />}
                {growth.text}
              </span>
            )
          }
        />
        <Figure
          label="MRR (aujourd'hui)"
          value={adminMoney(data.mrr)}
          calc="Pass payants en cours, chacun ramené à 30 jours"
        />
        <Figure
          label="Boutiques actives"
          value={`${shops.active} / ${shops.total}`}
          calc="Essai ou pass en cours, grâce comprise"
        />
        <Figure label={`Churn de ${month}`} value={churn.value} calc={churn.calc} />
        <Figure label={`CAC de ${month}`} value={cac.value} calc={cac.calc} />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel
          id="encaissements"
          title="Encaissements"
          aside={
            <p className="text-sm text-ink-soft">
              {adminMoney(sixMonths)} sur {revenue.series.length} mois
            </p>
          }
        >
          <RevenueChart series={revenue.series} />
          <details className="mt-3">
            <summary className="inline-flex min-h-11 cursor-pointer items-center font-bold text-admin">
              Voir les montants
            </summary>
            <AdminTable
              caption={`Encaissements des ${revenue.series.length} derniers mois`}
              columns={[{ label: 'Mois' }, { label: 'Encaissé', numeric: true }]}
              rows={revenue.series.map((m) => [monthLabel(m.month), adminMoney(m.total)])}
            />
          </details>
        </Panel>
        <Panel
          id="pays"
          title="Boutiques par pays"
          aside={<p className="text-sm text-ink-soft">actives</p>}
        >
          <ShareList rows={countries} empty="Aucune boutique active." />
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel
          id="pass"
          title="Pass les plus vendus"
          aside={<p className="text-sm text-ink-soft">part de l&apos;encaissé de {month}</p>}
        >
          <ShareList
            rows={passRows}
            empty="Aucun encaissement ce mois-ci."
            value={(r) => {
              const n = salesOf.get(r.key) ?? 0;
              return `${n} vente${n > 1 ? 's' : ''} · ${adminMoney(r.count)}`;
            }}
          />
        </Panel>
        <Panel
          id="canaux"
          title="Où elles vendent"
          aside={<p className="text-sm text-ink-soft">actives</p>}
        >
          <ShareList
            rows={withShares(breakdown(shops.byChannel, CHANNEL_ORDER, channelLabel))}
            empty="Aucune boutique active."
          />
        </Panel>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Panel
          id="activite"
          title="Activité"
          aside={<p className="text-sm text-ink-soft">actives</p>}
        >
          <ShareList
            rows={withShares(breakdown(shops.byType, TYPE_ORDER, typeLabel))}
            empty="Aucune boutique active."
          />
        </Panel>
        <Panel
          id="forfaits"
          title="Forfaits"
          aside={<p className="text-sm text-ink-soft">toutes</p>}
        >
          <ShareList
            rows={withShares(breakdown(shops.byPlan, PLAN_ORDER, planLabel))}
            empty="Aucune boutique."
          />
        </Panel>
        <Panel id="campagnes" title="Campagnes et comptes" className="md:col-span-2 xl:col-span-1">
          <div className="grid grid-cols-2 gap-2">
            <Count label="En cours" value={campaigns.running} />
            <Count label="Brouillons" value={campaigns.drafts} />
            <Count label="Terminées" value={campaigns.finished} />
            <Count label="Archivées" value={campaigns.archived} />
            <Count label="Comptes" value={data.users.total} />
            <Count label="Suspendus" value={data.users.suspended} />
          </div>
        </Panel>
      </div>

      <Panel id="paiements" title={`Paiements de ${month}`}>
        {revenue.payments.length === 0 ? (
          <p className="text-sm text-ink-soft">Aucun encaissement ce mois-ci.</p>
        ) : (
          <AdminTable
            caption={`Paiements de ${month}`}
            columns={[
              { label: 'Date' },
              { label: 'Boutique' },
              { label: 'Pass' },
              { label: 'Montant', numeric: true },
              { label: 'Moyen' },
            ]}
            rows={revenue.payments.map((p) => [
              dateLabel(p.at),
              p.shopName,
              planLabel(p.offer),
              adminMoney(p.amount),
              providerLabel(p.provider),
            ])}
          />
        )}
      </Panel>

      {canEdit && (
        <Panel id="marketing" title="Dépense marketing">
          <MarketingSpendForm month={data.month} amount={data.cac.spend} />
        </Panel>
      )}
    </div>
  );
}
