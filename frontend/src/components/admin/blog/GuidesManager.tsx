'use client';

// /support-admin/blog/guides (lot 13d): the guides offered for a contact.
// Each is an external link (a shop page, a PDF online…); one is the default,
// offered by every article that does not pick its own.
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button, Input, Textarea } from '@/components/ui';
import { api } from '@/lib/api';
import type { BlogGuideRow } from '@/lib/server/tamani/blog';
import { errorMessage } from '@/lib/tamani/api-messages';
import { BlogGuideInput } from '@/lib/tamani/blog';
import { BlogAdminTabs } from './BlogAdminTabs';

interface Values {
  title: string;
  description: string;
  url: string;
  isDefault: boolean;
}

function GuideForm({
  id,
  initial,
  submitLabel,
  onDone,
}: {
  id?: string;
  initial: Values;
  submitLabel: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const key = id ?? 'new';

  async function submit(e: FormEvent) {
    e.preventDefault();
    const check = BlogGuideInput.safeParse(v);
    if (!check.success) {
      setError(
        check.error.issues.some((i) => i.path[0] === 'url')
          ? 'Le lien doit commencer par https://'
          : 'Écris le titre du guide.',
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api(id ? `/api/admin/blog/guides/${id}` : '/api/admin/blog/guides', {
        method: id ? 'PATCH' : 'POST',
        body: check.data,
      });
      if (!id) setV({ title: '', description: '', url: '', isDefault: false });
      onDone?.();
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-3 md:grid-cols-2">
      <Input
        id={`guide-title-${key}`}
        label="Titre du guide"
        value={v.title}
        maxLength={80}
        onChange={(e) => setV({ ...v, title: e.target.value })}
      />
      <Input
        id={`guide-url-${key}`}
        label="Lien du guide"
        hint="Une page de ta boutique, un PDF en ligne…"
        type="url"
        inputMode="url"
        placeholder="https://"
        value={v.url}
        onChange={(e) => setV({ ...v, url: e.target.value })}
      />
      <div className="md:col-span-2">
        <Textarea
          id={`guide-desc-${key}`}
          label="Une phrase pour donner envie (facultative)"
          rows={2}
          maxLength={200}
          value={v.description}
          onChange={(e) => setV({ ...v, description: e.target.value })}
        />
      </div>
      <label className="flex items-center gap-3 font-bold text-ink">
        <input
          type="checkbox"
          className="size-5"
          checked={v.isDefault}
          onChange={(e) => setV({ ...v, isDefault: e.target.checked })}
        />
        Guide par défaut (proposé par tous les articles sans guide choisi)
      </label>
      <div className="flex items-center gap-3 md:justify-end">
        <Button type="submit" disabled={busy}>
          {submitLabel}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm font-bold text-danger md:col-span-2">
          {error}
        </p>
      )}
    </form>
  );
}

function GuideCard({ g, canEdit }: { g: BlogGuideRow; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!confirm) return setConfirm(true);
    try {
      await api(`/api/admin/blog/guides/${g.id}`, { method: 'DELETE' });
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setConfirm(false);
    }
  }

  return (
    <li className="admin-card space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-bold text-ink">
            {g.title}
            {g.isDefault && (
              <span className="ml-2 rounded-full bg-admin px-2 py-0.5 text-xs text-admin-ink">
                Par défaut
              </span>
            )}
          </p>
          {g.description && <p className="text-ink-soft">{g.description}</p>}
          <a
            href={g.url}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-sm text-primary underline"
          >
            {g.url}
          </a>
          <p className="mt-1 text-sm text-ink-soft">
            {g.posts} article{g.posts > 1 ? 's' : ''} · {g.leads} contact{g.leads > 1 ? 's' : ''}
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setEditing((x) => !x)}>
              {editing ? 'Fermer' : 'Modifier'}
            </Button>
            <Button variant="ghost" onClick={() => void remove()}>
              {confirm ? 'Confirmer' : 'Supprimer'}
            </Button>
          </div>
        )}
      </div>
      {editing && (
        <GuideForm
          id={g.id}
          initial={{
            title: g.title,
            description: g.description ?? '',
            url: g.url,
            isDefault: g.isDefault,
          }}
          submitLabel="Enregistrer"
          onDone={() => setEditing(false)}
        />
      )}
      {error && (
        <p role="alert" className="text-sm font-bold text-danger">
          {error}
        </p>
      )}
    </li>
  );
}

export function GuidesManager({ guides, canEdit }: { guides: BlogGuideRow[]; canEdit: boolean }) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink">Guides</h1>
        <p className="text-ink-soft">
          Le lecteur laisse son prénom et son numéro WhatsApp, puis reçoit ce lien.
        </p>
      </header>
      <BlogAdminTabs current="guides" />
      {canEdit && (
        <section className="admin-card space-y-3 p-4" aria-labelledby="guide-new-title">
          <h2 id="guide-new-title" className="text-lg font-bold text-ink">
            Ajouter un guide
          </h2>
          <GuideForm
            initial={{ title: '', description: '', url: '', isDefault: guides.length === 0 }}
            submitLabel="Ajouter"
          />
        </section>
      )}
      {guides.length === 0 ? (
        <p className="text-ink-soft">
          Pas encore de guide : le bouton « Télécharger le guide » reste caché sur le blog.
        </p>
      ) : (
        <ul className="space-y-3">
          {guides.map((g) => (
            <GuideCard key={g.id} g={g} canEdit={canEdit} />
          ))}
        </ul>
      )}
    </div>
  );
}
