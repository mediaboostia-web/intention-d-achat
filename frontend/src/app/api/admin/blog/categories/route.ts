// GET /api/admin/blog/categories (any admin), POST (super-admin): lot 13d.
export const runtime = 'nodejs';

import 'server-only';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { gatedAdmin, gatedSuperadmin } from '@/lib/server/tamani/admin/gate';
import { blogRead, blogWrite } from '@/lib/server/tamani/admin/blog-routes';
import { listCategories, saveCategory } from '@/lib/server/tamani/blog';
import { BlogCategoryInput } from '@/lib/tamani/blog';

export async function GET(req: NextRequest) {
  return blogRead(
    req,
    async () => await gatedAdmin('ADMIN'),
    async () => ({ categories: await listCategories(prisma) }),
  );
}

export async function POST(req: NextRequest) {
  return blogWrite(
    req,
    async () => await gatedSuperadmin(),
    BlogCategoryInput,
    async (tx, input) => {
      const row = await saveCategory(tx, { input });
      return {
        status: 201,
        json: { category: { id: row.id, slug: row.slug } },
        journal: {
          action: 'blog.category_create',
          targetType: 'BlogCategory',
          targetId: row.id,
          metadata: { slug: row.slug },
        },
      };
    },
  );
}
