import Link from 'next/link';
import { Button } from '@/components/ui';
import type { AdminPostRow, BlogCategoryRow } from '@/lib/server/tamani/blog';
import { dateLabel } from '@/lib/tamani/admin-view';
import { blogPostPath } from '@/lib/tamani/blog';
import { AdminTable } from '../AdminTable';
import { BLOG_ADMIN, BlogAdminTabs } from './BlogAdminTabs';

export interface BlogStatsView {
  published: number;
  drafts: number;
  leads: number;
  leads30: number;
  topPost: { title: string; leads: number } | null;
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="admin-card p-4">
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}

/** /support-admin/blog (lot 13d): the figures, a search, and every article. */
export function PostsView({
  rows,
  stats,
  categories,
  filter,
  canEdit,
}: {
  rows: AdminPostRow[];
  stats: BlogStatsView;
  categories: BlogCategoryRow[];
  filter: { q?: string | undefined; status?: string | undefined; categorie?: string | undefined };
  canEdit: boolean;
}) {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Blog</h1>
          <p className="text-ink-soft">
            {plural(stats.published, 'publié', 'publiés')} ·{' '}
            {plural(stats.drafts, 'brouillon', 'brouillons')}
          </p>
        </div>
        {canEdit && <Button href={`${BLOG_ADMIN}/nouveau`}>Nouvel article</Button>}
      </header>
      <BlogAdminTabs current="articles" />

      <div className="grid gap-3 sm:grid-cols-3">
        <Figure label="Articles en ligne" value={plural(stats.published, 'publié', 'publiés')} />
        <Figure
          label="Guides demandés"
          value={`${plural(stats.leads30, 'contact', 'contacts')} sur 30 jours`}
        />
        <Figure
          label="L'article qui rapporte le plus"
          value={stats.topPost ? `${stats.topPost.title} (${stats.topPost.leads})` : '·'}
        />
      </div>

      <form method="get" className="admin-card flex flex-wrap items-end gap-3 p-4">
        <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-sm font-bold text-ink">
          Chercher un titre
          <input name="q" defaultValue={filter.q ?? ''} className="admin-field font-normal" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-bold text-ink">
          État
          <select
            name="status"
            defaultValue={filter.status ?? ''}
            className="admin-field font-normal"
          >
            <option value="">Tous</option>
            <option value="PUBLISHED">Publiés</option>
            <option value="DRAFT">Brouillons</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-bold text-ink">
          Catégorie
          <select
            name="categorie"
            defaultValue={filter.categorie ?? ''}
            className="admin-field font-normal"
          >
            <option value="">Toutes</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="secondary">
          Filtrer
        </Button>
      </form>

      {rows.length === 0 ? (
        <p className="text-ink-soft">Aucun article pour l&apos;instant.</p>
      ) : (
        <AdminTable
          caption="Les articles du blog"
          columns={[
            { label: 'Titre' },
            { label: 'État' },
            { label: 'Catégorie' },
            { label: 'Contacts', numeric: true },
            { label: 'Modifié' },
            { label: 'En ligne' },
          ]}
          rows={rows.map((r) => [
            <Link
              key="t"
              href={`${BLOG_ADMIN}/${r.id}`}
              className="font-bold text-primary underline"
            >
              {r.title}
            </Link>,
            r.status === 'PUBLISHED' ? 'Publié' : 'Brouillon',
            r.category ?? '·',
            r.leads,
            dateLabel(r.updatedAt),
            r.status === 'PUBLISHED' ? (
              <a
                key="v"
                href={blogPostPath(r.slug)}
                target="_blank"
                rel="noopener"
                className="text-primary underline"
              >
                Voir
              </a>
            ) : (
              '·'
            ),
          ])}
        />
      )}
    </div>
  );
}
