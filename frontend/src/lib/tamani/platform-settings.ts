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

/** The film shipped with the site: a file of public/video, by its plain name. */
const SITE_FILE = /^\/video\/[a-z0-9][a-z0-9_-]*\.(mp4|webm|vtt)$/i;
const SITE_FILE_FIELDS: readonly LinkField[] = ['videoUrl', 'captionsUrl'];

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
    .refine(
      (s) =>
        s === null ||
        onHosts(s, LINK_HOSTS[field]) ||
        (SITE_FILE_FIELDS.includes(field) && SITE_FILE.test(s)),
      { message: `${field} host` },
    )
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
      ? {
          src: row.videoUrl,
          ...(row.captionsUrl ? { captions: row.captionsUrl } : {}),
          // Only the built-in film has a measured length.
          ...(row.videoUrl === LANDING_VIDEO?.src && LANDING_VIDEO.seconds
            ? { seconds: LANDING_VIDEO.seconds }
            : {}),
        }
      : null,
  };
}

export function rowFromInput(input: PlatformSettingsInput): PlatformSettingColumns {
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

export type PlatformSettingColumns = Omit<PlatformSettingRow, 'id' | 'updatedAt' | 'updatedById'>;

/** The settings as columns: what a save is compared with when no row exists yet. */
export function columnsFromSettings(s: PlatformSettings): PlatformSettingColumns {
  return {
    displayName: s.displayName,
    contactEmail: s.contactEmail,
    whatsappContact: s.links.whatsappContact,
    community: s.links.community,
    facebook: s.links.facebook,
    instagram: s.links.instagram,
    tiktok: s.links.tiktok,
    videoUrl: s.video?.src ?? null,
    captionsUrl: s.video?.captions ?? null,
  };
}

const COLUMNS = Object.keys(PlatformSettingsInput.shape) as (keyof PlatformSettingColumns)[];

/** The names of the fields a save changes, for the journal (never their values). */
export function changedFields(
  before: PlatformSettingColumns,
  after: PlatformSettingColumns,
): (keyof PlatformSettingColumns)[] {
  return COLUMNS.filter((k) => before[k] !== after[k]);
}

/** The form's starting values: the saved settings, written back as fields. */
export function inputFromSettings(
  s: PlatformSettings,
): Record<keyof PlatformSettingsInput, string> {
  const c = columnsFromSettings(s);
  return Object.fromEntries(COLUMNS.map((k) => [k, c[k] ?? ''])) as Record<
    keyof PlatformSettingsInput,
    string
  >;
}

export type SettingsField = keyof PlatformSettingsInput;

/** The fields of the Paramètres page, in their groups, with their words. */
export const SETTINGS_GROUPS: readonly {
  title: string;
  fields: readonly {
    name: SettingsField;
    label: string;
    hint: string;
    type: 'text' | 'email' | 'url';
  }[];
}[] = [
  {
    title: 'La plateforme',
    fields: [
      {
        name: 'displayName',
        label: 'Nom de la plateforme',
        hint: 'Il signe les e-mails.',
        type: 'text',
      },
      {
        name: 'contactEmail',
        label: 'E-mail de contact',
        hint: 'Affiché en bas du site.',
        type: 'email',
      },
    ],
  },
  {
    title: 'Les liens',
    fields: [
      {
        name: 'whatsappContact',
        label: "WhatsApp de l'assistance",
        hint: 'Un lien wa.me. Il sert au bouton Aide et au site.',
        type: 'url',
      },
      {
        name: 'community',
        label: 'Groupe WhatsApp de la communauté',
        hint: "Un lien chat.whatsapp.com. Vide : le site propose l'inscription.",
        type: 'url',
      },
      {
        name: 'facebook',
        label: 'Page Facebook',
        hint: 'Vide : pas de bouton Facebook.',
        type: 'url',
      },
      {
        name: 'instagram',
        label: 'Compte Instagram',
        hint: 'Vide : pas de bouton Instagram.',
        type: 'url',
      },
      { name: 'tiktok', label: 'Compte TikTok', hint: 'Vide : pas de bouton TikTok.', type: 'url' },
    ],
  },
  {
    title: 'La vidéo de présentation',
    fields: [
      {
        name: 'videoUrl',
        label: 'Adresse de la vidéo',
        hint: "Un fichier sur res.cloudinary.com. Vide : l'affiche reste.",
        type: 'url',
      },
      {
        name: 'captionsUrl',
        label: 'Sous-titres de la vidéo',
        hint: 'Un fichier .vtt sur res.cloudinary.com.',
        type: 'url',
      },
    ],
  },
];

/** What a field says when the check refuses it. */
export function settingsFieldError(name: SettingsField): string {
  if (name === 'displayName') return 'De 1 à 40 caractères.';
  if (name === 'contactEmail') return 'Une adresse e-mail valide.';
  return `Un lien qui commence par https://${LINK_HOSTS[name][0]}/`;
}
