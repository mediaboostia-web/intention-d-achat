// The blog's article renderer (lot 13d). The admin's editor (Tiptap) stores a
// JSON document; the public page shows only what this whitelist produces from
// it. Every text is escaped, every link, image and video is checked, and any
// node or mark not listed here is dropped: the stored document is never
// trusted, so nothing it holds can run in a reader's browser.
// Shared with the browser (the admin preview).

export interface BlogMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface BlogNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: BlogNode[];
  text?: string;
  marks?: BlogMark[];
}

export interface TocEntry {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface RenderOptions {
  /** The site's own host (« tamani.win »): its links stay in the same tab. */
  siteHost?: string;
}

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);
}

/** « Fêtes : quels produits ? » → « fetes-quels-produits ». */
export function slugify(text: string, max = 80): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/g, '');
}

const isNode = (n: unknown): n is BlogNode =>
  typeof n === 'object' && n !== null && typeof (n as BlogNode).type === 'string';

const children = (n: BlogNode): BlogNode[] =>
  Array.isArray(n.content) ? n.content.filter(isNode) : [];

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** A link the reader may follow, or null: http(s), mailto, a path or an anchor of this site. */
export function safeHref(raw: unknown): string | null {
  const href = str(raw).trim();
  if (!href) return null;
  if (href.startsWith('#')) return href;
  if (href.startsWith('/') && !href.startsWith('//')) return href;
  try {
    const url = new URL(href);
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? href : null;
  } catch {
    return null;
  }
}

function isExternal(href: string, siteHost: string | undefined): boolean {
  if (!/^https?:/i.test(href)) return false;
  try {
    const host = new URL(href).hostname.replace(/^www\./, '');
    return !siteHost || host !== siteHost.replace(/^www\./, '');
  } catch {
    return true;
  }
}

/** An image address we show: https only. */
export function safeImageSrc(raw: unknown): string | null {
  const src = str(raw).trim();
  try {
    return new URL(src).protocol === 'https:' ? src : null;
  } catch {
    return null;
  }
}

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'www.youtube-nocookie.com',
  'youtube-nocookie.com',
]);
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/** The 11-character id of a YouTube address, or null. */
export function youtubeId(raw: unknown): string | null {
  try {
    const url = new URL(str(raw).trim());
    if (url.protocol !== 'https:' || !YOUTUBE_HOSTS.has(url.hostname)) return null;
    const parts = url.pathname.split('/').filter(Boolean);
    const id =
      url.hostname === 'youtu.be'
        ? parts[0]
        : (url.searchParams.get('v') ??
          (['embed', 'shorts', 'live'].includes(parts[0] ?? '') ? parts[1] : undefined));
    return id && YOUTUBE_ID.test(id) ? id : null;
  } catch {
    return null;
  }
}

// Outer to inner: a bold link is <a><strong>…</strong></a>.
const MARK_ORDER = ['link', 'bold', 'italic', 'underline', 'strike', 'code'] as const;
const MARK_TAGS: Record<string, string> = {
  bold: 'strong',
  italic: 'em',
  underline: 'u',
  strike: 's',
  code: 'code',
};

function renderText(node: BlogNode, opts: RenderOptions): string {
  let html = escapeHtml(str(node.text));
  const marks = Array.isArray(node.marks) ? node.marks : [];
  for (const type of [...MARK_ORDER].reverse()) {
    const mark = marks.find((m) => m?.type === type);
    if (!mark) continue;
    if (type === 'link') {
      const href = safeHref(mark.attrs?.['href']);
      if (!href) continue;
      const ext = isExternal(href, opts.siteHost)
        ? ' target="_blank" rel="noopener noreferrer"'
        : '';
      html = `<a href="${escapeHtml(href)}"${ext}>${html}</a>`;
    } else {
      const tag = MARK_TAGS[type];
      html = `<${tag}>${html}</${tag}>`;
    }
  }
  return html;
}

/** The plain words of a node and its children. */
export function nodeText(node: BlogNode): string {
  if (node.type === 'text') return str(node.text);
  return children(node).map(nodeText).join('');
}

class Renderer {
  readonly toc: TocEntry[] = [];
  private readonly ids = new Map<string, number>();
  constructor(private readonly opts: RenderOptions) {}

  private headingId(text: string): string {
    const base = slugify(text) || 'section';
    const seen = (this.ids.get(base) ?? 0) + 1;
    this.ids.set(base, seen);
    return seen === 1 ? base : `${base}-${seen}`;
  }

  inner(node: BlogNode): string {
    return children(node)
      .map((c) => this.node(c))
      .join('');
  }

  node(node: BlogNode): string {
    switch (node.type) {
      case 'doc':
        return this.inner(node);
      case 'text':
        return renderText(node, this.opts);
      case 'paragraph':
        return `<p>${this.inner(node)}</p>`;
      case 'heading': {
        const level: 2 | 3 = Number(node.attrs?.['level']) >= 3 ? 3 : 2;
        const text = nodeText(node).trim();
        const id = this.headingId(text);
        if (text) this.toc.push({ id, text, level });
        return `<h${level} id="${id}">${this.inner(node)}</h${level}>`;
      }
      case 'bulletList':
        return `<ul>${this.inner(node)}</ul>`;
      case 'orderedList':
        return `<ol>${this.inner(node)}</ol>`;
      case 'listItem':
        return `<li>${this.inner(node)}</li>`;
      case 'blockquote':
        return `<blockquote>${this.inner(node)}</blockquote>`;
      case 'horizontalRule':
        return '<hr>';
      case 'hardBreak':
        return '<br>';
      case 'image': {
        const src = safeImageSrc(node.attrs?.['src']);
        if (!src) return '';
        const alt = escapeHtml(str(node.attrs?.['alt']));
        return `<figure><img src="${escapeHtml(src)}" alt="${alt}" loading="lazy" decoding="async"></figure>`;
      }
      case 'youtube': {
        const id = youtubeId(node.attrs?.['src']);
        if (!id) return '';
        return `<div class="blog-video"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="Vidéo YouTube" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
      }
      default:
        return '';
    }
  }
}

/** The article's HTML and its table of contents (h2 and h3). */
export function renderDoc(
  doc: BlogNode | null | undefined,
  opts: RenderOptions = {},
): { html: string; toc: TocEntry[] } {
  if (!isNode(doc)) return { html: '', toc: [] };
  const r = new Renderer(opts);
  return { html: r.node(doc), toc: r.toc };
}

/** Every word of the document, blocks separated by a space. */
export function docText(doc: BlogNode | null | undefined): string {
  if (!isNode(doc)) return '';
  const out: string[] = [];
  const walk = (n: BlogNode) => {
    if (n.type === 'text') out.push(str(n.text));
    else {
      const block = children(n);
      block.forEach(walk);
      if (n.type !== 'doc' && block.length && n.type !== 'listItem') out.push(' ');
    }
  };
  walk(doc);
  return out.join('').replace(/\s+/g, ' ').trim();
}

/** 200 words a minute, one minute at least. */
export function readMinutes(doc: BlogNode | null | undefined): number {
  const words = docText(doc).split(' ').filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}
