'use client';

// The article editor « comme Word » (porteur, 2026-11-21): a toolbar for
// titles, bold, lists, quotes, links, images and YouTube; paste from Google
// Docs or ChatGPT keeps the formatting the blog knows. The document is sent
// as Tiptap JSON; the public page renders it through the whitelist renderer,
// the same one as the preview here.
import '@/components/blog/blog.css';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import { Placeholder } from '@tiptap/extensions';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Button, Input, Select, Textarea } from '@/components/ui';
import { api } from '@/lib/api';
import type { AdminPostDetail, BlogCategoryRow, BlogGuideRow } from '@/lib/server/tamani/blog';
import { errorMessage, uploadErrorMessage } from '@/lib/tamani/api-messages';
import { BLOG_DEFAULT_AUTHOR, BlogPostInput, blogPostPath, blogSlug } from '@/lib/tamani/blog';
import { renderDoc, type BlogNode } from '@/lib/tamani/blog-render';
import { UploadError, uploadPhoto } from '@/lib/tamani/upload';
import { BLOG_ADMIN } from './BlogAdminTabs';

const EMPTY_DOC: BlogNode = { type: 'doc', content: [{ type: 'paragraph' }] };

function ToolButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active ?? undefined}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-control px-2 font-bold ${
        active ? 'bg-admin text-admin-ink' : 'bg-surface text-ink hover:bg-admin-soft'
      }`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor, onImage }: { editor: Editor; onImage: () => void }) {
  const chain = () => editor.chain().focus();
  function link() {
    const before = editor.getAttributes('link')['href'] as string | undefined;
    const href = window.prompt(
      'Adresse du lien (https://…). Vide pour retirer le lien.',
      before ?? 'https://',
    );
    if (href === null) return;
    if (href.trim() === '' || href.trim() === 'https://') chain().unsetLink().run();
    else chain().extendMarkRange('link').setLink({ href: href.trim() }).run();
  }
  function youtube() {
    const src = window.prompt('Adresse de la vidéo YouTube');
    if (src) chain().setYoutubeVideo({ src: src.trim() }).run();
  }
  return (
    <div
      role="toolbar"
      aria-label="Mise en forme"
      className="sticky top-0 z-10 flex flex-wrap gap-1 border-b border-admin-soft bg-admin-bg p-2"
    >
      <ToolButton
        label="Grand titre"
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => chain().toggleHeading({ level: 2 }).run()}
      >
        T1
      </ToolButton>
      <ToolButton
        label="Petit titre"
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => chain().toggleHeading({ level: 3 }).run()}
      >
        T2
      </ToolButton>
      <ToolButton
        label="Gras"
        active={editor.isActive('bold')}
        onClick={() => chain().toggleBold().run()}
      >
        <b>G</b>
      </ToolButton>
      <ToolButton
        label="Italique"
        active={editor.isActive('italic')}
        onClick={() => chain().toggleItalic().run()}
      >
        <i>I</i>
      </ToolButton>
      <ToolButton
        label="Souligné"
        active={editor.isActive('underline')}
        onClick={() => chain().toggleUnderline().run()}
      >
        <u>S</u>
      </ToolButton>
      <ToolButton
        label="Liste à puces"
        active={editor.isActive('bulletList')}
        onClick={() => chain().toggleBulletList().run()}
      >
        •
      </ToolButton>
      <ToolButton
        label="Liste numérotée"
        active={editor.isActive('orderedList')}
        onClick={() => chain().toggleOrderedList().run()}
      >
        1.
      </ToolButton>
      <ToolButton
        label="Citation"
        active={editor.isActive('blockquote')}
        onClick={() => chain().toggleBlockquote().run()}
      >
        «»
      </ToolButton>
      <ToolButton label="Lien" active={editor.isActive('link')} onClick={link}>
        🔗
      </ToolButton>
      <ToolButton label="Image" onClick={onImage}>
        🖼
      </ToolButton>
      <ToolButton label="Vidéo YouTube" onClick={youtube}>
        ▶
      </ToolButton>
      <ToolButton label="Séparateur" onClick={() => chain().setHorizontalRule().run()}>
        ―
      </ToolButton>
      <ToolButton label="Annuler" onClick={() => chain().undo().run()}>
        ↶
      </ToolButton>
      <ToolButton label="Rétablir" onClick={() => chain().redo().run()}>
        ↷
      </ToolButton>
    </div>
  );
}

type Status = 'DRAFT' | 'PUBLISHED';

export function PostEditor({
  post,
  categories,
  guides,
}: {
  /** null for a new article. */
  post: AdminPostDetail | null;
  categories: BlogCategoryRow[];
  guides: BlogGuideRow[];
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(post?.title ?? '');
  const [slug, setSlug] = useState(post?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(Boolean(post));
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '');
  const [categoryId, setCategoryId] = useState(post?.categoryId ?? '');
  const [guideId, setGuideId] = useState(post?.guideId ?? '');
  const [coverUrl, setCoverUrl] = useState(post?.coverUrl ?? '');
  const [coverAlt, setCoverAlt] = useState(post?.coverAlt ?? '');
  const [seoTitle, setSeoTitle] = useState(post?.seoTitle ?? '');
  const [seoDescription, setSeoDescription] = useState(post?.seoDescription ?? '');
  const [keywords, setKeywords] = useState((post?.keywords ?? []).join(', '));
  const [authorName, setAuthorName] = useState(post?.authorName ?? BLOG_DEFAULT_AUTHOR);
  const [status, setStatus] = useState<Status>(post?.status ?? 'DRAFT');
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
      }),
      Image,
      Youtube.configure({ nocookie: true, controls: true }),
      Placeholder.configure({
        placeholder: 'Écris ton article ici, ou colle-le depuis un autre document…',
      }),
    ],
    content: (post?.content ?? EMPTY_DOC) as object,
    editorProps: {
      attributes: {
        class: 'blog-prose min-h-[420px] px-4 py-4 outline-none',
        'aria-label': "Texte de l'article",
      },
    },
  });

  async function upload(file: File): Promise<string | null> {
    try {
      return await uploadPhoto(file);
    } catch (err) {
      setError(
        err instanceof UploadError
          ? uploadErrorMessage(err.status, err.code)
          : uploadErrorMessage(0, null),
      );
      return null;
    }
  }

  async function addImage(file: File | undefined) {
    if (!file || !editor) return;
    const src = await upload(file);
    if (!src) return;
    const alt =
      window.prompt("Décris l'image en quelques mots (aide Google et les malvoyants)") ?? '';
    editor.chain().focus().setImage({ src, alt }).run();
  }

  async function addCover(file: File | undefined) {
    if (!file) return;
    const src = await upload(file);
    if (src) setCoverUrl(src);
  }

  function body(next: Status) {
    return {
      title,
      slug: slug || blogSlug(title),
      excerpt,
      coverUrl: coverUrl || null,
      coverAlt,
      content: (editor?.getJSON() ?? post?.content ?? EMPTY_DOC) as BlogNode,
      seoTitle,
      seoDescription,
      keywords: keywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean)
        .slice(0, 10),
      authorName,
      categoryId: categoryId || null,
      guideId: guideId || null,
      status: next,
    };
  }

  async function save(next: Status) {
    const values = body(next);
    const check = BlogPostInput.safeParse(values);
    if (!check.success) {
      const field = check.error.issues[0]?.path[0];
      setError(
        field === 'title' || field === 'slug'
          ? 'Écris un titre (140 signes au plus).'
          : field === 'excerpt'
            ? 'Écris un résumé de 300 signes au plus : il s’affiche sous le titre et dans Google.'
            : field === 'seoTitle'
              ? 'Le titre pour Google fait 70 signes au plus.'
              : field === 'seoDescription'
                ? 'La description pour Google fait 170 signes au plus.'
                : 'Vérifie les champs de l’article.',
      );
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (post) {
        await api(`/api/admin/blog/posts/${post.id}`, { method: 'PATCH', body: values });
        setStatus(next);
        setMessage(next === 'PUBLISHED' ? 'Article en ligne.' : 'Brouillon enregistré.');
        router.refresh();
      } else {
        const res = await api<{ post: { id: string } }>('/api/admin/blog/posts', {
          method: 'POST',
          body: values,
        });
        router.replace(`${BLOG_ADMIN}/${res.post.id}`);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!post) return;
    if (!confirmDelete) return setConfirmDelete(true);
    setBusy(true);
    try {
      await api(`/api/admin/blog/posts/${post.id}`, { method: 'DELETE' });
      router.replace(BLOG_ADMIN);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  const rendered = preview && editor ? renderDoc(editor.getJSON() as BlogNode) : null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">
            {post ? 'Modifier l’article' : 'Nouvel article'}
          </h1>
          <p className="text-ink-soft">
            {status === 'PUBLISHED' ? 'En ligne' : 'Brouillon : visible seulement ici'}
          </p>
        </div>
        {post && status === 'PUBLISHED' && (
          <Button href={blogPostPath(post.slug)} variant="secondary" target="_blank" rel="noopener">
            Voir sur le blog
          </Button>
        )}
      </header>

      <section className="admin-card grid gap-4 p-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Input
            id="post-title"
            label="Titre"
            maxLength={140}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slugTouched) setSlug(blogSlug(e.target.value));
            }}
          />
        </div>
        <Input
          id="post-slug"
          label="Adresse"
          hint={`tamani.win/blog/${slug || '…'}`}
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          onBlur={() => setSlug(blogSlug(slug))}
        />
        <Input
          id="post-author"
          label="Auteur affiché"
          maxLength={60}
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
        />
        <div className="md:col-span-2">
          <Textarea
            id="post-excerpt"
            label="Résumé"
            hint="Deux phrases : sous le titre, sur les cartes et dans Google."
            rows={2}
            maxLength={300}
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
          />
        </div>
        <Select
          id="post-category"
          label="Catégorie"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          options={[
            { value: '', label: 'Sans catégorie' },
            ...categories.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
        <Select
          id="post-guide"
          label="Guide proposé"
          value={guideId}
          onChange={(e) => setGuideId(e.target.value)}
          options={[
            { value: '', label: 'Le guide par défaut' },
            ...guides.map((g) => ({ value: g.id, label: g.title })),
          ]}
        />
      </section>

      <section className="admin-card space-y-3 p-4" aria-labelledby="post-cover-title">
        <h2 id="post-cover-title" className="font-bold text-ink">
          Image de couverture
        </h2>
        {coverUrl ? (
          <img src={coverUrl} className="blog-cover max-w-md" alt="" />
        ) : (
          <p className="text-sm text-ink-soft">
            Elle s&apos;affiche en haut de l&apos;article et quand le lien est partagé sur WhatsApp.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => coverInput.current?.click()}>
            {coverUrl ? 'Changer l’image' : 'Choisir une image'}
          </Button>
          {coverUrl && (
            <Button type="button" variant="ghost" onClick={() => setCoverUrl('')}>
              Retirer
            </Button>
          )}
        </div>
        <input
          ref={coverInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => void addCover(e.target.files?.[0])}
        />
        {coverUrl && (
          <Input
            id="post-cover-alt"
            label="Ce que montre l’image"
            maxLength={160}
            value={coverAlt}
            onChange={(e) => setCoverAlt(e.target.value)}
          />
        )}
      </section>

      <section className="admin-card overflow-hidden" aria-label="Texte de l'article">
        <div className="flex items-center justify-between gap-2 border-b border-admin-soft px-3 py-2">
          <span className="font-bold text-ink">Texte</span>
          <Button type="button" variant="ghost" onClick={() => setPreview((p) => !p)}>
            {preview ? 'Revenir à l’écriture' : 'Aperçu'}
          </Button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            void addImage(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        {rendered ? (
          <div
            className="blog-prose px-4 py-4"
            dangerouslySetInnerHTML={{ __html: rendered.html }}
          />
        ) : (
          <>
            {editor && <Toolbar editor={editor} onImage={() => fileInput.current?.click()} />}
            <EditorContent editor={editor} />
          </>
        )}
      </section>

      <details className="admin-card p-4">
        <summary className="cursor-pointer font-bold text-ink">Pour Google (facultatif)</summary>
        <div className="mt-4 grid gap-4">
          <Input
            id="post-seo-title"
            label="Titre dans Google"
            hint={`Sinon : « ${title || 'le titre'} · Tamani ». 70 signes au plus.`}
            maxLength={70}
            value={seoTitle}
            onChange={(e) => setSeoTitle(e.target.value)}
          />
          <Textarea
            id="post-seo-description"
            label="Description dans Google"
            hint="Sinon : le résumé. 170 signes au plus."
            rows={2}
            maxLength={170}
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
          />
          <Input
            id="post-keywords"
            label="Mots-clés"
            hint="Séparés par des virgules : grossiste, perruques, Cotonou"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
          />
        </div>
      </details>

      <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 border-t border-admin-soft bg-admin-bg py-3">
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => void save('DRAFT')}
        >
          {status === 'PUBLISHED' ? 'Dépublier' : 'Enregistrer le brouillon'}
        </Button>
        <Button type="button" disabled={busy} onClick={() => void save('PUBLISHED')}>
          {status === 'PUBLISHED' ? 'Mettre à jour' : 'Publier'}
        </Button>
        {post && (
          <Button type="button" variant="ghost" disabled={busy} onClick={() => void remove()}>
            {confirmDelete ? 'Confirmer la suppression' : 'Supprimer'}
          </Button>
        )}
        <p role="status" className="text-sm text-ink-soft">
          {message}
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm font-bold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
