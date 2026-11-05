import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_PLATFORM_SETTINGS } from '@/lib/tamani/platform-settings';
import { loadPlatformSettings } from './platform-settings';

describe('loadPlatformSettings', () => {
  it('reads the single settings row', async () => {
    const findUnique = vi.fn().mockResolvedValue({
      id: 'platform',
      displayName: 'Tamani',
      contactEmail: 'contact@tamani.app',
      whatsappContact: 'https://wa.me/229',
      community: null,
      facebook: 'https://www.facebook.com/tamani',
      instagram: null,
      tiktok: null,
      videoUrl: null,
      captionsUrl: null,
      updatedAt: new Date(),
      updatedById: null,
    });
    const s = await loadPlatformSettings({ platformSetting: { findUnique } } as never);
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'platform' } });
    expect(s.links.facebook).toBe('https://www.facebook.com/tamani');
    expect(s.contactEmail).toBe('contact@tamani.app');
  });

  it('keeps the site up when the database cannot be reached', async () => {
    const findUnique = vi.fn().mockRejectedValue(new Error("Can't reach database server"));
    await expect(
      loadPlatformSettings({ platformSetting: { findUnique } } as never),
    ).resolves.toEqual(DEFAULT_PLATFORM_SETTINGS);
  });
});
