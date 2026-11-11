import { describe, expect, it } from 'vitest';
import { LANDING_CONTACT_EMAIL, LANDING_LINKS, LANDING_VIDEO } from './landing';
import {
  DEFAULT_PLATFORM_SETTINGS,
  PlatformSettingsInput,
  changedFields,
  columnsFromSettings,
  rowFromInput,
  settingsFromRow,
  type PlatformSettingRow,
} from './platform-settings';

const VALID = {
  displayName: 'Tamani',
  contactEmail: 'contact@tamani.app',
  whatsappContact: 'https://wa.me/2290195831126',
  community: 'https://chat.whatsapp.com/I7fReiTTlvO8WAyAjLVEu5',
  facebook: 'https://www.facebook.com/tamani',
  instagram: 'https://www.instagram.com/tamani',
  tiktok: 'https://www.tiktok.com/@tamani',
  videoUrl: 'https://res.cloudinary.com/demo/video/upload/tamani.mp4',
  captionsUrl: '',
};

const row = (over: Partial<PlatformSettingRow> = {}): PlatformSettingRow => ({
  id: 'platform',
  displayName: 'Tamani',
  contactEmail: 'contact@tamani.app',
  whatsappContact: null,
  community: null,
  facebook: null,
  instagram: null,
  tiktok: null,
  videoUrl: null,
  captionsUrl: null,
  updatedAt: new Date('2026-11-05T10:00:00Z'),
  updatedById: null,
  ...over,
});

describe('platform settings', () => {
  it('falls back to the landing constants when nothing is saved', () => {
    expect(settingsFromRow(null)).toEqual(DEFAULT_PLATFORM_SETTINGS);
    expect(DEFAULT_PLATFORM_SETTINGS.links).toEqual(LANDING_LINKS);
    expect(DEFAULT_PLATFORM_SETTINGS.contactEmail).toBe(LANDING_CONTACT_EMAIL);
    expect(DEFAULT_PLATFORM_SETTINGS.video).toEqual(LANDING_VIDEO);
  });

  it('a saved row is the truth: an empty link hides the button', () => {
    const s = settingsFromRow(row({ whatsappContact: 'https://wa.me/229', facebook: null }));
    expect(s.links.whatsappContact).toBe('https://wa.me/229');
    expect(s.links.community).toBeNull();
    expect(s.links.facebook).toBeNull();
  });

  it('gives the video only with its address, captions with it', () => {
    expect(settingsFromRow(row()).video).toBeNull();
    expect(
      settingsFromRow(
        row({
          videoUrl: 'https://res.cloudinary.com/d/v.mp4',
          captionsUrl: 'https://res.cloudinary.com/d/v.vtt',
        }),
      ).video,
    ).toEqual({
      src: 'https://res.cloudinary.com/d/v.mp4',
      captions: 'https://res.cloudinary.com/d/v.vtt',
    });
    expect(settingsFromRow(row({ videoUrl: 'https://res.cloudinary.com/d/v.mp4' })).video).toEqual({
      src: 'https://res.cloudinary.com/d/v.mp4',
    });
  });

  it('accepts the real links and turns an empty field into null', () => {
    const parsed = PlatformSettingsInput.parse(VALID);
    expect(parsed.whatsappContact).toBe('https://wa.me/2290195831126');
    expect(parsed.tiktok).toBe('https://www.tiktok.com/@tamani');
    expect(parsed.captionsUrl).toBeNull();
    expect(PlatformSettingsInput.parse({ ...VALID, facebook: '   ' }).facebook).toBeNull();
  });

  it('refuses a link that could carry a script or lead elsewhere', () => {
    const bad: [keyof typeof VALID, string][] = [
      ['whatsappContact', 'javascript:alert(1)'],
      ['whatsappContact', 'http://wa.me/1'],
      ['whatsappContact', 'https://evil.com/wa.me'],
      ['whatsappContact', 'https://wa.me.evil.com/1'],
      ['community', 'https://wa.me/1'],
      ['facebook', 'https://www.tiktok.com/@tamani'],
      ['instagram', 'https://instagram.com.evil.com/x'],
      ['tiktok', 'data:text/html,hi'],
      ['videoUrl', 'https://youtube.com/watch?v=1'],
      ['videoUrl', '//evil.com/video/x.mp4'],
      ['videoUrl', '/video/../api/auth/me'],
      ['videoUrl', '/autre/tamani.mp4'],
      ['captionsUrl', '/video/x.vtt?next=//evil.com'],
      ['contactEmail', 'pas-un-email'],
      ['displayName', ''],
      ['displayName', 'x'.repeat(41)],
    ];
    for (const [field, value] of bad) {
      expect(
        PlatformSettingsInput.safeParse({ ...VALID, [field]: value }).success,
        `${field}=${value}`,
      ).toBe(false);
    }
  });

  // The film shipped with the site lives in public/video: saving the settings
  // untouched must not refuse it, and it keeps its real length.
  it('accepts the built-in film and keeps its length; a hosted film has none', () => {
    const builtIn = PlatformSettingsInput.safeParse({
      ...VALID,
      videoUrl: LANDING_VIDEO?.src,
      captionsUrl: LANDING_VIDEO?.captions,
    });
    expect(builtIn.success).toBe(true);
    expect(
      settingsFromRow(
        row({ videoUrl: LANDING_VIDEO!.src, captionsUrl: LANDING_VIDEO!.captions ?? null }),
      ).video,
    ).toEqual(LANDING_VIDEO);
    const hosted = settingsFromRow(row({ videoUrl: 'https://res.cloudinary.com/d/v.mp4' })).video;
    expect(hosted).not.toHaveProperty('seconds');
  });

  it('maps the form to the columns', () => {
    const r = rowFromInput(PlatformSettingsInput.parse(VALID));
    expect(r).toMatchObject({
      displayName: 'Tamani',
      contactEmail: 'contact@tamani.app',
      captionsUrl: null,
    });
    expect(r).not.toHaveProperty('id');
  });

  it('names the fields a save changes, against the defaults when nothing was saved', () => {
    const next = rowFromInput(PlatformSettingsInput.parse(VALID));
    expect(changedFields(next, next)).toEqual([]);
    expect(changedFields({ ...next, facebook: null, tiktok: null }, next)).toEqual([
      'facebook',
      'tiktok',
    ]);
    const defaults = columnsFromSettings(DEFAULT_PLATFORM_SETTINGS);
    expect(defaults.whatsappContact).toBe(LANDING_LINKS.whatsappContact);
    expect(defaults.videoUrl).toBe(LANDING_VIDEO?.src ?? null);
    expect(changedFields(defaults, { ...defaults, contactEmail: 'autre@tamani.app' })).toEqual([
      'contactEmail',
    ]);
  });
});
