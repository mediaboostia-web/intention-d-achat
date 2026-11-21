import { prismaMock } from '@/test-utils/prisma-mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/server/middleware', () => ({ requireAdmin: vi.fn(), requireSuperadmin: vi.fn() }));
vi.mock('@/lib/server/middleware/rate-limit-by-userid', () => ({
  enforceAdminRateLimit: vi.fn(),
}));
vi.mock('@/lib/server/auth', async () => ({
  ...(await vi.importActual<typeof import('@/lib/server/auth')>('@/lib/server/auth')),
  verifyCsrf: vi.fn(),
}));
vi.mock('@/lib/server/admin/audit', () => ({ logAdminAction: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { revalidatePath } from 'next/cache';
import { requireAdmin, requireSuperadmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { verifyCsrf } from '@/lib/server/auth';
import { logAdminAction } from '@/lib/server/admin/audit';
import { runTransactionsInline } from '@/test-utils/shop-fixtures';
import {
  ADMIN_CTX,
  SUPERADMIN_CTX,
  SUPERADMIN_REQUIRED,
  adminRequest,
} from '@/test-utils/admin-contexts';
import * as posts from './posts/route';
import * as post from './posts/[id]/route';
import * as categories from './categories/route';
import * as category from './categories/[id]/route';
import * as guides from './guides/route';
import * as guide from './guides/[id]/route';
import * as leadsExport from './leads/export/route';

const DOC = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x' }] }],
};
const BODY = { title: 'Mon article', excerpt: 'Résumé', content: DOC, status: 'PUBLISHED' };
const ROW = { id: 'p1', slug: 'mon-article', title: 'Mon article', status: 'PUBLISHED' };
const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.mocked(verifyCsrf).mockReturnValue(null);
  vi.mocked(requireAdmin).mockReset().mockResolvedValue(ADMIN_CTX);
  vi.mocked(requireSuperadmin).mockReset().mockResolvedValue(SUPERADMIN_CTX);
  vi.mocked(enforceAdminRateLimit).mockResolvedValue(null);
  vi.mocked(logAdminAction).mockReset().mockResolvedValue(undefined);
  vi.mocked(revalidatePath).mockReset();
  runTransactionsInline();
});

describe('articles', () => {
  it('every route runs on node', () => {
    for (const m of [posts, post, categories, category, guides, guide, leadsExport]) {
      expect(m.runtime).toBe('nodejs');
    }
  });

  it('an admin reads the list', async () => {
    prismaMock.blogPost.findMany.mockResolvedValue([]);
    const res = await posts.GET(adminRequest('/api/admin/blog/posts?status=DRAFT&q=fete', 'GET'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ posts: [] });
    expect(prismaMock.blogPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'DRAFT', title: { contains: 'fete', mode: 'insensitive' } },
      }),
    );
  });

  it('only a super-admin writes', async () => {
    vi.mocked(requireSuperadmin).mockResolvedValue(SUPERADMIN_REQUIRED());
    const res = await posts.POST(adminRequest('/api/admin/blog/posts', 'POST', BODY));
    expect(res.status).toBe(403);
    expect(prismaMock.blogPost.create).not.toHaveBeenCalled();
  });

  it('creates an article, journals it and rebuilds the blog', async () => {
    prismaMock.blogPost.create.mockResolvedValue(ROW as never);
    const res = await posts.POST(adminRequest('/api/admin/blog/posts', 'POST', BODY));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      post: { id: 'p1', slug: 'mon-article', status: 'PUBLISHED' },
    });
    expect(logAdminAction).toHaveBeenCalledWith(expect.anything(), {
      actorId: SUPERADMIN_CTX.admin.id,
      action: 'blog.post_create',
      targetType: 'BlogPost',
      targetId: 'p1',
      metadata: { slug: 'mon-article', status: 'PUBLISHED' },
    });
    expect(revalidatePath).toHaveBeenCalledWith('/blog', 'layout');
    expect(revalidatePath).toHaveBeenCalledWith('/sitemap.xml');
  });

  it('a bad body is a 400', async () => {
    const res = await posts.POST(adminRequest('/api/admin/blog/posts', 'POST', { title: '' }));
    expect(res.status).toBe(400);
  });

  it('a taken address is a 409 BLOG_SLUG_TAKEN', async () => {
    prismaMock.blogPost.create.mockRejectedValue({ code: 'P2002', meta: { target: ['slug'] } });
    const res = await posts.POST(adminRequest('/api/admin/blog/posts', 'POST', BODY));
    expect(res.status).toBe(409);
    expect(((await res.json()) as { error: string }).error).toBe('BLOG_SLUG_TAKEN');
  });

  it('reads, updates and deletes one article', async () => {
    prismaMock.blogPost.findUnique.mockResolvedValue({
      ...ROW,
      excerpt: 'R',
      coverUrl: null,
      coverAlt: null,
      content: DOC,
      seoTitle: null,
      seoDescription: null,
      keywords: [],
      authorName: 'X',
      publishedAt: new Date('2026-11-20T00:00:00Z'),
      categoryId: null,
      guideId: null,
    } as never);
    const got = await post.GET(adminRequest('/api/admin/blog/posts/p1', 'GET'), params('p1'));
    expect(((await got.json()) as { post: { slug: string } }).post.slug).toBe('mon-article');

    prismaMock.blogPost.update.mockResolvedValue(ROW as never);
    const put = await post.PATCH(
      adminRequest('/api/admin/blog/posts/p1', 'PATCH', BODY),
      params('p1'),
    );
    expect(put.status).toBe(200);
    expect(logAdminAction).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'blog.post_update', targetId: 'p1' }),
    );

    const del = await post.DELETE(adminRequest('/api/admin/blog/posts/p1', 'DELETE'), params('p1'));
    expect(await del.json()).toEqual({ deleted: true });
    expect(prismaMock.blogPost.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
  });

  it('an unknown article is a 404', async () => {
    prismaMock.blogPost.findUnique.mockResolvedValue(null);
    const res = await post.GET(adminRequest('/api/admin/blog/posts/x', 'GET'), params('x'));
    expect(res.status).toBe(404);
    const del = await post.DELETE(adminRequest('/api/admin/blog/posts/x', 'DELETE'), params('x'));
    expect(del.status).toBe(404);
  });
});

describe('categories and guides', () => {
  it('creates a category at the end of the list', async () => {
    prismaMock.blogCategory.count.mockResolvedValue(4);
    prismaMock.blogCategory.create.mockResolvedValue({ id: 'c5', slug: 'conseils' } as never);
    const res = await categories.POST(
      adminRequest('/api/admin/blog/categories', 'POST', { name: 'Conseils' }),
    );
    expect(res.status).toBe(201);
    expect(prismaMock.blogCategory.create).toHaveBeenCalledWith({
      data: { name: 'Conseils', slug: 'conseils', description: null, position: 4 },
    });
  });

  it('refuses to delete a category with articles', async () => {
    prismaMock.blogCategory.findUnique.mockResolvedValue({ id: 'c1' } as never);
    prismaMock.blogPost.count.mockResolvedValue(1);
    const res = await category.DELETE(
      adminRequest('/api/admin/blog/categories/c1', 'DELETE'),
      params('c1'),
    );
    expect(res.status).toBe(409);
    expect(((await res.json()) as { error: string }).error).toBe('BLOG_CATEGORY_NOT_EMPTY');
  });

  it('a guide is a link; making it the default replaces the previous one', async () => {
    prismaMock.blogGuide.create.mockResolvedValue({ id: 'g1' } as never);
    const res = await guides.POST(
      adminRequest('/api/admin/blog/guides', 'POST', {
        title: 'Guide',
        url: 'https://boutique.example.com/guide',
        isDefault: true,
      }),
    );
    expect(res.status).toBe(201);
    expect(prismaMock.blogGuide.updateMany).toHaveBeenCalled();
    const bad = await guides.POST(
      adminRequest('/api/admin/blog/guides', 'POST', { title: 'G', url: 'javascript:alert(1)' }),
    );
    expect(bad.status).toBe(400);
  });

  it('deletes a guide', async () => {
    prismaMock.blogGuide.findUnique.mockResolvedValue({ id: 'g1' } as never);
    const res = await guide.DELETE(
      adminRequest('/api/admin/blog/guides/g1', 'DELETE'),
      params('g1'),
    );
    expect(await res.json()).toEqual({ deleted: true });
  });
});

describe('leads export', () => {
  it('any admin downloads the contacts as CSV, never cached', async () => {
    prismaMock.blogLead.findMany.mockResolvedValue([
      {
        id: 'l1',
        firstName: 'Awa',
        phone: '+22901970000190',
        country: 'BJ',
        createdAt: new Date('2026-11-21T10:00:00Z'),
        post: { title: 'Mon article' },
        guide: { title: 'Le guide' },
      },
    ] as never);
    const res = await leadsExport.GET(adminRequest('/api/admin/blog/leads/export', 'GET'));
    expect(res.headers.get('content-type')).toContain('text/csv');
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.text()).toContain('Awa');
  });
});
