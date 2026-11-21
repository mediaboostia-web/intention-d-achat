// PATCH /api/admin/blog/guides/[id] and DELETE (its articles fall back to the
// default guide), super-admin only: lot 13d.
export const runtime = 'nodejs';

import 'server-only';
import type { NextRequest } from 'next/server';
import { blogWrite } from '@/lib/server/tamani/admin/blog-routes';
import { deleteGuide, saveGuide } from '@/lib/server/tamani/blog';
import { BlogGuideInput } from '@/lib/tamani/blog';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  return blogWrite(req, BlogGuideInput, async (tx, input) => {
    await saveGuide(tx, { id, input });
    return {
      json: { guide: { id } },
      journal: {
        action: 'blog.guide_update',
        targetType: 'BlogGuide',
        targetId: id,
        metadata: { isDefault: input.isDefault },
      },
    };
  });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  return blogWrite(req, null, async (tx) => {
    await deleteGuide(tx, id);
    return {
      json: { deleted: true },
      journal: { action: 'blog.guide_delete', targetType: 'BlogGuide', targetId: id },
    };
  });
}
