import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { html, text } from '@/components/ui/test-html';

vi.mock('@/lib/server/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/server/tamani/waitlist', () => ({ waitlistCount: vi.fn() }));

import { waitlistCount } from '@/lib/server/tamani/waitlist';
import WaitlistPage, { generateMetadata } from './page';

beforeEach(() => {
  vi.mocked(waitlistCount).mockReset().mockResolvedValue(12);
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('/liste-attente', () => {
  it('has one h1, the form, the video and the menu marking the page', async () => {
    const out = html(await WaitlistPage());
    expect(out.match(/<h1/g)).toHaveLength(1);
    expect(out).toContain('id="reserver"');
    expect(out).toContain('id="wait-firstName"');
    expect(out).toContain('id="film"');
    expect(out).toContain('id="contenu"');
    const t = text(await WaitlistPage());
    expect(t).toContain('Sache qui veut acheter, avant de commander ton stock.');
    expect(t).toContain('Ce qui change pour toi');
  });

  it('shows the counter only from 50 sellers', async () => {
    expect(text(await WaitlistPage())).not.toContain('ont déjà réservé');
    vi.mocked(waitlistCount).mockResolvedValue(50);
    expect(text(await WaitlistPage())).toContain('50 vendeurs ont déjà réservé leur place');
  });

  it('still builds when the database cannot be reached', async () => {
    vi.mocked(waitlistCount).mockRejectedValue(new Error("Can't reach database server"));
    const t = text(await WaitlistPage());
    expect(t).toContain('Réserve ta place');
    expect(t).not.toContain('ont déjà réservé');
  });

  it('has its own canonical address', () => {
    vi.stubEnv('APP_URL', 'https://tamani.app/');
    expect(generateMetadata().alternates?.canonical).toBe('https://tamani.app/liste-attente');
  });
});
