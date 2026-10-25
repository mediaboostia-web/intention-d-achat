import type { MetadataRoute } from 'next';
import { colors } from '@/lib/design/tokens';

// Tamani installs as an app (porteur's feedback §2): from the home screen it
// opens on the shop space, and on an iPhone it can then receive Web Push.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tamani',
    short_name: 'Tamani',
    description: 'Ta communauté te dit combien commander.',
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
  };
}
