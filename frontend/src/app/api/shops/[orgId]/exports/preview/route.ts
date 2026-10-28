// GET /api/shops/[orgId]/exports/preview — the first 10 rows of an export
// and its total (lot 6b, retours §6), on every plan: the numbers stay
// masked on a plan without contacts.
export const runtime = 'nodejs';

import 'server-only';
import { prisma } from '@/lib/server/prisma';
import { tamaniError } from '@/lib/server/tamani/errors';
import { exportScopeError, previewExport } from '@/lib/server/tamani/exports';
import { jsonOk, validationFailed } from '@/lib/server/tamani/http';
import { shopHandler } from '@/lib/server/tamani/route';
import { shopPlan } from '@/lib/server/tamani/shop';
import { parseExportSearch } from '@/lib/tamani/export-view';

export const GET = shopHandler('MEMBER', async (req, { params }) => {
  const query = parseExportSearch(new URL(req.url).searchParams);
  if (!query) return validationFailed();
  const scope = await exportScopeError(prisma, params.orgId, query);
  if (scope) return tamaniError(scope, 404);
  const now = new Date();
  const plan = await shopPlan(prisma, params.orgId, now);
  return jsonOk(
    await previewExport(prisma, params.orgId, query, {
      canSeeContacts: plan.features.respondentContacts,
      now,
    }),
  );
});
