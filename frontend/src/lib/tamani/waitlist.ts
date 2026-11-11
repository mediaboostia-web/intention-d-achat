// The pre-launch waitlist (lot 14): what a seller fills in to reserve a
// place, and the words around it. Shared with the browser.
import type { Metadata } from 'next';
import { z } from 'zod';

export const WAITLIST_PATH = '/liste-attente';

// Kept here, not imported from landing.ts, which points its buttons at this page.
const trimBase = (appUrl: string) => appUrl.replace(/\/+$/, '');

export const WAITLIST_CHANNELS = [
  'CHAINE_WHATSAPP',
  'GROUPE_WHATSAPP',
  'TIKTOK',
  'FACEBOOK',
  'INSTAGRAM',
  'BOUTIQUE',
] as const;
export type WaitlistChannel = (typeof WAITLIST_CHANNELS)[number];

const CHANNEL_LABELS: Record<WaitlistChannel, string> = {
  CHAINE_WHATSAPP: 'Chaîne WhatsApp',
  GROUPE_WHATSAPP: 'Groupe WhatsApp',
  TIKTOK: 'TikTok',
  FACEBOOK: 'Facebook',
  INSTAGRAM: 'Instagram',
  BOUTIQUE: 'Boutique physique',
};

export function waitlistChannelLabel(c: string): string {
  return CHANNEL_LABELS[c as WaitlistChannel] ?? c;
}

/** The counter shows from this many sellers: a small number puts people off. */
export const WAITLIST_COUNTER_FROM = 50;

const SOURCE = /^[a-z0-9-]{1,40}$/;

/** The ?src= tag of a video or a message, or null when it is not one. */
export function cleanSource(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim().toLowerCase();
  return SOURCE.test(s) ? s : null;
}

const blankToNull = (s: string) => (s === '' ? null : s);

export const WaitlistInput = z
  .object({
    firstName: z.string().trim().min(1).max(40),
    phone: z.string().trim().max(30).default('').transform(blankToNull),
    country: z.string().trim().toUpperCase().length(2).default('BJ'),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(120)
      .default('')
      .transform(blankToNull)
      .refine((e) => e === null || z.email().safeParse(e).success, { message: 'email' }),
    channels: z.array(z.enum(WAITLIST_CHANNELS)).max(WAITLIST_CHANNELS.length).default([]),
    source: z.unknown().optional().transform(cleanSource),
    consent: z.literal(true),
    /** The honeypot: a person never sees it, a bot fills it. */
    website: z.string().max(200).optional(),
  })
  .refine((v) => v.phone !== null || v.email !== null, { message: 'contact', path: ['phone'] });
export type WaitlistInput = z.infer<typeof WaitlistInput>;

/** One seller on the list, as the support-admin shows it. */
export interface WaitlistRow {
  id: string;
  /** Rank of arrival, 1 for the first. */
  position: number;
  firstName: string;
  /** Written out (« +229 01 97 00 00 00 »), or null. */
  phone: string | null;
  email: string | null;
  channels: string[];
  source: string | null;
  createdAt: string;
}

export interface WaitlistStats {
  total: number;
  thisWeek: number;
  bySource: { source: string | null; count: number }[];
}

export const waitlistChannelsText = (channels: readonly string[]) =>
  channels.map(waitlistChannelLabel).join(', ');

export const WAITLIST_TITLE = "Liste d'attente Tamani | Accès pour les vendeurs en ligne";
export const WAITLIST_DESCRIPTION =
  "Rejoins gratuitement la liste d'attente Tamani. Sois prévenu à l'ouverture et découvre comment tester la demande avant de commander ton stock.";

export function waitlistMetadata(appUrl: string): Metadata {
  const url = `${trimBase(appUrl)}${WAITLIST_PATH}`;
  return {
    title: { absolute: WAITLIST_TITLE },
    description: WAITLIST_DESCRIPTION,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website',
      siteName: 'Tamani',
      locale: 'fr_FR',
      url,
      title: WAITLIST_TITLE,
      description: WAITLIST_DESCRIPTION,
      images: [
        { url: `${trimBase(appUrl)}/brand/og-default.png`, width: 1200, height: 630, alt: '' },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: WAITLIST_TITLE,
      description: WAITLIST_DESCRIPTION,
    },
  };
}
