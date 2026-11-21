'use client';

// /support-admin/blog/categories (lot 13d): create, rename, reorder, delete.
// A category that still holds articles cannot be deleted (the server refuses
// too, BLOG_CATEGORY_NOT_EMPTY).
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button, Input } from '@/components/ui';
import { api } from '@/lib/api';
import type { BlogCategoryRow } from '@/lib/server/tamani/blog';
import { errorMessage } from '@/lib/tamani/api-messages';
import { BlogAdminTabs } from './BlogAdminTabs';

function CategoryRow({ c, canEdit }: { c: BlogCategoryRow; canEdit: boolean }) {
  const router = useRouter();
  const [name, setName] = useState(c.name);
  const [description, setDescription] = useState(c.description ?? '');
  const [position, setPosition] = useState(String(c.position));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/blog/categories/${c.id}`, {
        method: 'PATCH',
        body: { name, slug: c.slug, description, position: Number(position) || 0 },
      });
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm) return setConfirm(true);
    setBusy(true);
    try {
      await api(`/api/admin/blog/categories/${c.id}`, { method: 'DELETE' });
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="admin-card p-4">
      <form onSubmit={save} className="grid gap-3 md:grid-cols-[1fr_2fr_90px_auto] md:items-end">
        <Input
          id={`cat-name-${c.id}`}
          label="Nom"
          value={name}
          disabled={!canEdit}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          id={`cat-desc-${c.id}`}
          label="Description (facultative)"
          value={description}
          disabled={!canEdit}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Input
          id={`cat-pos-${c.id}`}
          label="Ordre"
          inputMode="numeric"
          value={position}
          disabled={!canEdit}
          onChange={(e) => setPosition(e.target.value)}
        />
        {canEdit && (
          <div className="flex gap-2">
            <Button type="submit" variant="secondary" disabled={busy}>
              Enregistrer
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy || c.total > 0}
              onClick={() => void remove()}
            >
              {confirm ? 'Confirmer' : 'Supprimer'}
            </Button>
          </div>
        )}
      </form>
      <p className="mt-2 text-sm text-ink-soft">
        /blog/categorie/{c.slug} · {c.published} publié{c.published > 1 ? 's' : ''} sur {c.total}
        {c.total > 0 && canEdit ? ' · déplace ses articles pour pouvoir la supprimer' : ''}
      </p>
      {error && (
        <p role="alert" className="mt-2 text-sm font-bold text-danger">
          {error}
        </p>
      )}
    </li>
  );
}

function AddCategory() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError('Écris le nom de la catégorie.');
    setBusy(true);
    setError(null);
    try {
      await api('/api/admin/blog/categories', { method: 'POST', body: { name } });
      setName('');
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={add} className="admin-card flex flex-wrap items-end gap-3 p-4">
      <div className="min-w-[220px] flex-1">
        <Input
          id="cat-new"
          label="Ajouter une catégorie"
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          {...(error ? { error } : {})}
        />
      </div>
      <Button type="submit" disabled={busy}>
        Ajouter
      </Button>
    </form>
  );
}

export function CategoriesManager({
  categories,
  canEdit,
}: {
  categories: BlogCategoryRow[];
  canEdit: boolean;
}) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink">Catégories du blog</h1>
        <p className="text-ink-soft">Elles rangent les articles et ont chacune leur page.</p>
      </header>
      <BlogAdminTabs current="categories" />
      {canEdit && <AddCategory />}
      <ul className="space-y-3">
        {categories.map((c) => (
          <CategoryRow key={c.id} c={c} canEdit={canEdit} />
        ))}
      </ul>
    </div>
  );
}
