// GET /api/shops/[orgId]/exports/numbers — the numbers an export keeps,
// each once, to paste into a WhatsApp broadcast list for a follow-up
// (lot 6b, retours §6), 5 000 at most. Same plan rule as the file.
export const runtime = 'nodejs';

import 'server-only';
import { prisma } from '@/lib/server/prisma';
import { tamaniError } from '@/lib/server/tamani/errors';
import { exportNumbers, exportScopeError } from '@/lib/server/tamani/exports';
import { jsonOk, validationFailed } from '@/lib/server/tamani/http';
import { shopHandler } from '@/lib/server/tamani/route';
import { shopPlan } from '@/lib/server/tamani/shop';
import { parseExportSearch } from '@/lib/tamani/export-view';

export const GET = shopHandler('MEMBER', async (req, { params }) => {
  const query = parseExportSearch(new URL(req.url).searchParams);
  if (!query) return validationFailed();
  const now = new Date();
  const plan = await shopPlan(prisma, params.orgId, now);
  if (!plan.features.csvExport || !plan.features.respondentContacts) {
    return tamaniError('PLAN_FEATURE_LOCKED', 403);
  }
  const scope = await exportScopeError(prisma, params.orgId, query);
  if (scope) return tamaniError(scope, 404);
  return jsonOk({ numbers: await exportNumbers(prisma, params.orgId, query, now) });
});
