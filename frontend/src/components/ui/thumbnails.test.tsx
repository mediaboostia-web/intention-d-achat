import { describe, it, expect } from 'vitest';
import { Avatar, CampaignCard, ProductCard } from '.';
import { html } from './test-html';

// Small pictures ask Cloudinary for a small copy: an original upload can
// weigh megabytes and is paid for at every view (margin rule, lot 5b).
const UPLOADED = 'https://res.cloudinary.com/demo/image/upload/v1/tamani/m1.jpg';
const SMALL =
  'https://res.cloudinary.com/demo/image/upload/c_fill,g_auto,w_128,h_128,f_auto,q_auto/v1/tamani/m1.jpg';
const src = (out: string) => out.match(/<img[^>]*src="([^"]+)"/)?.[1];

describe('thumbnails', () => {
  it('the avatar asks for a small square of the logo', () => {
    expect(src(html(<Avatar name="Diallo Import" src={UPLOADED} />))).toBe(SMALL);
  });

  it('a product line asks for a small square of its photo', () => {
    const product = {
      name: 'Marmites inox 5 L',
      unitLabel: 'pièce',
      unitPrice: 7500,
      wholesalePrice: null,
      wholesaleMinQty: null,
      photos: [UPLOADED],
      archivedAt: null,
    };
    expect(src(html(<ProductCard product={product} layout="list" />))).toBe(SMALL);
  });

  it('a campaign line asks for a small square of its photo', () => {
    const campaign = {
      title: 'Marmites inox 5 L',
      status: 'ACTIVE' as const,
      availability: 'IN_STOCK' as const,
      availableAt: null,
      endsAt: null,
      closedAt: null,
      arrivedAt: null,
      product: { photos: [UPLOADED] },
    };
    expect(src(html(<CampaignCard campaign={campaign} layout="list" />))).toBe(SMALL);
  });
});
