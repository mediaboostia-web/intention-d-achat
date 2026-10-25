import { describe, expect, it } from 'vitest';
import { cloudinaryVariant, OG_PHOTO, POPUP_PHOTO } from './cloudinary-url';

describe('cloudinaryVariant', () => {
  it('inserts the transformation after /image/upload/', () => {
    expect(
      cloudinaryVariant('https://res.cloudinary.com/demo/image/upload/v17/p/a.jpg', POPUP_PHOTO),
    ).toBe('https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_600/v17/p/a.jpg');
  });

  it('builds the 1200 × 630 JPEG of a link preview', () => {
    expect(cloudinaryVariant('https://res.cloudinary.com/demo/image/upload/a.png', OG_PHOTO)).toBe(
      'https://res.cloudinary.com/demo/image/upload/c_fill,g_auto,w_1200,h_630,f_jpg,q_auto/a.png',
    );
  });

  it('leaves a non-Cloudinary URL unchanged', () => {
    expect(cloudinaryVariant('/brand/og-default.png', OG_PHOTO)).toBe('/brand/og-default.png');
  });
});
