import Link from 'next/link';
import {
  JOURNAL_SIZE_SHOWN,
  actionDetail,
  actionLabel,
  journalWhen,
  targetHref,
  type JournalEntry,
} from '@/lib/tamani/admin-journal';
import { AdminTable } from './AdminTable';

/** The newest back-office actions: who did what, to what, and when. */
export function JournalView({ entries }: { entries: readonly JournalEntry[] }) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink">Journal</h1>
        <p className="text-ink-soft">
          Les {JOURNAL_SIZE_SHOWN} dernières actions du support, heure de Cotonou.
        </p>
      </header>

      {entries.length === 0 ? (
        <p className="text-ink-soft">Aucune action pour l’instant.</p>
      ) : (
        <AdminTable
          caption="Actions du support"
          columns={[
            { label: 'Quand' },
            { label: 'Action' },
            { label: 'Détail' },
            { label: 'Cible' },
            { label: 'Par' },
          ]}
          rows={entries.map((e) => {
            const href = e.target ? targetHref(e.target.type, e.target.id) : null;
            const name = e.target ? (e.target.label ?? e.target.id) : '—';
            return [
              journalWhen(e.createdAt),
              actionLabel(e.action),
              actionDetail(e.action, e.metadata) ?? '—',
              href ? (
                <Link key="target" href={href} className="font-bold text-primary underline">
                  {name}
                </Link>
              ) : (
                name
              ),
              e.actorEmail,
            ];
          })}
        />
      )}
    </div>
  );
}
