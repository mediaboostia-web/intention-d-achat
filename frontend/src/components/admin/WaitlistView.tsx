import { Button } from '@/components/ui';
import { dateLabel } from '@/lib/tamani/admin-view';
import { waitlistChannelsText, type WaitlistRow, type WaitlistStats } from '@/lib/tamani/waitlist';
import { AdminTable } from './AdminTable';

const NONE = '·';
const waLink = (written: string) => `https://wa.me/${written.replace(/\D/g, '')}`;

/** /support-admin/liste-attente (lot 14): who reserved a place, and from which video. */
export function WaitlistView({ rows, stats }: { rows: WaitlistRow[]; stats: WaitlistStats }) {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Liste d&apos;attente</h1>
          <p className="text-ink-soft">
            {stats.total} inscrit{stats.total > 1 ? 's' : ''} · {stats.thisWeek} cette semaine
          </p>
        </div>
        {stats.total > 0 && (
          <Button href="/api/admin/waitlist/export" variant="secondary">
            Télécharger pour Excel
          </Button>
        )}
      </header>

      {stats.bySource.length > 0 && (
        <section aria-labelledby="waitlist-sources" className="space-y-2">
          <h2 id="waitlist-sources" className="text-lg font-bold text-ink">
            D&apos;où ils viennent
          </h2>
          <ul className="flex flex-wrap gap-2">
            {stats.bySource.map((s) => (
              <li
                key={s.source ?? 'none'}
                className="frame rounded-control bg-surface px-3 py-2 text-sm"
              >
                <span className="font-bold">{s.source ?? 'Sans source'}</span> · {s.count}
              </li>
            ))}
          </ul>
        </section>
      )}

      {rows.length === 0 ? (
        <p className="text-ink-soft">Personne pour l’instant.</p>
      ) : (
        <AdminTable
          caption="Les vendeurs de la liste d'attente"
          columns={[
            { label: 'Rang', numeric: true },
            { label: 'Prénom' },
            { label: 'WhatsApp' },
            { label: 'E-mail' },
            { label: 'Où il vend' },
            { label: 'Source' },
            { label: 'Date' },
          ]}
          rows={rows.map((r) => [
            r.position,
            r.firstName,
            r.phone ? (
              <a
                href={waLink(r.phone)}
                target="_blank"
                rel="noopener"
                className="font-bold text-primary underline"
              >
                {r.phone}
              </a>
            ) : (
              NONE
            ),
            r.email ?? NONE,
            waitlistChannelsText(r.channels) || NONE,
            r.source ?? NONE,
            dateLabel(r.createdAt),
          ])}
        />
      )}
    </div>
  );
}
