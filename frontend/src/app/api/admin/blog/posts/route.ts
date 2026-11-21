// GET /api/admin/blog/posts (any admin): the articles, with a search, a state
// and a category filter. POST (super-admin): a new article (lot 13d).
export const runtime = 'nodejs';

import 'server-only';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { blogRead, blogWrite } from '@/lib/server/tamani/admin/blog-routes';
import { adminPosts, savePost } from '@/lib/server/tamani/blog';
import { BlogPostInput } from '@/lib/tamani/blog';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  return blogRead(req, async () => ({
    posts: await adminPosts(prisma, {
      q: sp.get('q') ?? undefined,
      status: sp.get('status') ?? undefined,
      categoryId: sp.get('categorie') ?? undefined,
    }),
  }));
}

export async function POST(req: NextRequest) {
  return blogWrite(req, BlogPostInput, async (tx, input, adminId) => {
    const row = await savePost(tx, { input, adminId, now: new Date() });
    return {
      status: 201,
      json: { post: { id: row.id, slug: row.slug, status: row.status } },
      journal: {
        action: 'blog.post_create',
        targetType: 'BlogPost',
        targetId: row.id,
        metadata: { slug: row.slug, status: row.status },
      },
    };
  });
}
