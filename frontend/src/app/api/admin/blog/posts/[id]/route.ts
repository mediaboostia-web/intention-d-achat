// GET /api/admin/blog/posts/[id] (any admin): an article for the editor.
// PATCH (super-admin): save it, publish or unpublish. DELETE: remove it.
export const runtime = 'nodejs';

import 'server-only';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { gatedAdmin, gatedSuperadmin } from '@/lib/server/tamani/admin/gate';
import { blogRead, blogWrite } from '@/lib/server/tamani/admin/blog-routes';
import { BlogError, adminPost, deletePost, savePost } from '@/lib/server/tamani/blog';
import { BlogPostInput } from '@/lib/tamani/blog';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  return blogRead(
    req,
    async () => await gatedAdmin('ADMIN'),
    async () => {
      const post = await adminPost(prisma, id);
      if (!post) throw new BlogError('BLOG_NOT_FOUND', 404);
      return { post };
    },
  );
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  return blogWrite(
    req,
    async () => await gatedSuperadmin(),
    BlogPostInput,
    async (tx, input, adminId) => {
      const row = await savePost(tx, { id, input, adminId, now: new Date() });
      return {
        json: { post: { id: row.id, slug: row.slug, status: row.status } },
        journal: {
          action: 'blog.post_update',
          targetType: 'BlogPost',
          targetId: row.id,
          metadata: { slug: row.slug, status: row.status },
        },
      };
    },
  );
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  return blogWrite(
    req,
    async () => await gatedSuperadmin(),
    null,
    async (tx) => {
      const gone = await deletePost(tx, id);
      return {
        json: { deleted: true },
        journal: {
          action: 'blog.post_delete',
          targetType: 'BlogPost',
          targetId: id,
          metadata: { slug: gone.slug },
        },
      };
    },
  );
}
