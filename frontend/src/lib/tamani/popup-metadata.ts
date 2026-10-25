// What WhatsApp, Facebook, Telegram and X show under a shared link (spec
// §6.6, porteur's feedback §1): the product photo, then its name and price,
// then the shop. The photo is a 1200 × 630 JPEG from Cloudinary, light
// enough for WhatsApp, which drops large preview images.
import type { Metadata } from 'next';
import type { PublicCampaign } from '@/lib/server/tamani/public-campaign';
import { OG_PHOTO, cloudinaryVariant } from './cloudinary-url';
import { formatXof } from './share-message';

const NO_INDEX = { index: false, follow: false };

export function popupMetadata(c: PublicCampaign | null, appUrl: string): Metadata {
  if (!c) return { title: 'Lien introuvable · Tamani', robots: NO_INDEX };
  const base = appUrl.replace(/\/+$/, '');
  const title = `${c.product.name} · ${formatXof(c.product.unitPrice)}`;
  const description = `${c.shop.name} · ${c.availabilityText}. Réponds en 5 secondes.`;
  const photo = c.product.photos[0];
  const image = {
    url: photo ? cloudinaryVariant(photo, OG_PHOTO) : `${base}/brand/og-default.png`,
    width: 1200,
    height: 630,
    alt: c.product.name,
  };
  return {
    title,
    description,
    robots: NO_INDEX,
    openGraph: {
      type: 'website',
      siteName: 'Tamani',
      locale: 'fr_FR',
      url: `${base}/c/${c.code}`,
      title,
      description,
      images: [image],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image.url] },
  };
}
