// GET /api/admin/settings (any admin) and PUT (super-admin), lot 13a: the
// platform's own details that the public site reads. A save is journaled with
// the names of the fields it changed, never their values, then the public
// pages are rebuilt so the new links show at once.
export const runtime = 'nodejs';

import 'server-only';
import { revalidatePath } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';
import { verifyCsrf } from '@/lib/server/auth';
import { logAdminAction } from '@/lib/server/admin/audit';
import { requireAdmin, requireSuperadmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { loadPlatformSettings } from '@/lib/server/tamani/platform-settings';
import {
  DEFAULT_PLATFORM_SETTINGS,
  PLATFORM_SETTING_ID,
  PlatformSettingsInput,
  changedFields,
  columnsFromSettings,
  rowFromInput,
  settingsFromRow,
} from '@/lib/tamani/platform-settings';

/** The pages built with the settings. */
const PUBLIC_PATHS = ['/', '/forfaits', '/llms.txt'] as const;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAdmin('ADMIN');
    if (auth instanceof NextResponse) return auth;

    const limited = await enforceAdminRateLimit(auth.admin.id);
    if (limited) return limited;

    const settings = await loadPlatformSettings(prisma);
    return NextResponse.json({ settings }, { headers: { 'x-request-id': ctx.requestId } });
  });
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await requireSuperadmin();
    if (auth instanceof NextResponse) return auth;

    const limited = await enforceAdminRateLimit(auth.admin.id);
    if (limited) return limited;

    const parsed = PlatformSettingsInput.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Invalid request body' },
        { status: 400 },
      );
    }
    const columns = rowFromInput(parsed.data);
    const row = await prisma.$transaction(async (tx) => {
      const before = await tx.platformSetting.findUnique({ where: { id: PLATFORM_SETTING_ID } });
      const saved = await tx.platformSetting.upsert({
        where: { id: PLATFORM_SETTING_ID },
        create: { id: PLATFORM_SETTING_ID, ...columns, updatedById: auth.admin.id },
        update: { ...columns, updatedById: auth.admin.id },
      });
      await logAdminAction(tx, {
        actorId: auth.admin.id,
        action: 'platform.settings_update',
        targetType: 'PlatformSetting',
        targetId: PLATFORM_SETTING_ID,
        metadata: {
          changed: changedFields(before ?? columnsFromSettings(DEFAULT_PLATFORM_SETTINGS), columns),
        },
      });
      return saved;
    });
    for (const path of PUBLIC_PATHS) revalidatePath(path);
    revalidatePath('/app', 'layout');
    return NextResponse.json(
      { settings: settingsFromRow(row) },
      { headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
