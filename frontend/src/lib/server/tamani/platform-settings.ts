import 'server-only';
import type { PrismaClient } from '@prisma/client';
import { log } from '@/lib/server/observability/log';
import {
  DEFAULT_PLATFORM_SETTINGS,
  PLATFORM_SETTING_ID,
  settingsFromRow,
  type PlatformSettings,
} from '@/lib/tamani/platform-settings';

/**
 * The platform's settings (lot 13a). The public pages are built with them, so
 * an unreachable database at build time must never break the site: it falls
 * back to the constants that shipped with lot 12.
 */
export async function loadPlatformSettings(
  db: Pick<PrismaClient, 'platformSetting'>,
): Promise<PlatformSettings> {
  try {
    const row = await db.platformSetting.findUnique({ where: { id: PLATFORM_SETTING_ID } });
    return settingsFromRow(row);
  } catch (err) {
    log.warn('platform settings unavailable, using defaults', {
      code: (err as { code?: string }).code ?? 'unknown',
    });
    return DEFAULT_PLATFORM_SETTINGS;
  }
}
