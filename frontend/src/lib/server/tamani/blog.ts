// The blog's reads and writes (lot 13d, spec 2026-11-21). Public reads see
// published articles only; admin writes are called by the /api/admin/blog
// routes, which check the role and journal each change.
import 'server-only';
import type { Prisma, PrismaClient } from '@prisma/client';
import { readMinutes, type BlogNode } from '@/lib/tamani/blog-render';
import {
  BLOG_PAGE_SIZE,
  type BlogCardView,
  type BlogCategoryInput,
  type BlogGuideInput,
  type BlogGuideView,
  type BlogPostInput,
  type BlogPostView,
} from '@/lib/tamani/blog';
import { toExcelCsv } from './csv';
import { isUniqueViolation } from './errors';
import { displayPhone } from './phone';

type Db = Pick<PrismaClient, 'blogPost' | 'blogCategory' | 'blogGuide' | 'blogLead'>;

export type BlogErrorCode = 'BLOG_NOT_FOUND' | 'BLOG_SLUG_TAKEN' | 'BLOG_CATEGORY_NOT_EMPTY';

export class BlogError extends Error {
  constructor(
    readonly code: BlogErrorCode,
    readonly status: 404 | 409,
  ) {
    super(code);
    this.name = 'BlogError';
  }
}

const PUBLISHED = { status: 'PUBLISHED', publishedAt: { not: null } } as const;

const CARD_SELECT = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  coverUrl: true,
  coverAlt: true,
  readMinutes: true,
  publishedAt: true,
  category: { select: { slug: true, name: true } },
} satisfies Prisma.BlogPostSelect;

type CardRow = Prisma.BlogPostGetPayload<{ select: typeof CARD_SELECT }>;

const toCard = (r: CardRow): BlogCardView => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  excerpt: r.excerpt,
  coverUrl: r.coverUrl,
  coverAlt: r.coverAlt,
  readMinutes: r.readMinutes,
  publishedAt: r.publishedAt?.toISOString() ?? null,
  category: r.category ? { slug: r.category.slug, name: r.category.name } : null,
});

// ─── Public ────────────────────────────────────────────────────────────────

export async function listPublishedPosts(
  db: Db,
  opts: { categoryId?: string; page?: number; take?: number } = {},
): Promise<{ posts: BlogCardView[]; total: number }> {
  const take = opts.take ?? BLOG_PAGE_SIZE;
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const where = opts.categoryId ? { ...PUBLISHED, categoryId: opts.categoryId } : PUBLISHED;
  const [rows, total] = await Promise.all([
    db.blogPost.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * take,
      take,
      select: CARD_SELECT,
    }),
    db.blogPost.count({ where }),
  ]);
  return { posts: rows.map(toCard), total };
}

const GUIDE_VIEW = { id: true, title: true, description: true } as const;

export async function defaultGuide(db: Db): Promise<BlogGuideView | null> {
  return db.blogGuide.findFirst({
    where: { isDefault: true },
    orderBy: { updatedAt: 'desc' },
    select: GUIDE_VIEW,
  });
}

/** A published article, its document and the guide it offers; null for a draft or an unknown address. */
export async function getPublishedPost(
  db: Db,
  slug: string,
): Promise<{ post: BlogPostView; content: BlogNode; guide: BlogGuideView | null } | null> {
  const row = await db.blogPost.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: {
      category: { select: { id: true, slug: true, name: true } },
      guide: { select: GUIDE_VIEW },
    },
  });
  if (!row || !row.publishedAt) return null;
  const post: BlogPostView = {
    ...toCard(row as unknown as CardRow),
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    keywords: row.keywords,
    authorName: row.authorName,
    updatedAt: row.updatedAt.toISOString(),
  };
  const guide = row.guide ?? (await defaultGuide(db));
  return { post, content: row.content as unknown as BlogNode, guide };
}

/** Three more of the same category, then the latest ones. */
export async function relatedPosts(
  db: Db,
  post: { id: string; categorySlug: string | null },
  take = 3,
): Promise<BlogCardView[]> {
  const same = post.categorySlug
    ? await db.blogPost.findMany({
        where: { ...PUBLISHED, id: { not: post.id }, category: { slug: post.categorySlug } },
        orderBy: { publishedAt: 'desc' },
        take,
        select: CARD_SELECT,
      })
    : [];
  if (same.length >= take) return same.map(toCard);
  const more = await db.blogPost.findMany({
    where: { ...PUBLISHED, id: { notIn: [post.id, ...same.map((s) => s.id)] } },
    orderBy: { publishedAt: 'desc' },
    take: take - same.length,
    select: CARD_SELECT,
  });
  return [...same, ...more].map(toCard);
}

export interface BlogCategoryRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  position: number;
  /** Published articles. */
  published: number;
  /** All articles, drafts included. */
  total: number;
}

export async function listCategories(db: Db): Promise<BlogCategoryRow[]> {
  const rows = await db.blogCategory.findMany({
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
    include: { posts: { select: { status: true } } },
  });
  return rows.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    position: c.position,
    published: c.posts.filter((p) => p.status === 'PUBLISHED').length,
    total: c.posts.length,
  }));
}

export async function findCategory(db: Db, slug: string) {
  return db.blogCategory.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true },
  });
}

/** What the sitemap lists: published articles and the categories that have some. */
export async function blogSitemap(db: Db) {
  const [posts, categories] = await Promise.all([
    db.blogPost.findMany({
      where: PUBLISHED,
      orderBy: { publishedAt: 'desc' },
      select: { slug: true, updatedAt: true },
    }),
    db.blogCategory.findMany({
      where: { posts: { some: { status: 'PUBLISHED' } } },
      select: { slug: true },
    }),
  ]);
  return { posts, categories };
}

/** The guide a reader gets at the end of `postSlug`: its own, else the default one. */
export async function leadGuide(
  db: Db,
  postSlug: string | undefined,
): Promise<{ postId: string | null; guide: { id: string; url: string } } | null> {
  const post = postSlug
    ? await db.blogPost.findFirst({
        where: { slug: postSlug, status: 'PUBLISHED' },
        select: { id: true, guide: { select: { id: true, url: true } } },
      })
    : null;
  const guide =
    post?.guide ??
    (await db.blogGuide.findFirst({
      where: { isDefault: true },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, url: true },
    }));
  return guide ? { postId: post?.id ?? null, guide } : null;
}

export async function saveLead(
  db: Db,
  lead: {
    firstName: string;
    phone: string;
    country: string;
    postId: string | null;
    guideId: string;
  },
  now: Date,
): Promise<void> {
  await db.blogLead.create({ data: { ...lead, consentAt: now } });
}

// ─── Admin ─────────────────────────────────────────────────────────────────

export interface AdminPostRow {
  id: string;
  slug: string;
  title: string;
  status: string;
  publishedAt: string | null;
  updatedAt: string;
  category: string | null;
  leads: number;
}

export async function adminPosts(
  db: Db,
  filter: {
    q?: string | undefined;
    status?: string | undefined;
    categoryId?: string | undefined;
  } = {},
): Promise<AdminPostRow[]> {
  const q = filter.q?.trim();
  const rows = await db.blogPost.findMany({
    where: {
      ...(filter.status === 'DRAFT' || filter.status === 'PUBLISHED'
        ? { status: filter.status }
        : {}),
      ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
      ...(q ? { title: { contains: q, mode: 'insensitive' as const } } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: 200,
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      publishedAt: true,
      updatedAt: true,
      category: { select: { name: true } },
      _count: { select: { leads: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    status: r.status,
    publishedAt: r.publishedAt?.toISOString() ?? null,
    updatedAt: r.updatedAt.toISOString(),
    category: r.category?.name ?? null,
    leads: r._count.leads,
  }));
}

/** An article as the editor loads it. */
export interface AdminPostDetail {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverUrl: string | null;
  coverAlt: string | null;
  content: BlogNode;
  seoTitle: string | null;
  seoDescription: string | null;
  keywords: string[];
  authorName: string;
  status: 'DRAFT' | 'PUBLISHED';
  publishedAt: string | null;
  categoryId: string | null;
  guideId: string | null;
}

export async function adminPost(db: Db, id: string): Promise<AdminPostDetail | null> {
  const r = await db.blogPost.findUnique({ where: { id } });
  if (!r) return null;
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    coverUrl: r.coverUrl,
    coverAlt: r.coverAlt,
    content: r.content as unknown as BlogNode,
    seoTitle: r.seoTitle,
    seoDescription: r.seoDescription,
    keywords: r.keywords,
    authorName: r.authorName,
    status: r.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
    publishedAt: r.publishedAt?.toISOString() ?? null,
    categoryId: r.categoryId,
    guideId: r.guideId,
  };
}

function slugTaken(err: unknown): never {
  if (isUniqueViolation(err)) throw new BlogError('BLOG_SLUG_TAKEN', 409);
  throw err;
}

/** Creates (no id) or updates an article. The first publication is dated once. */
export async function savePost(
  db: Db,
  args: { id?: string; input: BlogPostInput; adminId: string; now: Date },
) {
  const { input, adminId, now } = args;
  const fields = {
    slug: input.slug,
    title: input.title,
    excerpt: input.excerpt,
    coverUrl: input.coverUrl,
    coverAlt: input.coverAlt,
    content: input.content as unknown as Prisma.InputJsonValue,
    readMinutes: readMinutes(input.content),
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    keywords: input.keywords,
    authorName: input.authorName,
    status: input.status,
    categoryId: input.categoryId,
    guideId: input.guideId,
    updatedById: adminId,
  };
  if (!args.id) {
    return db.blogPost
      .create({
        data: {
          ...fields,
          publishedAt: input.status === 'PUBLISHED' ? now : null,
          createdById: adminId,
        },
      })
      .catch(slugTaken);
  }
  const before = await db.blogPost.findUnique({
    where: { id: args.id },
    select: { publishedAt: true },
  });
  if (!before) throw new BlogError('BLOG_NOT_FOUND', 404);
  const publishedAt = before.publishedAt ?? (input.status === 'PUBLISHED' ? now : null);
  return db.blogPost
    .update({ where: { id: args.id }, data: { ...fields, publishedAt } })
    .catch(slugTaken);
}

export async function deletePost(db: Db, id: string) {
  const found = await db.blogPost.findUnique({ where: { id }, select: { id: true, slug: true } });
  if (!found) throw new BlogError('BLOG_NOT_FOUND', 404);
  await db.blogPost.delete({ where: { id } });
  return found;
}

export async function saveCategory(db: Db, args: { id?: string; input: BlogCategoryInput }) {
  const { input } = args;
  const data = {
    name: input.name,
    slug: input.slug,
    description: input.description,
    ...(input.position !== undefined ? { position: input.position } : {}),
  };
  if (!args.id) {
    const position = input.position ?? (await db.blogCategory.count());
    return db.blogCategory.create({ data: { ...data, position } }).catch(slugTaken);
  }
  const found = await db.blogCategory.findUnique({ where: { id: args.id }, select: { id: true } });
  if (!found) throw new BlogError('BLOG_NOT_FOUND', 404);
  return db.blogCategory.update({ where: { id: args.id }, data }).catch(slugTaken);
}

export async function deleteCategory(db: Db, id: string) {
  const found = await db.blogCategory.findUnique({ where: { id }, select: { id: true } });
  if (!found) throw new BlogError('BLOG_NOT_FOUND', 404);
  if ((await db.blogPost.count({ where: { categoryId: id } })) > 0) {
    throw new BlogError('BLOG_CATEGORY_NOT_EMPTY', 409);
  }
  await db.blogCategory.delete({ where: { id } });
}

export interface BlogGuideRow {
  id: string;
  title: string;
  description: string | null;
  url: string;
  isDefault: boolean;
  posts: number;
  leads: number;
}

export async function listGuides(db: Db): Promise<BlogGuideRow[]> {
  const rows = await db.blogGuide.findMany({
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    include: { _count: { select: { posts: true, leads: true } } },
  });
  return rows.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    url: g.url,
    isDefault: g.isDefault,
    posts: g._count.posts,
    leads: g._count.leads,
  }));
}

/**
 * Creates or updates a guide; a default guide takes the place of the previous
 * one. Run it inside the caller's transaction.
 */
export async function saveGuide(db: Db, args: { id?: string; input: BlogGuideInput }) {
  const { input } = args;
  if (args.id) {
    const found = await db.blogGuide.findUnique({ where: { id: args.id }, select: { id: true } });
    if (!found) throw new BlogError('BLOG_NOT_FOUND', 404);
  }
  if (input.isDefault) {
    await db.blogGuide.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
  }
  return args.id
    ? db.blogGuide.update({ where: { id: args.id }, data: input })
    : db.blogGuide.create({ data: input });
}

export async function deleteGuide(db: Db, id: string) {
  const found = await db.blogGuide.findUnique({ where: { id }, select: { id: true } });
  if (!found) throw new BlogError('BLOG_NOT_FOUND', 404);
  // Its articles fall back to the default guide (guideId set to null by the foreign key).
  await db.blogGuide.delete({ where: { id } });
}

export interface BlogLeadRow {
  id: string;
  firstName: string;
  /** Written out (« +229 01 97 00 00 19 »). */
  phone: string;
  country: string;
  post: string | null;
  guide: string | null;
  createdAt: string;
}

export async function listLeads(db: Db, take = 1000): Promise<BlogLeadRow[]> {
  const rows = await db.blogLead.findMany({
    orderBy: { createdAt: 'desc' },
    take,
    include: { post: { select: { title: true } }, guide: { select: { title: true } } },
  });
  return rows.map((l) => ({
    id: l.id,
    firstName: l.firstName,
    phone: displayPhone(l.phone),
    country: l.country,
    post: l.post?.title ?? null,
    guide: l.guide?.title ?? null,
    createdAt: l.createdAt.toISOString(),
  }));
}

const LEAD_COLUMNS = [
  { key: 'firstName', header: 'Prénom' },
  { key: 'phone', header: 'WhatsApp' },
  { key: 'country', header: 'Pays' },
  { key: 'post', header: 'Article' },
  { key: 'guide', header: 'Guide' },
  { key: 'createdAt', header: 'Date' },
] as const;

export function leadsCsv(rows: readonly BlogLeadRow[]): string {
  return toExcelCsv(
    LEAD_COLUMNS,
    rows.map((r) => ({
      firstName: r.firstName,
      phone: r.phone,
      country: r.country,
      post: r.post,
      guide: r.guide,
      createdAt: r.createdAt.slice(0, 16).replace('T', ' '),
    })),
  );
}

/** The blog's figures for the support-admin. */
export async function blogStats(db: Db, now: Date) {
  const since = new Date(now.getTime() - 30 * 86_400_000);
  const [published, drafts, leads, leads30, top] = await Promise.all([
    db.blogPost.count({ where: PUBLISHED }),
    db.blogPost.count({ where: { status: 'DRAFT' } }),
    db.blogLead.count(),
    db.blogLead.count({ where: { createdAt: { gte: since } } }),
    db.blogPost.findFirst({
      where: { leads: { some: {} } },
      orderBy: { leads: { _count: 'desc' } },
      select: { title: true, _count: { select: { leads: true } } },
    }),
  ]);
  return {
    published,
    drafts,
    leads,
    leads30,
    topPost: top ? { title: top.title, leads: top._count.leads } : null,
  };
}
