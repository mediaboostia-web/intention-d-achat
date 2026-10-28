// GET /api/shops/[orgId]/exports/file — the export as a CSV file Excel
// opens as is (lot 6b, retours §6), 20 000 rows at most. Needs both the
// contacts and the export of the plan: 403 PLAN_FEATURE_LOCKED otherwise.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { tamaniError } from '@/lib/server/tamani/errors';
import { exportFile, exportScopeError } from '@/lib/server/tamani/exports';
import { requestIdHeaders, validationFailed } from '@/lib/server/tamani/http';
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
  const { csv, filename } = await exportFile(prisma, params.orgId, query, now);
  return new NextResponse(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'no-store',
      ...requestIdHeaders(),
    },
  });
});
