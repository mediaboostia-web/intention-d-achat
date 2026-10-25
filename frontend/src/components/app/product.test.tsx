import type { ReactElement } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { ProductCard } from '@/components/ui';
import { html, text } from '@/components/ui/test-html';
import { uploadErrorMessage } from '@/lib/tamani/api-messages';
import { emptyProductForm, type ShopProduct } from '@/lib/tamani/product-form';
import { UploadError } from '@/lib/tamani/upload';
import { mockNextNavigation } from '@/test-utils/next-navigation';
import { ShopTestProvider } from '@/test-utils/shop-context';

vi.mock('next/navigation', async () => (await import('@/test-utils/next-navigation')).navigation);

const { ProductForm } = await import('./ProductForm');
const { PhotoPickerView, uploadInto } = await import('./PhotoPicker');
const { default: ProductsPage } = await import('@/app/(app)/app/produits/page');
const { default: NewProductPage } = await import('@/app/(app)/app/produits/nouveau/page');
const { default: ProductPage } = await import('@/app/(app)/app/produits/[id]/page');

const PHOTO_1 = 'https://res.cloudinary.com/demo/image/upload/v1/tamani/m1.jpg';
const PHOTO_2 = 'https://res.cloudinary.com/demo/image/upload/v1/tamani/m2.jpg';

const product: ShopProduct = {
  id: 'p1',
  name: 'Marmites inox 5 L',
  description: null,
  unitLabel: 'pièce',
  unitPrice: 7500,
  wholesalePrice: 6000,
  wholesaleMinQty: 12,
  costPrice: 5000,
  photos: [PHOTO_1],
  optionLabel: null,
  options: [],
  archivedAt: '2026-10-20T10:00:00.000Z',
  createdAt: '2026-10-01T10:00:00.000Z',
};

const tag = (out: string, id: string) =>
  (out.match(/<(?:input|textarea|select) [^>]*>/g) ?? []).find((t) => t.includes(`id="${id}"`)) ??
  '';

const form = (props: Partial<Parameters<typeof ProductForm>[0]> = {}) => (
  <ProductForm submitLabel="Ajouter le produit" onSubmit={async () => {}} {...props} />
);

describe('ProductCard', () => {
  it('ProductCard shows the price line and an Archivé badge', () => {
    const card = <ProductCard product={product} href="/app/produits/p1" />;
    const t = text(card);
    expect(t).toContain('Marmites inox 5 L');
    expect(t).toContain('7 500 FCFA (gros : 6 000 FCFA dès 12)');
    expect(t).toContain('pièce');
    expect(t).toContain('Archivé');
    const out = html(card);
    expect(out).toContain(
      'src="https://res.cloudinary.com/demo/image/upload/c_fill,g_auto,w_128,h_128,f_auto,q_auto/v1/tamani/m1.jpg"',
    );
    expect(out).toContain('href="/app/produits/p1"');
    expect(text(<ProductCard product={{ ...product, archivedAt: null }} />)).not.toContain(
      'Archivé',
    );
  });
});

describe('ProductForm', () => {
  it('shows the units as chips, the current one pressed', () => {
    const out = html(
      form({ initial: { ...emptyProductForm, unitLabel: 'carton' }, units: ['bidon de 20 L'] }),
    );
    const chips =
      out.match(/<button [^>]*aria-pressed="(?:true|false)"[^>]*>[^<]*<\/button>/g) ?? [];
    const labels = chips.map((c) => c.replace(/<[^>]+>/g, ''));
    expect(labels).toContain('pièce');
    expect(labels).toContain('bidon de 20 L');
    expect(chips.find((c) => c.endsWith('>carton</button>'))).toContain('aria-pressed="true"');
    expect(chips.find((c) => c.endsWith('>pièce</button>'))).toContain('aria-pressed="false"');
    expect(out).not.toContain('<datalist');
  });

  it('ProductForm labels the purchase price as never shown to clients', () => {
    const out = html(form());
    expect(out).toContain('for="product-cost"');
    expect(tag(out, 'product-cost')).toContain('aria-describedby="product-cost-hint"');
    expect(text(form())).toContain('Pour calculer ton bénéfice. Jamais montré à tes clients.');
    expect(tag(out, 'product-unit-price')).toContain('inputMode="numeric"');
    // The units are chips under the field (lot 5b), no longer a datalist.
    expect(out).toContain('aria-label="Unités"');
  });

  it('keeps the field order of the spec', () => {
    const out = html(form());
    const order = [
      'product-name',
      'product-photos',
      'product-unit-price',
      'product-unit',
      'product-wholesale',
      'product-cost',
      'product-has-options',
      'product-description',
    ].map((id) => out.indexOf(`id="${id}"`));
    expect(order.every((at) => at >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('ProductForm shows field errors under their field', () => {
    const out = html(
      form({
        errors: { unitPrice: 'Écris le prix en FCFA, sans virgule, par exemple 7 500.' },
        error: 'Le serveur ne répond pas pour le moment. Réessaie dans un instant.',
      }),
    );
    expect(tag(out, 'product-unit-price')).toContain('aria-invalid="true"');
    expect(out).toMatch(/id="product-unit-price-error"[^>]*>Écris le prix en FCFA/);
    expect(out).toMatch(/role="alert"[^>]*>.*Le serveur ne répond pas/s);
  });

  it('opens the wholesale and option sections only when they are used', () => {
    const closed = html(form({ initial: emptyProductForm }));
    expect(tag(closed, 'product-wholesale-price')).toBe('');
    expect(tag(closed, 'product-option-label')).toBe('');

    const open = html(
      form({
        initial: {
          ...emptyProductForm,
          wholesalePrice: '6 000',
          wholesaleMinQty: '12',
          optionLabel: 'Couleur',
          options: ['Rouge'],
        },
      }),
    );
    expect(tag(open, 'product-wholesale-price')).toContain('value="6 000"');
    expect(tag(open, 'product-wholesale-min')).toContain('value="12"');
    expect(tag(open, 'product-option-label')).toContain('value="Couleur"');
    expect(open).toContain('aria-label="Retirer Rouge"');
  });

  it('shows how the price will read on WhatsApp', () => {
    const t = text(
      form({
        initial: {
          ...emptyProductForm,
          unitPrice: '7.500',
          wholesalePrice: '6000',
          wholesaleMinQty: '12',
        },
      }),
    );
    expect(t).toContain('Sur WhatsApp : 7 500 FCFA (gros : 6 000 FCFA dès 12)');
  });
});

describe('PhotoPicker', () => {
  it('PhotoPicker shows the error and keeps the photos already added', async () => {
    const tooBig = uploadErrorMessage(413, 'FILE_TOO_LARGE');
    const out = html(
      <PhotoPickerView
        id="product-photos"
        label="Photos"
        value={[PHOTO_1, PHOTO_2]}
        max={6}
        sending={0}
        error={tooBig}
        onPick={() => {}}
        onRemove={() => {}}
      />,
    );
    expect(out).toContain(`src="${PHOTO_1}"`);
    expect(out).toContain(`src="${PHOTO_2}"`);
    expect(out).toMatch(/role="alert"[^>]*>Cette photo est trop lourde/);

    // The upload loop: a failing file keeps the photos before it.
    const changes: string[][] = [];
    const file = (name: string) => new File(['x'], name, { type: 'image/jpeg' });
    const upload = async (f: File) => {
      if (f.name === 'big.jpg') throw new UploadError(413, 'FILE_TOO_LARGE');
      return `https://res.cloudinary.com/demo/image/upload/v1/${f.name}`;
    };
    const error = await uploadInto(
      [PHOTO_1],
      [file('ok.jpg'), file('big.jpg')],
      6,
      upload,
      (urls) => changes.push(urls),
    );
    expect(error).toBe(tooBig);
    expect(changes.at(-1)).toEqual([
      PHOTO_1,
      'https://res.cloudinary.com/demo/image/upload/v1/ok.jpg',
    ]);
  });

  it('never uploads more photos than the field allows', async () => {
    const sent: string[] = [];
    await uploadInto(
      [PHOTO_1, PHOTO_2],
      [new File(['x'], 'a.jpg'), new File(['x'], 'b.jpg')],
      3,
      async (f) => {
        sent.push(f.name);
        return `https://res.cloudinary.com/demo/image/upload/v1/${f.name}`;
      },
      () => {},
    );
    expect(sent).toEqual(['a.jpg']);
  });
});

describe('product pages', () => {
  it('the new product page after the welcome says what comes next', () => {
    mockNextNavigation({ pathname: '/app/produits/nouveau', search: 'premier=1&zones=echec' });
    const t = text(
      <ShopTestProvider>
        <NewProductPage />
      </ShopTestProvider>,
    );
    expect(t).toContain('Ensuite : tu le mets en campagne.');
    expect(t).toContain('Ajoute-les dans Réglages.');
  });

  it('product pages use Tamani tokens only', () => {
    const palette =
      /\b(?:bg|text|border|ring|from|to|via|fill|stroke|outline|decoration)-(?:white|black|(?:slate|gray|zinc|stone|neutral|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3})\b/;
    mockNextNavigation({ pathname: '/app/produits/p1', params: { id: 'p1' } });
    const pages: ReactElement[] = [
      <ProductsPage key="list" />,
      <NewProductPage key="new" />,
      <ProductPage key="edit" />,
      <ProductCard key="card" product={product} />,
      <ProductForm key="form" submitLabel="Ajouter le produit" onSubmit={async () => {}} />,
    ];
    for (const page of pages) {
      expect(html(<ShopTestProvider>{page}</ShopTestProvider>)).not.toMatch(palette);
    }
  });
});
