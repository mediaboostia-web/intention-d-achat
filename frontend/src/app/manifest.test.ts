import { describe, expect, it } from 'vitest';
import { colors } from '@/lib/design/tokens';
import manifest from './manifest';

describe('web app manifest', () => {
  it('installs Tamani as an app that opens on the shop space', () => {
    expect(manifest()).toMatchObject({
      name: 'Tamani',
      short_name: 'Tamani',
      start_url: '/app',
      scope: '/',
      display: 'standalone',
      lang: 'fr',
      background_color: colors.bg,
      theme_color: colors.primary,
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        {
          src: '/icons/icon-maskable-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    });
  });
});
