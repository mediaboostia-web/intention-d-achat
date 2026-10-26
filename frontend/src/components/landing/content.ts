// What the home page shows that is not shared with other screens: its
// illustrations, the platforms of the marquee, the networks of the orbit and
// the running example.
import { formatXof } from '@/lib/tamani/share-message';
import type { PlatformSlug } from './platform-paths';

/** The porteur's ChatGPT illustrations, as public/accueil/<name>.webp (pnpm landing:images). */
export const LANDING_IMAGES = {
  hero: { width: 1254, height: 1254 },
  'video-affiche': { width: 1536, height: 1024 },
  probleme: { width: 1536, height: 1024 },
  'etape-1': { width: 1254, height: 1254 },
  'etape-2': { width: 1254, height: 1254 },
  'etape-3': { width: 1254, height: 1254 },
  avant: { width: 1536, height: 1024 },
  apres: { width: 1536, height: 1024 },
  communaute: { width: 1536, height: 1024 },
} as const;

export type LandingImageName = keyof typeof LANDING_IMAGES;

/** Where the link opens, in the marquee under the hero. */
export const MARQUEE: readonly { slug: PlatformSlug; label: string }[] = [
  { slug: 'whatsapp', label: 'WhatsApp' },
  { slug: 'telegram', label: 'Telegram' },
  { slug: 'facebook', label: 'Facebook' },
  { slug: 'messenger', label: 'Messenger' },
  { slug: 'instagram', label: 'Instagram' },
  { slug: 'tiktok', label: 'TikTok' },
  { slug: 'meta', label: 'Pubs Meta' },
  { slug: 'snapchat', label: 'Snapchat' },
  { slug: 'x', label: 'X' },
  { slug: 'youtube', label: 'YouTube' },
  { slug: 'threads', label: 'Threads' },
  { slug: 'signal', label: 'Signal' },
  { slug: 'sms', label: 'SMS' },
];

export interface OrbitNetwork {
  slug: PlatformSlug;
  label: string;
  what: string;
  /** The platform's own colour. */
  color: string;
  /** Centre of its tile on a wide screen, in % of the orbit. */
  x: number;
  y: number;
  /** How often it answers: WhatsApp brings most answers, as in real life. */
  weight: number;
}

/** Top four above the link on a phone, bottom four under it. */
export const ORBIT_NETWORKS: readonly OrbitNetwork[] = [
  {
    slug: 'whatsapp',
    label: 'WhatsApp',
    what: 'Groupes, statut et chaînes',
    color: '#25D366',
    x: 50,
    y: 9,
    weight: 34,
  },
  {
    slug: 'telegram',
    label: 'Telegram',
    what: 'Groupes et canaux',
    color: '#26A5E4',
    x: 81,
    y: 22,
    weight: 10,
  },
  {
    slug: 'facebook',
    label: 'Facebook',
    what: 'Groupes et pages',
    color: '#0866FF',
    x: 89,
    y: 50,
    weight: 12,
  },
  {
    slug: 'instagram',
    label: 'Instagram',
    what: 'Bio, stories et messages',
    color: '#FF0069',
    x: 81,
    y: 78,
    weight: 10,
  },
  {
    slug: 'meta',
    label: 'Pubs Meta',
    what: 'Tes publicités Facebook et Instagram',
    color: '#0467DF',
    x: 50,
    y: 91,
    weight: 9,
  },
  {
    slug: 'tiktok',
    label: 'TikTok',
    what: 'Bio et vidéos',
    color: '#10204A',
    x: 19,
    y: 78,
    weight: 10,
  },
  {
    slug: 'messenger',
    label: 'Messenger',
    what: 'Discussions',
    color: '#0866FF',
    x: 11,
    y: 50,
    weight: 8,
  },
  {
    slug: 'sms',
    label: 'SMS',
    what: "Pour ceux qui n'ont pas WhatsApp",
    color: '#1A73E8',
    x: 19,
    y: 22,
    weight: 7,
  },
];

/** Numbers glued together, never split across two lines. */
export const unbroken = (s: string) => s.replace(/ /g, '\u202f');

const UNSOLD = 190;
const CARTON_PRICE = 10_000;

/** The one example the whole page tells (porteur's request: no pile of examples). */
export const EXAMPLE = {
  ordered: 300,
  unsold: UNSOLD,
  advised: 120,
  cartonPriceText: unbroken(formatXof(CARTON_PRICE)),
  /** "1 900 000 FCFA" */
  blocked: unbroken(formatXof(UNSOLD * CARTON_PRICE)),
} as const;
