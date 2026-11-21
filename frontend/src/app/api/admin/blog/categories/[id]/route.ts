// PATCH /api/admin/blog/categories/[id] (rename, describe, reorder) and
// DELETE (refused while it holds articles), super-admin only: lot 13d.
export const runtime = 'nodejs';

import 'server-only';
import type { NextRequest } from 'next/server';
import { blogWrite } from '@/lib/server/tamani/admin/blog-routes';
import { deleteCategory, saveCategory } from '@/lib/server/tamani/blog';
import { BlogCategoryInput } from '@/lib/tamani/blog';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  return blogWrite(req, BlogCategoryInput, async (tx, input) => {
    const row = await saveCategory(tx, { id, input });
    return {
      json: { category: { id: row.id, slug: row.slug } },
      journal: {
        action: 'blog.category_update',
        targetType: 'BlogCategory',
        targetId: id,
        metadata: { slug: row.slug },
      },
    };
  });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  return blogWrite(req, null, async (tx) => {
    await deleteCategory(tx, id);
    return {
      json: { deleted: true },
      journal: { action: 'blog.category_delete', targetType: 'BlogCategory', targetId: id },
    };
  });
}
