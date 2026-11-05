import { describe, expect, it, vi } from 'vitest';
import { html, text } from '@/components/ui/test-html';
import type { PlatformSettings } from '@/lib/tamani/platform-settings';
import { SettingsView } from './SettingsView';

vi.mock('next/navigation', async () => (await import('@/test-utils/next-navigation')).navigation);

const SETTINGS: PlatformSettings = {
  displayName: 'Tamani',
  contactEmail: 'contact@tamani.app',
  links: {
    whatsappContact: 'https://wa.me/2290195831126',
    community: null,
    facebook: 'https://www.facebook.com/tamani',
    instagram: null,
    tiktok: null,
  },
  video: null,
};

const view = (canEdit: boolean) => (
  <SettingsView settings={SETTINGS} canEdit={canEdit} appUrl="https://tamani.app" />
);

describe('SettingsView', () => {
  it('gives a super-admin the form, every field with its label', () => {
    const out = html(view(true));
    expect(out).toContain('<form');
    for (const id of [
      'settings-displayName',
      'settings-contactEmail',
      'settings-whatsappContact',
      'settings-community',
      'settings-facebook',
      'settings-instagram',
      'settings-tiktok',
      'settings-videoUrl',
      'settings-captionsUrl',
    ]) {
      expect(out, id).toContain(`<label for="${id}"`);
      expect(out, id).toContain(`id="${id}"`);
    }
    expect(out).toContain('value="https://www.facebook.com/tamani"');
  });

  it('shows an admin the values as text, with no form', () => {
    const out = html(view(false));
    expect(out).not.toContain('<form');
    expect(out).not.toContain('<input');
    const t = text(view(false));
    expect(t).toContain('contact@tamani.app');
    expect(t).toContain('https://www.facebook.com/tamani');
    expect(t).toContain('Réservé au super-admin');
  });

  it('shows the domain as text that is changed in Vercel', () => {
    for (const canEdit of [true, false]) {
      const t = text(view(canEdit));
      expect(t).toContain('https://tamani.app');
      expect(t).toContain('Se change dans Vercel');
      expect(html(view(canEdit))).not.toContain('value="https://tamani.app"');
    }
  });
});
