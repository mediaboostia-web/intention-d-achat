import Link from 'next/link';
import type { ReactNode } from 'react';
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
  dateLabel,
  monthLabel,
  planLabel,
  providerLabel,
  typeLabel,
  type BreakdownRow,
} from '@/lib/tamani/admin-view';
import { AdminTable } from './AdminTable';
import { MarketingSpendForm } from './MarketingSpendForm';

function Figure({
  label,
  value,
  calc,
  hero = false,
}: {
  label: string;
  value: ReactNode;
  calc: string;
  hero?: boolean;
}) {
  return (
    <div className="frame rounded-card bg-surface p-4">
      <p className="text-sm font-bold text-ink-soft">{label}</p>
      <p
        className={
          hero ? 'mt-1 font-sign text-3xl text-primary' : 'mt-1 text-2xl font-bold text-ink'
        }
      >
        {value}
      </p>
      <p className="mt-1 text-sm text-ink-soft">{calc}</p>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="font-hand text-2xl font-bold text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Counts with a bar to scale; the number is written, the bar only helps the eye. */
function Breakdown({ title, rows, empty }: { title: string; rows: BreakdownRow[]; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="frame rounded-card bg-surface p-4">
      <h3 className="font-bold text-ink">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-ink-soft">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {rows.map((r) => (
            <li key={r.key}>
              <div className="flex justify-between gap-3 text-sm">
                <span className="text-ink">{r.label}</span>
                <b className="text-ink tabular-nums">{r.count}</b>
              </div>
              <div className="mt-1 h-2 rounded-full bg-grid/60">
                <div
                  aria-hidden="true"
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${Math.round((r.count / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="frame rounded-card bg-surface p-3">
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="text-2xl font-bold text-ink tabular-nums">{value}</p>
    </div>
  );
}

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
  const monthLink = 'inline-flex min-h-11 items-center font-bold text-primary underline';
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-hand text-3xl font-bold text-primary">Tableau de bord</h1>
          <p className="text-ink-soft">Les chiffres de {month}.</p>
        </div>
        <nav aria-label="Mois" className="flex flex-wrap gap-x-4">
          <Link
            href={`${ADMIN_HOME}?mois=${prevMonth}`}
            className={monthLink}
            aria-label="Mois précédent"
          >
            ‹ {monthLabel(prevMonth)}
          </Link>
          {nextMonth && (
            <Link
              href={`${ADMIN_HOME}?mois=${nextMonth}`}
              className={monthLink}
              aria-label="Mois suivant"
            >
              {monthLabel(nextMonth)} ›
            </Link>
          )}
        </nav>
      </header>

      <section aria-label="Chiffres clés" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Figure
          hero
          label={`Encaissé en ${month}`}
          value={adminMoney(revenue.total)}
          calc={`${sales} paiement${sales > 1 ? 's' : ''} · 30 derniers jours : ${adminMoney(revenue.last30Days)}`}
        />
        <Figure
          label="MRR (aujourd'hui)"
          value={adminMoney(data.mrr)}
          calc="Pass payants en cours, chacun ramené à 30 jours"
        />
        <Figure label={`Churn de ${month}`} value={churn.value} calc={churn.calc} />
        <Figure label={`CAC de ${month}`} value={cac.value} calc={cac.calc} />
        <Figure
          label="Boutiques actives"
          value={`${shops.active} / ${shops.total}`}
          calc="Essai ou pass en cours, grâce comprise"
        />
      </section>

      <Section id="encaissements" title="Encaissements par pass">
        {revenue.byPass.length === 0 ? (
          <p className="text-ink-soft">Aucun encaissement ce mois-ci.</p>
        ) : (
          <AdminTable
            caption={`Encaissements de ${month} par pass`}
            columns={[
              { label: 'Pass' },
              { label: 'Ventes', numeric: true },
              { label: 'Montant', numeric: true },
            ]}
            rows={revenue.byPass.map((p) => [planLabel(p.offer), p.count, adminMoney(p.amount)])}
            footer={['Total', sales, adminMoney(revenue.total)]}
          />
        )}
        {revenue.payments.length > 0 && (
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
      </Section>

      <Section id="boutiques" title="Boutiques">
        <div className="grid gap-3 md:grid-cols-3">
          <Breakdown
            title="Par forfait (toutes)"
            rows={breakdown(shops.byPlan, PLAN_ORDER, planLabel)}
            empty="Aucune boutique."
          />
          <Breakdown
            title="Activité (actives)"
            rows={breakdown(shops.byType, TYPE_ORDER, typeLabel)}
            empty="Aucune boutique active."
          />
          <Breakdown
            title="Où elles vendent (actives)"
            rows={breakdown(shops.byChannel, CHANNEL_ORDER, channelLabel)}
            empty="Aucune boutique active."
          />
        </div>
      </Section>

      <Section id="campagnes" title="Campagnes et comptes">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          <Count label="En cours" value={campaigns.running} />
          <Count label="Brouillons" value={campaigns.drafts} />
          <Count label="Terminées" value={campaigns.finished} />
          <Count label="Archivées" value={campaigns.archived} />
          <Count label="Comptes" value={data.users.total} />
          <Count label="Suspendus" value={data.users.suspended} />
        </div>
      </Section>

      {canEdit && (
        <Section id="marketing" title="Dépense marketing">
          <MarketingSpendForm month={data.month} amount={data.cac.spend} />
        </Section>
      )}
    </div>
  );
}
