// The blog (lot 13d, spec 2026-11-21): the forms the admin sends, the shapes
// the public pages read, and what Google sees (metadata, JSON-LD). Shared with
// the browser.
import type { Metadata } from 'next';
import { z } from 'zod';
import { slugify, type BlogNode } from './blog-render';

export const BLOG_PATH = '/blog';
export const BLOG_DEFAULT_AUTHOR = "L'équipe Tamani";
export const BLOG_TITLE = 'Le blog Tamani';
export const BLOG_DESCRIPTION =
  'Actualités, opportunités, outils et solutions pour les grossistes et les revendeurs.';
/** Articles per page on the index and the categories. */
export const BLOG_PAGE_SIZE = 12;

export const BLOG_STATUSES = ['DRAFT', 'PUBLISHED'] as const;
export type BlogStatus = (typeof BLOG_STATUSES)[number];

const trimBase = (appUrl: string) => appUrl.replace(/\/+$/, '');

export function blogSlug(title: string): string {
  return slugify(title);
}

export const blogPostUrl = (appUrl: string, slug: string) =>
  `${trimBase(appUrl)}${BLOG_PATH}/${slug}`;
export const blogCategoryUrl = (appUrl: string, slug: string) =>
  `${trimBase(appUrl)}${BLOG_PATH}/categorie/${slug}`;
export const blogPostPath = (slug: string) => `${BLOG_PATH}/${slug}`;
export const blogCategoryPath = (slug: string) => `${BLOG_PATH}/categorie/${slug}`;

const blankToNull = (s: string) => (s.trim() === '' ? null : s.trim());
const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .nullish()
    .transform((s) => (s == null ? null : blankToNull(s)));

const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .refine((s) => {
    try {
      return new URL(s).protocol === 'https:';
    } catch {
      return false;
    }
  }, 'https');

const webUrl = z
  .string()
  .trim()
  .max(500)
  .refine((s) => {
    try {
      return ['https:', 'http:'].includes(new URL(s).protocol);
    } catch {
      return false;
    }
  }, 'url');

const id = z.string().trim().min(1).max(40);

/** A Tiptap document: an object whose type is « doc ». Its content is checked when rendered. */
const BlogDoc = z.custom<BlogNode>(
  (v) =>
    typeof v === 'object' &&
    v !== null &&
    (v as BlogNode).type === 'doc' &&
    JSON.stringify(v).length <= 400_000,
  { message: 'doc' },
);

/** The slug typed, cleaned, or the one drawn from `from`; never empty. */
function withSlug<T extends { slug?: string | null | undefined }>(v: T, from: string) {
  return { ...v, slug: slugify(v.slug?.trim() ? v.slug : from) };
}

export const BlogPostInput = z
  .object({
    title: z.string().trim().min(1).max(140),
    slug: z.string().max(100).nullish(),
    excerpt: z.string().trim().min(1).max(300),
    coverUrl: httpsUrl.nullish().transform((v) => v ?? null),
    coverAlt: optionalText(160),
    content: BlogDoc,
    seoTitle: optionalText(70),
    seoDescription: optionalText(170),
    keywords: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
    authorName: z
      .string()
      .trim()
      .max(60)
      .default('')
      .transform((s) => s || BLOG_DEFAULT_AUTHOR),
    categoryId: id.nullish().transform((v) => v ?? null),
    guideId: id.nullish().transform((v) => v ?? null),
    status: z.enum(BLOG_STATUSES),
  })
  .transform((v) => withSlug(v, v.title))
  .refine((v) => v.slug.length > 0, { message: 'slug', path: ['slug'] });
export type BlogPostInput = z.infer<typeof BlogPostInput>;

export const BlogCategoryInput = z
  .object({
    name: z.string().trim().min(1).max(40),
    slug: z.string().max(60).nullish(),
    description: optionalText(200),
    position: z.number().int().min(0).max(999).optional(),
  })
  .transform((v) => withSlug(v, v.name))
  .refine((v) => v.slug.length > 0, { message: 'slug', path: ['slug'] });
export type BlogCategoryInput = z.infer<typeof BlogCategoryInput>;

export const BlogGuideInput = z.object({
  title: z.string().trim().min(1).max(80),
  description: optionalText(200),
  url: webUrl,
  isDefault: z.boolean().default(false),
});
export type BlogGuideInput = z.infer<typeof BlogGuideInput>;

/** The reader's form at the end of an article: the guide for a contact. */
export const BlogLeadInput = z.object({
  firstName: z.string().trim().min(1).max(40),
  phone: z.string().trim().min(4).max(30),
  country: z.string().trim().toUpperCase().length(2).default('BJ'),
  consent: z.literal(true),
  /** The article's slug, to know which one brings contacts. */
  post: z.string().trim().max(100).optional(),
  /** The honeypot: a person never sees it, a bot fills it. */
  website: z.string().max(200).optional(),
});
export type BlogLeadInput = z.infer<typeof BlogLeadInput>;

export interface BlogCategoryRef {
  slug: string;
  name: string;
}

/** An article as a card on the index. Dates are ISO strings. */
export interface BlogCardView {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverUrl: string | null;
  coverAlt: string | null;
  readMinutes: number;
  publishedAt: string | null;
  category: BlogCategoryRef | null;
}

/** An article as its page needs it, without the body. */
export interface BlogPostView extends BlogCardView {
  seoTitle: string | null;
  seoDescription: string | null;
  keywords: string[];
  authorName: string;
  updatedAt: string;
}

/** A guide as the reader's button needs it. */
export interface BlogGuideView {
  id: string;
  title: string;
  description: string | null;
}

/** « 18 nov. 2026 ». */
export function blogDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

const OG_DEFAULT = (base: string) => `${base}/brand/og-default.png`;

export function blogIndexMetadata(appUrl: string, category?: BlogCategoryRef): Metadata {
  const base = trimBase(appUrl);
  const url = category ? blogCategoryUrl(base, category.slug) : `${base}${BLOG_PATH}`;
  const title = category
    ? `${category.name} · ${BLOG_TITLE}`
    : `${BLOG_TITLE} · Grossistes et revendeurs`;
  return {
    title: { absolute: title },
    description: BLOG_DESCRIPTION,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website',
      siteName: 'Tamani',
      locale: 'fr_FR',
      url,
      title,
      description: BLOG_DESCRIPTION,
      images: [{ url: OG_DEFAULT(base), width: 1200, height: 630, alt: '' }],
    },
    twitter: { card: 'summary_large_image', title, description: BLOG_DESCRIPTION },
  };
}

export function blogPostMetadata(appUrl: string, post: BlogPostView): Metadata {
  const base = trimBase(appUrl);
  const url = blogPostUrl(base, post.slug);
  const title = post.seoTitle ?? `${post.title} · Tamani`;
  const description = post.seoDescription ?? post.excerpt;
  const image = post.coverUrl ?? OG_DEFAULT(base);
  return {
    title: { absolute: title },
    description,
    keywords: post.keywords,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'article',
      siteName: 'Tamani',
      locale: 'fr_FR',
      url,
      title,
      description,
      images: [{ url: image, alt: post.coverAlt ?? '' }],
      ...(post.publishedAt ? { publishedTime: post.publishedAt } : {}),
      modifiedTime: post.updatedAt,
      authors: [post.authorName],
      ...(post.category ? { section: post.category.name } : {}),
      tags: post.keywords,
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export function blogPostJsonLd(appUrl: string, post: BlogPostView): Record<string, unknown> {
  const base = trimBase(appUrl);
  const url = blogPostUrl(base, post.slug);
  const crumbs = [
    { name: 'Accueil', item: `${base}/` },
    { name: 'Blog', item: `${base}${BLOG_PATH}` },
    { name: post.title, item: url },
  ];
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.seoDescription ?? post.excerpt,
        ...(post.coverUrl ? { image: [post.coverUrl] } : {}),
        datePublished: post.publishedAt,
        dateModified: post.updatedAt,
        author: { '@type': 'Organization', name: post.authorName, url: `${base}/` },
        publisher: { '@id': `${base}/#organisation` },
        mainEntityOfPage: url,
        url,
        inLanguage: 'fr',
        ...(post.keywords.length ? { keywords: post.keywords.join(', ') } : {}),
        ...(post.category ? { articleSection: post.category.name } : {}),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: crumbs.map((c, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: c.name,
          item: c.item,
        })),
      },
    ],
  };
}

/** A share link on WhatsApp: the title, then the address. */
export function whatsappShareHref(title: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`;
}

export function facebookShareHref(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}
