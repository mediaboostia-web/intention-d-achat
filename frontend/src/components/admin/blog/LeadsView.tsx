import { Button } from '@/components/ui';
import type { BlogLeadRow } from '@/lib/server/tamani/blog';
import { dateLabel } from '@/lib/tamani/admin-view';
import { AdminTable } from '../AdminTable';
import { BlogAdminTabs } from './BlogAdminTabs';

const waLink = (written: string) => `https://wa.me/${written.replace(/\D/g, '')}`;

/** /support-admin/blog/contacts (lot 13d): who asked for a guide, from which article. */
export function LeadsView({ rows }: { rows: BlogLeadRow[] }) {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Contacts du blog</h1>
          <p className="text-ink-soft">
            {rows.length} contact{rows.length > 1 ? 's' : ''} venus des guides
          </p>
        </div>
        {rows.length > 0 && (
          <Button href="/api/admin/blog/leads/export" variant="secondary">
            Télécharger pour Excel
          </Button>
        )}
      </header>
      <BlogAdminTabs current="contacts" />
      {rows.length === 0 ? (
        <p className="text-ink-soft">Personne n&apos;a encore demandé de guide.</p>
      ) : (
        <AdminTable
          caption="Les lecteurs qui ont demandé un guide"
          columns={[
            { label: 'Prénom' },
            { label: 'WhatsApp' },
            { label: 'Pays' },
            { label: 'Article' },
            { label: 'Guide' },
            { label: 'Date' },
          ]}
          rows={rows.map((r) => [
            r.firstName,
            <a
              key="wa"
              href={waLink(r.phone)}
              target="_blank"
              rel="noopener"
              className="font-bold text-primary underline"
            >
              {r.phone}
            </a>,
            r.country,
            r.post ?? '·',
            r.guide ?? '·',
            dateLabel(r.createdAt),
          ])}
        />
      )}
    </div>
  );
}
