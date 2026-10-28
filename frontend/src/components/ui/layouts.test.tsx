// Cards or list on Campagnes and Produits (lot 7a).
import { describe, expect, it } from 'vitest';
import { CampaignCard, LayoutSwitch, ProductCard } from '.';
import { html, text } from './test-html';

const UPLOADED = 'https://res.cloudinary.com/demo/image/upload/v1/tamani/m1.jpg';
const BANNER =
  'https://res.cloudinary.com/demo/image/upload/c_fill,g_auto,w_640,h_280,f_auto,q_auto/v1/tamani/m1.jpg';
const LONG = 'Marmites'.repeat(15);

const campaign = (photos: string[], title = 'Marmites inox 5 L') => ({
  title,
  status: 'ACTIVE' as const,
  availability: 'IN_STOCK' as const,
  availableAt: null,
  endsAt: null,
  closedAt: null,
  arrivedAt: null,
  product: { photos },
});

const product = (photos: string[], name = 'Marmites inox 5 L') => ({
  name,
  unitLabel: 'pièce',
  unitPrice: 7500,
  wholesalePrice: null,
  wholesaleMinQty: null,
  photos,
  archivedAt: null,
});

describe('cards', () => {
  it('a campaign card shows its photo as a banner, lazily, in a light copy', () => {
    const out = html(<CampaignCard campaign={campaign([UPLOADED])} layout="card" href="/x" />);
    const img = out.match(/<img [^>]*>/)?.[0] ?? '';
    expect(img).toContain(`src="${BANNER}"`);
    expect(img).toContain('aspect-[16/7]');
    expect(img).toContain('object-cover');
    expect(img).toContain('loading="lazy"');
    expect(text(<CampaignCard campaign={campaign([UPLOADED])} layout="card" />)).toContain(
      'En cours',
    );
  });

  it('without a photo the banner keeps its place with a picture of the product kind', () => {
    const out = html(<ProductCard product={product([])} layout="card" />);
    expect(out).not.toContain('<img');
    expect(out).toMatch(/aspect-\[16\/7\][^"]*"[^>]*>\s*<svg/);
  });

  it('a long name breaks inside the card instead of pushing the grid', () => {
    for (const out of [
      html(<CampaignCard campaign={campaign([], LONG)} layout="card" />),
      html(<ProductCard product={product([], LONG)} layout="card" />),
    ]) {
      expect(out).toMatch(new RegExp(`class="[^"]*break-words[^"]*">${LONG}<`));
      expect(out).toMatch(/^<(div|a)[^>]*class="[^"]*min-w-0/);
    }
  });
});

describe('list lines', () => {
  it('a line has a 44px thumbnail and cuts a long name', () => {
    for (const out of [
      html(<CampaignCard campaign={campaign([UPLOADED], LONG)} layout="list" />),
      html(<ProductCard product={product([UPLOADED], LONG)} layout="list" />),
    ]) {
      expect(out.match(/<img [^>]*>/)?.[0]).toContain('size-11');
      expect(out).toMatch(new RegExp(`class="[^"]*truncate[^"]*">${LONG}<`));
    }
  });
});

describe('LayoutSwitch', () => {
  it('offers Cartes and Liste, the current one pressed', () => {
    const out = html(<LayoutSwitch value="list" onChange={() => {}} />);
    expect(out).toMatch(
      /role="group"[^>]*aria-label="Affichage"|aria-label="Affichage"[^>]*role="group"/,
    );
    const buttons = out.match(/<button [^>]*>/g) ?? [];
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toContain('aria-pressed="false"');
    expect(buttons[1]).toContain('aria-pressed="true"');
    const t = text(<LayoutSwitch value="card" onChange={() => {}} />);
    expect(t).toContain('Cartes');
    expect(t).toContain('Liste');
  });
});
