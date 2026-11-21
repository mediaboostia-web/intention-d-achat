import { prismaMock } from '@/test-utils/prisma-mock';
import { beforeEach, describe, expect, it } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { runTransactionsInline } from '@/test-utils/shop-fixtures';
import { BlogPostInput } from '@/lib/tamani/blog';
import {
  BlogError,
  deleteCategory,
  getPublishedPost,
  leadGuide,
  leadsCsv,
  listPublishedPosts,
  saveGuide,
  savePost,
} from './blog';

const db = prismaMock as unknown as PrismaClient;
const NOW = new Date('2026-11-21T10:00:00Z');
const DOC = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bonjour' }] }],
};

const ROW = {
  id: 'p1',
  slug: 'mon-article',
  title: 'Mon article',
  excerpt: 'Résumé',
  coverUrl: null,
  coverAlt: null,
  content: DOC,
  readMinutes: 1,
  seoTitle: null,
  seoDescription: null,
  keywords: [],
  authorName: "L'équipe Tamani",
  status: 'PUBLISHED',
  publishedAt: new Date('2026-11-20T08:00:00Z'),
  categoryId: 'cat_outils',
  guideId: null,
  createdById: 'a1',
  updatedById: 'a1',
  createdAt: new Date('2026-11-20T08:00:00Z'),
  updatedAt: new Date('2026-11-20T09:00:00Z'),
  category: { slug: 'outils', name: 'Outils' },
  guide: null,
};

beforeEach(() => {
  runTransactionsInline();
});

describe('public reads', () => {
  it('lists published articles only, newest first, 12 a page', async () => {
    prismaMock.blogPost.findMany.mockResolvedValue([ROW] as never);
    prismaMock.blogPost.count.mockResolvedValue(13);
    const { posts, total } = await listPublishedPosts(db, { page: 2 });
    expect(total).toBe(13);
    expect(posts[0]).toMatchObject({
      slug: 'mon-article',
      publishedAt: '2026-11-20T08:00:00.000Z',
      category: { slug: 'outils', name: 'Outils' },
    });
    expect(prismaMock.blogPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'PUBLISHED', publishedAt: { not: null } },
        orderBy: { publishedAt: 'desc' },
        skip: 12,
        take: 12,
      }),
    );
  });

  it('a draft is not found by its address', async () => {
    prismaMock.blogPost.findFirst.mockResolvedValue(null);
    expect(await getPublishedPost(db, 'brouillon')).toBeNull();
    expect(prismaMock.blogPost.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: 'brouillon', status: 'PUBLISHED' } }),
    );
  });

  it('an article offers its own guide, else the default one', async () => {
    prismaMock.blogPost.findFirst.mockResolvedValue(ROW as never);
    prismaMock.blogGuide.findFirst.mockResolvedValue({
      id: 'g0',
      title: 'Le guide',
      description: null,
    } as never);
    const found = await getPublishedPost(db, 'mon-article');
    expect(found?.guide).toEqual({ id: 'g0', title: 'Le guide', description: null });
    expect(prismaMock.blogGuide.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isDefault: true } }),
    );
  });
});

describe('leadGuide', () => {
  it('resolves the article and its guide link', async () => {
    prismaMock.blogPost.findFirst.mockResolvedValue({
      id: 'p1',
      guide: { id: 'g1', url: 'https://x.com/g' },
    } as never);
    expect(await leadGuide(db, 'mon-article')).toEqual({
      postId: 'p1',
      guide: { id: 'g1', url: 'https://x.com/g' },
    });
  });

  it('falls back to the default guide, and gives null without any guide', async () => {
    prismaMock.blogPost.findFirst.mockResolvedValue(null);
    prismaMock.blogGuide.findFirst.mockResolvedValueOnce({
      id: 'g0',
      url: 'https://x.com/d',
    } as never);
    expect(await leadGuide(db, 'inconnu')).toEqual({
      postId: null,
      guide: { id: 'g0', url: 'https://x.com/d' },
    });
    prismaMock.blogGuide.findFirst.mockResolvedValueOnce(null);
    expect(await leadGuide(db, undefined)).toBeNull();
  });
});

describe('savePost', () => {
  const input = BlogPostInput.parse({
    title: 'Mon article',
    excerpt: 'Résumé',
    content: DOC,
    status: 'PUBLISHED',
  });

  it('dates a first publication and counts the reading time', async () => {
    prismaMock.blogPost.create.mockResolvedValue(ROW as never);
    await savePost(db, { input, adminId: 'a1', now: NOW });
    expect(prismaMock.blogPost.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        slug: 'mon-article',
        status: 'PUBLISHED',
        publishedAt: NOW,
        readMinutes: 1,
        createdById: 'a1',
        updatedById: 'a1',
      }),
    });
  });

  it('keeps the first publication date when an article is edited again', async () => {
    prismaMock.blogPost.findUnique.mockResolvedValue(ROW as never);
    prismaMock.blogPost.update.mockResolvedValue(ROW as never);
    await savePost(db, { id: 'p1', input, adminId: 'a2', now: NOW });
    expect(prismaMock.blogPost.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: expect.objectContaining({ publishedAt: ROW.publishedAt, updatedById: 'a2' }),
    });
  });

  it('a draft has no publication date until it is published', async () => {
    prismaMock.blogPost.create.mockResolvedValue(ROW as never);
    await savePost(db, { input: { ...input, status: 'DRAFT' }, adminId: 'a1', now: NOW });
    expect(prismaMock.blogPost.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: 'DRAFT', publishedAt: null }),
    });
  });

  it('a taken address is a BLOG_SLUG_TAKEN, not a crash', async () => {
    prismaMock.blogPost.create.mockRejectedValue({ code: 'P2002', meta: { target: ['slug'] } });
    await expect(savePost(db, { input, adminId: 'a1', now: NOW })).rejects.toMatchObject({
      code: 'BLOG_SLUG_TAKEN',
      status: 409,
    });
  });

  it('editing a missing article is BLOG_NOT_FOUND', async () => {
    prismaMock.blogPost.findUnique.mockResolvedValue(null);
    const err = await savePost(db, { id: 'x', input, adminId: 'a1', now: NOW }).catch((e) => e);
    expect(err).toBeInstanceOf(BlogError);
    expect(err).toMatchObject({ code: 'BLOG_NOT_FOUND', status: 404 });
  });
});

describe('categories and guides', () => {
  it('refuses to delete a category that still has articles', async () => {
    prismaMock.blogCategory.findUnique.mockResolvedValue({ id: 'c1' } as never);
    prismaMock.blogPost.count.mockResolvedValue(2);
    await expect(deleteCategory(db, 'c1')).rejects.toMatchObject({
      code: 'BLOG_CATEGORY_NOT_EMPTY',
      status: 409,
    });
    expect(prismaMock.blogCategory.delete).not.toHaveBeenCalled();
  });

  it('one default guide at a time', async () => {
    prismaMock.blogGuide.create.mockResolvedValue({ id: 'g2' } as never);
    await saveGuide(db, {
      input: { title: 'G', description: null, url: 'https://x.com', isDefault: true },
    });
    expect(prismaMock.blogGuide.updateMany).toHaveBeenCalledWith({
      where: { isDefault: true },
      data: { isDefault: false },
    });
  });
});

describe('leadsCsv', () => {
  it('writes one line per contact for Excel', () => {
    const csv = leadsCsv([
      {
        id: 'l1',
        firstName: 'Awa',
        phone: '+229 01 97 00 00 19',
        country: 'BJ',
        post: 'Mon article',
        guide: 'Le guide',
        createdAt: '2026-11-21T10:00:00.000Z',
      },
    ]);
    expect(csv).toContain('Prénom');
    expect(csv).toContain('Awa');
    expect(csv).toContain('Mon article');
    expect(csv).toContain('2026-11-21 10:00');
  });
});
