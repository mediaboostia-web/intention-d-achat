// GET /api/admin/blog/guides (any admin), POST (super-admin): the guides a
// reader gets for a contact, each an external link (lot 13d).
export const runtime = 'nodejs';

import 'server-only';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { gatedAdmin, gatedSuperadmin } from '@/lib/server/tamani/admin/gate';
import { blogRead, blogWrite } from '@/lib/server/tamani/admin/blog-routes';
import { listGuides, saveGuide } from '@/lib/server/tamani/blog';
import { BlogGuideInput } from '@/lib/tamani/blog';

export async function GET(req: NextRequest) {
  return blogRead(
    req,
    async () => await gatedAdmin('ADMIN'),
    async () => ({ guides: await listGuides(prisma) }),
  );
}

export async function POST(req: NextRequest) {
  return blogWrite(
    req,
    async () => await gatedSuperadmin(),
    BlogGuideInput,
    async (tx, input) => {
      const row = await saveGuide(tx, { input });
      return {
        status: 201,
        json: { guide: { id: row.id } },
        journal: {
          action: 'blog.guide_create',
          targetType: 'BlogGuide',
          targetId: row.id,
          metadata: { isDefault: input.isDefault },
        },
      };
    },
  );
}
