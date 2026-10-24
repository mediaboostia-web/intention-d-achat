import { describe, it, expect } from 'vitest';
import { waChatLink, waShareLink } from './wa';

describe('WhatsApp links', () => {
  it('opens a chat with a number, without the plus sign', () => {
    expect(waChatLink('+221771234567', 'Salut')).toBe('https://wa.me/221771234567?text=Salut');
    expect(waChatLink('+221771234567')).toBe('https://wa.me/221771234567');
  });

  it('encodes the message', () => {
    expect(waChatLink('+221771234567', 'Prix : 7 500 ?')).toBe(
      'https://wa.me/221771234567?text=Prix%20%3A%207%20500%20%3F',
    );
  });

  it('shares a message to a contact of your choice', () => {
    expect(waShareLink('a b')).toBe('https://wa.me/?text=a%20b');
  });
});
