// The platform's own details (lot 13a): the name in e-mails, the contact
// address, the support and community links, the social pages and the
// presentation video. A SUPERADMIN edits them in /support-admin/parametres;
// the public site reads them. Pure and shared with the browser.
import { z } from 'zod';
import {
  LANDING_CONTACT_EMAIL,
  LANDING_LINKS,
  LANDING_VIDEO,
  type LandingLinks,
  type LandingVideo,
} from './landing';

export interface PlatformSettings {
  displayName: string;
  contactEmail: string;
  links: LandingLinks;
  video: LandingVideo | null;
}

/** The Prisma row, written out so the browser never imports @prisma/client. */
export interface PlatformSettingRow {
  id: string;
  displayName: string;
  contactEmail: string;
  whatsappContact: string | null;
  community: string | null;
  facebook: string | null;
  instagram: string | null;
  tiktok: string | null;
  videoUrl: string | null;
  captionsUrl: string | null;
  updatedAt: Date;
  updatedById: string | null;
}

export const PLATFORM_SETTING_ID = 'platform';

/** No row yet: the constants that shipped with lot 12. */
export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  displayName: 'Tamani',
  contactEmail: LANDING_CONTACT_EMAIL,
  links: LANDING_LINKS,
  video: LANDING_VIDEO,
};

/** The hosts each link may point to, https only, so no link can carry a script. */
export const LINK_HOSTS = {
  whatsappContact: ['wa.me', 'api.whatsapp.com'],
  community: ['chat.whatsapp.com', 'whatsapp.com', 'www.whatsapp.com'],
  facebook: ['facebook.com', 'www.facebook.com', 'm.facebook.com', 'fb.com'],
  instagram: ['instagram.com', 'www.instagram.com'],
  tiktok: ['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com'],
  videoUrl: ['res.cloudinary.com'],
  captionsUrl: ['res.cloudinary.com'],
} as const;

type LinkField = keyof typeof LINK_HOSTS;

function onHosts(value: string, hosts: readonly string[]): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && hosts.includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

/** A link field: blank means « none », anything else must be https on its hosts. */
const link = (field: LinkField) =>
  z
    .string()
    .trim()
    .max(300)
    .transform((s) => (s === '' ? null : s))
    .refine((s) => s === null || onHosts(s, LINK_HOSTS[field]), { message: `${field} host` })
    .nullable()
    .transform((s) => s ?? null);

export const PlatformSettingsInput = z.object({
  displayName: z.string().trim().min(1).max(40),
  contactEmail: z.email().trim().max(120),
  whatsappContact: link('whatsappContact'),
  community: link('community'),
  facebook: link('facebook'),
  instagram: link('instagram'),
  tiktok: link('tiktok'),
  videoUrl: link('videoUrl'),
  captionsUrl: link('captionsUrl'),
});
export type PlatformSettingsInput = z.infer<typeof PlatformSettingsInput>;

export function settingsFromRow(row: PlatformSettingRow | null): PlatformSettings {
  if (!row) return DEFAULT_PLATFORM_SETTINGS;
  return {
    displayName: row.displayName,
    contactEmail: row.contactEmail,
    links: {
      whatsappContact: row.whatsappContact,
      community: row.community,
      facebook: row.facebook,
      instagram: row.instagram,
      tiktok: row.tiktok,
    },
    video: row.videoUrl
      ? { src: row.videoUrl, ...(row.captionsUrl ? { captions: row.captionsUrl } : {}) }
      : null,
  };
}

export function rowFromInput(
  input: PlatformSettingsInput,
): Omit<PlatformSettingRow, 'id' | 'updatedAt' | 'updatedById'> {
  return {
    displayName: input.displayName,
    contactEmail: input.contactEmail,
    whatsappContact: input.whatsappContact,
    community: input.community,
    facebook: input.facebook,
    instagram: input.instagram,
    tiktok: input.tiktok,
    videoUrl: input.videoUrl,
    captionsUrl: input.captionsUrl,
  };
}

/** The form's starting values: the saved settings, written back as fields. */
export function inputFromSettings(
  s: PlatformSettings,
): Record<keyof PlatformSettingsInput, string> {
  return {
    displayName: s.displayName,
    contactEmail: s.contactEmail,
    whatsappContact: s.links.whatsappContact ?? '',
    community: s.links.community ?? '',
    facebook: s.links.facebook ?? '',
    instagram: s.links.instagram ?? '',
    tiktok: s.links.tiktok ?? '',
    videoUrl: s.video?.src ?? '',
    captionsUrl: s.video?.captions ?? '',
  };
}
