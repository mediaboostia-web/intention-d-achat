import { describe, expect, it } from 'vitest';
import { html, text } from '@/components/ui/test-html';
import type { PublicCampaign } from '@/lib/server/tamani/public-campaign';
import { EMPTY_ANSWERS, initialPopupState, type PopupState } from '@/lib/tamani/popup-machine';
import { PhotoGallery } from './photo-gallery';
import { PopupView } from './popup-sheet';

const campaign: PublicCampaign = {
  code: 'Ab3dE7x',
  linkId: 'link_1',
  campaignId: 'camp_1',
  title: 'Marmites inox 5 L',
  status: 'ACTIVE',
  accepting: true,
  availability: 'INCOMING',
  availabilityText: 'Arrivage dans 10 jours',
  timingOptions: ['ON_ARRIVAL', 'WEEK_AFTER', 'LATER'],
  deliveryEnabled: true,
  zones: [{ id: 'zone_1', name: 'Médina' }],
  interestedCount: 64,
  stockQuantity: null,
  product: {
    id: 'prod_1',
    name: 'Marmites inox 5 L',
    description: null,
    unitLabel: 'pièce',
    unitPrice: 7500,
    wholesalePrice: 6000,
    wholesaleMinQty: 12,
    photos: ['https://res.cloudinary.com/demo/image/upload/v1/m.jpg'],
    optionLabel: null,
    options: [],
  },
  shop: {
    name: 'Diallo Import',
    slug: 'diallo-import',
    logoUrl: null,
    description: null,
    dialCode: '+221',
    country: 'SN',
    currency: 'XOF',
  },
  poweredByBadge: true,
};

const awa = { firstName: 'Awa', phoneE164: '+221771234512', phoneMasked: '77 •• •• 12' };
const start = initialPopupState({ deliveryEnabled: true, memory: null, campaignId: 'camp_1' });
const at = (step: PopupState['step'], over: Partial<PopupState> = {}): PopupState => ({
  ...start,
  step,
  ...over,
});

describe('PhotoGallery', () => {
  const photos = [
    'https://res.cloudinary.com/demo/image/upload/v1/a.jpg',
    'https://res.cloudinary.com/demo/image/upload/v1/b.jpg',
    'https://res.cloudinary.com/demo/image/upload/v1/c.jpg',
  ];
  const imgs = (out: string) => out.match(/<img [^>]*>/g) ?? [];

  it('shows every photo whole, one per view, with a dot each', () => {
    const out = html(<PhotoGallery photos={photos} name="Livre de commerce" />);
    expect(out).toContain('aria-roledescription="carrousel"');
    expect(out).toContain('aria-label="Photos de Livre de commerce"');
    expect(out).toContain('snap-mandatory');
    const tags = imgs(out);
    expect(tags).toHaveLength(3);
    expect(tags.every((t) => t.includes('object-contain'))).toBe(true);
    expect(tags[0]).toContain('alt="Livre de commerce, photo 1 sur 3"');
    expect(tags[0]).toContain('loading="eager"');
    expect(tags[0]).toMatch(/fetchPriority="high"|fetchpriority="high"/);
    expect(tags[1]).toContain('loading="lazy"');
    expect(tags[2]).toContain('loading="lazy"');
    expect(tags[2]).toContain('w_600/v1/c.jpg');
    expect(out.match(/aria-label="Photo \d"/g)).toHaveLength(3);
    expect(out.match(/aria-current="true"/g)).toHaveLength(1);
    expect(out).toContain('aria-label="Photo suivante"');
  });

  it('shows one photo without dots, and nothing without a photo', () => {
    const out = html(<PhotoGallery photos={photos.slice(0, 1)} name="Livre" />);
    expect(imgs(out)).toHaveLength(1);
    expect(out).not.toContain('aria-label="Photo 1"');
    expect(out).not.toContain('Photo suivante');
    expect(html(<PhotoGallery photos={[]} name="Livre" />)).toBe('');
  });
});

describe('PopupView: delivery elsewhere, phone country, its-me', () => {
  const yes = {
    ...start.answers,
    interested: true,
    buyerType: 'CONSUMER' as const,
    quantity: 2,
    timing: 'ON_ARRIVAL' as const,
  };

  it('offers « Autre endroit » after the zones', () => {
    const t = text(
      <PopupView
        campaign={campaign}
        state={at('delivery', { answers: { ...yes, wantsDelivery: true, zoneId: 'zone_1' } })}
      />,
    );
    expect(t).toMatch(/Médina.*Autre endroit/);
  });

  it('asks where, 80 characters at most, keeping what was typed', () => {
    const out = html(
      <PopupView
        campaign={campaign}
        state={at('delivery', {
          answers: { ...yes, wantsDelivery: true, zoneId: null, deliveryPlace: 'Lomé' },
        })}
      />,
    );
    expect(out).toContain('Où ? (quartier, ville ou pays)');
    expect(out).toContain('maxLength="80"');
    expect(out).toContain('value="Lomé"');
    expect(out).toContain('Continuer');
  });

  it('a shop without zones asks where at once', () => {
    const out = html(
      <PopupView
        campaign={{ ...campaign, zones: [] }}
        state={at('delivery', { answers: { ...yes, wantsDelivery: true, zoneId: null } })}
      />,
    );
    expect(out).toContain('Où ? (quartier, ville ou pays)');
    expect(out).not.toContain('Autre endroit');
  });

  it('lets the respondent pick the country of the number, the shop first', () => {
    const out = html(<PopupView campaign={campaign} state={at('contact')} />);
    expect(out).toContain('aria-label="Pays du numéro"');
    const options = out.match(/<option [^>]*value="([A-Z]{2})"/g) ?? [];
    expect(options[0]).toContain('value="SN"');
    expect(options.length).toBeGreaterThan(200);
    expect(out).toMatch(/<option[^>]*value="FR"[^>]*>France \(\+33\)/);
  });

  it('offers « C’est bien moi » after « pas toi ? »', () => {
    const t = text(
      <PopupView campaign={campaign} state={at('contact', { remembered: null, forgotten: awa })} />,
    );
    expect(t).toContain("C'est bien moi, Awa");
  });
});

describe('PopupView', () => {
  it('opens on the question with the product, its price and its arrival', () => {
    const t = text(<PopupView campaign={campaign} state={start} />);
    expect(t).toContain('Marmites inox 5 L');
    expect(t).toContain('7 500 FCFA pour 1 pièce');
    const gn = { ...campaign, shop: { ...campaign.shop, currency: 'GNF' } };
    expect(text(<PopupView campaign={gn} state={start} />)).toContain('7 500 FG pour 1 pièce');
    expect(t).toContain('Arrivage dans 10 jours');
    expect(t).toContain("Ça t'intéresse ?");
    expect(html(<PopupView campaign={campaign} state={start} />)).toContain('aria-pressed');
  });

  it('shows a small copy of the shop logo', () => {
    const logo = {
      ...campaign,
      shop: {
        ...campaign.shop,
        logoUrl: 'https://res.cloudinary.com/demo/image/upload/v1/logo.png',
      },
    };
    expect(html(<PopupView campaign={logo} state={start} />)).toContain(
      'src="https://res.cloudinary.com/demo/image/upload/c_fill,g_auto,w_128,h_128,f_auto,q_auto/v1/logo.png"',
    );
  });

  it('says the price for 1 unit, whatever the unit', () => {
    for (const unitLabel of ['sac', 'carton', 'kg', 'douzaine', 'boîte de 6']) {
      const c = { ...campaign, product: { ...campaign.product, unitLabel } };
      const t = text(<PopupView campaign={c} state={start} />);
      expect(t, unitLabel).toContain(`7 500 FCFA pour 1 ${unitLabel}`);
      expect(t, unitLabel).not.toMatch(/ (la|le) /);
    }
  });

  it('shows the shop description on the first step', () => {
    const described = {
      ...campaign,
      shop: { ...campaign.shop, description: 'Riz et huile en gros à la Médina.' },
    };
    expect(text(<PopupView campaign={described} state={start} />)).toContain(
      'Riz et huile en gros à la Médina.',
    );
    expect(text(<PopupView campaign={described} state={at('contact')} />)).not.toContain(
      'Riz et huile en gros à la Médina.',
    );
    expect(html(<PopupView campaign={campaign} state={start} />)).not.toContain('line-clamp-3');
  });

  it('shows the consent sentence under the number', () => {
    const t = text(<PopupView campaign={campaign} state={at('contact')} />);
    expect(t).toContain(
      'Ton numéro est partagé uniquement avec Diallo Import pour te recontacter au sujet de ce produit.',
    );
    expect(html(<PopupView campaign={campaign} state={at('contact')} />)).toContain('+221');
  });

  it('greets a remembered respondent', () => {
    const t = text(<PopupView campaign={campaign} state={at('contact', { remembered: awa })} />);
    expect(t).toContain('Tu réponds en tant que Awa · 77 •• •• 12');
    expect(t).toContain('pas toi ?');
    // The masked number never breaks across two lines on a 320 px phone.
    expect(
      html(<PopupView campaign={campaign} state={at('contact', { remembered: awa })} />),
    ).toMatch(/<span class="whitespace-nowrap">77 •• •• 12<\/span>/);
  });

  it('shows the wholesale price to a reseller', () => {
    const reseller = at('quantity', {
      answers: { ...EMPTY_ANSWERS, interested: true, buyerType: 'RESELLER' },
    });
    const t = text(<PopupView campaign={campaign} state={reseller} />);
    expect(t).toContain('Prix de gros : 6 000 FCFA dès 12');
    const gn = { ...campaign, shop: { ...campaign.shop, currency: 'GNF' } };
    const gnText = text(<PopupView campaign={gn} state={reseller} />);
    expect(gnText).toContain('Prix de gros : 6 000 FG dès 12');
    expect(gnText).not.toContain('FCFA');
    for (const n of ['6', '12', '24', '50']) expect(t).toContain(n);
  });

  it('asks for the option before the quantity', () => {
    const withOptions = {
      ...campaign,
      product: { ...campaign.product, optionLabel: 'Couleur', options: ['Rouge', 'Noir'] },
    };
    const consumer = at('quantity', {
      answers: { ...EMPTY_ANSWERS, interested: true, buyerType: 'CONSUMER' },
    });
    const out = html(<PopupView campaign={withOptions} state={consumer} />);
    expect(text(<PopupView campaign={withOptions} state={consumer} />)).toContain(
      "Choisis d'abord : couleur",
    );
    expect(out.match(/<button[^>]*disabled=""/g)?.length).toBe(5);
    const chosen = { ...consumer, answers: { ...consumer.answers, option: 'Rouge' } };
    expect(text(<PopupView campaign={withOptions} state={chosen} />)).not.toContain(
      "Choisis d'abord",
    );
  });

  it('keeps the page on one screen: the photos keep their height, the sheet scrolls', () => {
    const out = html(<PopupView campaign={campaign} state={start} />);
    expect(out).toMatch(/<main[^>]*class="[^"]*\bh-dvh\b/);
    expect(out).toContain('h-[38dvh]');
    expect(out).toContain('max-h-[calc(62dvh-6.5rem)]');
    expect(out).toContain('overflow-y-auto');
    const bare = html(
      <PopupView
        campaign={{ ...campaign, product: { ...campaign.product, photos: [] } }}
        state={start}
      />,
    );
    expect(bare).not.toContain('carrousel');
    expect(bare).toContain('max-h-[calc(100dvh-6.5rem)]');
  });

  const saidYes = at('thanks', {
    remembered: awa,
    answers: {
      ...EMPTY_ANSWERS,
      interested: true,
      buyerType: 'CONSUMER',
      quantity: 3,
      timing: 'ON_ARRIVAL',
      wantsDelivery: false,
    },
  });
  const saidNo = at('thanks', {
    remembered: awa,
    answers: { ...EMPTY_ANSWERS, interested: false, notInterestedReason: 'TOO_EXPENSIVE' },
  });
  const buttons = (out: string) =>
    [...out.matchAll(/<button [^>]*>(.*?)<\/button>/g)].map((m) => m[1]);

  it('after a yes, a dialog says the order is recorded and the shop will confirm', () => {
    const out = html(<PopupView campaign={campaign} state={saidYes} />);
    const dialog = out.match(/<div [^>]*role="dialog"[^>]*>/)?.[0] ?? '';
    expect(dialog).toContain('aria-modal="true"');
    expect(dialog).toContain('aria-labelledby="popup-thanks-title"');
    const t = text(<PopupView campaign={campaign} state={saidYes} />);
    expect(t).toContain("C'est noté, Awa !");
    expect(t).toContain('Ta commande de 3 pièces de Marmites inox 5 L est bien enregistrée.');
    expect(t).toContain('Diallo Import va te contacter sur WhatsApp pour la confirmer.');
    expect(t).toContain('Tu passes récupérer.');
    expect(buttons(out)).toEqual(expect.arrayContaining(['Fermer', 'Modifier ma réponse']));
    // The sheet behind is out of reach while the dialog is open.
    expect(out).toMatch(/<div [^>]*inert=""/);
  });

  it('after a no, the dialog thanks for the opinion and offers to change one’s mind', () => {
    const out = html(<PopupView campaign={campaign} state={saidNo} />);
    const t = text(<PopupView campaign={campaign} state={saidNo} />);
    expect(t).toContain('Merci pour ton avis !');
    expect(t).toContain('Diallo Import en tient compte pour ses prochains arrivages.');
    expect(buttons(out)).toEqual(
      expect.arrayContaining(['Fermer', 'En fait, ça m&#x27;intéresse']),
    );
    expect(t).not.toContain('Modifier ma réponse');
  });

  it('keeps the end dialog compact on a short screen and breaks a long first name', () => {
    const long = { ...awa, firstName: 'A'.repeat(40) };
    const out = html(<PopupView campaign={campaign} state={{ ...saidYes, remembered: long }} />);
    const title = out.match(/<h2 [^>]*id="popup-thanks-title"[^>]*>/)?.[0] ?? '';
    expect(title).toContain('break-words');
    expect(title).toContain('[@media(max-height:640px)]:text-2xl');
    expect(out).toMatch(/class="[^"]*\[@media\(max-height:640px\)\]:size-12/);
    expect(out).toMatch(/id="popup-thanks-body" class="[^"]*break-words/);
  });

  it('offers to close the page once the answer is sent', () => {
    // When the browser keeps the page open, say so instead of a dead button.
    const out = html(<PopupView campaign={campaign} state={saidYes} left />);
    expect(text(<PopupView campaign={campaign} state={saidYes} left />)).toContain(
      "C'est noté. Tu peux fermer cette page.",
    );
    expect(buttons(out)).not.toContain('Fermer');
    expect(html(<PopupView campaign={campaign} state={at('contact')} />)).not.toContain(
      'role="dialog"',
    );
  });

  it('says the campaign is over and shows no choice', () => {
    const closed = { ...campaign, status: 'CLOSED' as const, accepting: false };
    expect(text(<PopupView campaign={closed} state={start} />)).toContain(
      'Cette campagne est terminée',
    );
    expect(html(<PopupView campaign={closed} state={start} />)).not.toContain('aria-pressed');
    const draft = { ...campaign, status: 'DRAFT' as const, accepting: false };
    expect(text(<PopupView campaign={draft} state={start} />)).toContain(
      "Cette campagne n'est pas encore ouverte.",
    );
  });

  it('links Propulsé par Tamani to the app, in a new tab, on the free plan', () => {
    const out = html(<PopupView campaign={campaign} state={start} homeUrl="https://tamani.app" />);
    const link = (out.match(/<a [^>]*>/g) ?? []).find((a) => a.includes('?ref=diallo-import'));
    expect(link).toContain('href="https://tamani.app/?ref=diallo-import"');
    expect(link).toContain('target="_blank"');
    expect(link).toContain('rel="noopener"');
    const paid = { ...campaign, poweredByBadge: false };
    expect(text(<PopupView campaign={paid} state={start} />)).not.toContain('Propulsé par Tamani');
  });

  it('shows the counter from 3 interested', () => {
    expect(
      text(<PopupView campaign={{ ...campaign, interestedCount: 2 }} state={start} />),
    ).not.toContain('intéressées');
    expect(text(<PopupView campaign={campaign} state={start} />)).toContain(
      '64 personnes sont déjà intéressées',
    );
  });

  it('shows the stock only when the campaign shows it, as « N en stock »', () => {
    const stocked = { ...campaign, stockQuantity: 200 };
    expect(text(<PopupView campaign={stocked} state={start} />)).toContain('200 pièces en stock');
    expect(text(<PopupView campaign={stocked} state={start} />)).not.toContain('Plus que');
    expect(html(<PopupView campaign={stocked} state={start} />)).toContain('data-picto="cartons"');
    expect(text(<PopupView campaign={campaign} state={start} />)).not.toContain('en stock');
  });

  it('draws the availability with its own picture: the stall now, the calendar later', () => {
    expect(html(<PopupView campaign={campaign} state={start} />)).toContain(
      'data-picto="calendar"',
    );
    const now = {
      ...campaign,
      availability: 'IN_STOCK' as const,
      availabilityText: 'Disponible maintenant',
    };
    expect(html(<PopupView campaign={now} state={start} />)).toContain('data-picto="stall"');
  });

  it('serves the photo at w_600', () => {
    expect(html(<PopupView campaign={campaign} state={start} />)).toContain(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_600/v1/m.jpg',
    );
  });

  it('shows an error under the choices', () => {
    expect(
      text(<PopupView campaign={campaign} state={start} error="Pas de connexion." />),
    ).toContain('Pas de connexion.');
  });
});
