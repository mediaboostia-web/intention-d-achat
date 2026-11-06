// The pre-launch waitlist (lot 14): what a seller fills in to reserve a
// place, and the words around it. Shared with the browser.
import { z } from 'zod';

export const WAITLIST_PATH = '/liste-attente';

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
