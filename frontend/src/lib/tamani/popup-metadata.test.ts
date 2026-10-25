import { describe, expect, it } from 'vitest';
import type { PublicCampaign } from '@/lib/server/tamani/public-campaign';
import { popupMetadata } from './popup-metadata';

const campaign = {
  code: 'Ab3dE7x',
  availabilityText: 'Arrivage dans 10 jours',
  product: {
    name: 'Marmites inox 5 L',
    unitPrice: 7500,
    photos: ['https://res.cloudinary.com/demo/image/upload/v1/m.jpg'],
  },
  shop: { name: 'Diallo Import' },
} as unknown as PublicCampaign;

describe('popupMetadata', () => {
  it('previews the product photo, its name, its price and the shop', () => {
    const m = popupMetadata(campaign, 'https://tamani.app');
    expect(m.title).toBe('Marmites inox 5 L · 7 500 FCFA');
    expect(m.description).toBe('Diallo Import · Arrivage dans 10 jours. Réponds en 5 secondes.');
    expect(m.openGraph).toMatchObject({
      type: 'website',
      siteName: 'Tamani',
      locale: 'fr_FR',
      url: 'https://tamani.app/c/Ab3dE7x',
      title: 'Marmites inox 5 L · 7 500 FCFA',
      images: [
        {
          url: 'https://res.cloudinary.com/demo/image/upload/c_fill,g_auto,w_1200,h_630,f_jpg,q_auto/v1/m.jpg',
          width: 1200,
          height: 630,
          alt: 'Marmites inox 5 L',
        },
      ],
    });
    expect(m.twitter).toMatchObject({ card: 'summary_large_image' });
    expect(m.robots).toMatchObject({ index: false, follow: false });
  });

  it('falls back to the brand image without a photo', () => {
    const bare = { ...campaign, product: { ...campaign.product, photos: [] } };
    const m = popupMetadata(bare, 'https://tamani.app/');
    expect(m.openGraph).toMatchObject({
      url: 'https://tamani.app/c/Ab3dE7x',
      images: [{ url: 'https://tamani.app/brand/og-default.png', width: 1200, height: 630 }],
    });
  });

  it('names an unknown link without leaking anything', () => {
    const m = popupMetadata(null, 'https://tamani.app');
    expect(m.title).toBe('Lien introuvable · Tamani');
    expect(m.robots).toMatchObject({ index: false, follow: false });
    expect(m.openGraph).toBeUndefined();
  });
});
