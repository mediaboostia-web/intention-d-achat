import { describe, expect, it } from 'vitest';
import { WAITLIST_CHANNELS, WaitlistInput, cleanSource, waitlistChannelLabel } from './waitlist';

const VALID = {
  firstName: 'Awa',
  phone: '01 97 00 00 00',
  country: 'BJ',
  email: '',
  channels: ['CHAINE_WHATSAPP', 'TIKTOK'],
  consent: true,
};

describe('cleanSource', () => {
  it('keeps a short tag of letters, digits and dashes, in lower case', () => {
    expect(cleanSource('TikTok-J01')).toBe('tiktok-j01');
    expect(cleanSource('dm')).toBe('dm');
  });

  it('drops anything else', () => {
    expect(cleanSource('<script>')).toBeNull();
    expect(cleanSource('x'.repeat(41))).toBeNull();
    expect(cleanSource('')).toBeNull();
    expect(cleanSource(3)).toBeNull();
    expect(cleanSource(null)).toBeNull();
  });
});

describe('WaitlistInput', () => {
  it('accepts a first name with a WhatsApp, or with an e-mail', () => {
    expect(WaitlistInput.safeParse(VALID).success).toBe(true);
    expect(WaitlistInput.safeParse({ ...VALID, phone: '', email: 'awa@test.local' }).success).toBe(
      true,
    );
  });

  it('turns empty fields into null and cleans the e-mail', () => {
    const r = WaitlistInput.parse({ ...VALID, email: '  Awa@Test.Local ' });
    expect(r.email).toBe('awa@test.local');
    expect(WaitlistInput.parse(VALID).email).toBeNull();
    expect(WaitlistInput.parse({ ...VALID, phone: '', email: 'a@b.co' }).phone).toBeNull();
  });

  it('refuses no contact, no consent, an empty name, a bad e-mail or channel', () => {
    for (const bad of [
      { ...VALID, phone: '', email: '' },
      { ...VALID, consent: false },
      { ...VALID, firstName: '  ' },
      { ...VALID, firstName: 'x'.repeat(41) },
      { ...VALID, email: 'pas-un-email' },
      { ...VALID, channels: ['SNAPCHAT'] },
    ]) {
      expect(WaitlistInput.safeParse(bad).success, JSON.stringify(bad)).toBe(false);
    }
  });
});

describe('waitlist channels', () => {
  it('names each place a seller sells', () => {
    expect(WAITLIST_CHANNELS.map(waitlistChannelLabel)).toEqual([
      'Chaîne WhatsApp',
      'Groupe WhatsApp',
      'TikTok',
      'Facebook',
      'Instagram',
      'Boutique physique',
    ]);
  });
});
