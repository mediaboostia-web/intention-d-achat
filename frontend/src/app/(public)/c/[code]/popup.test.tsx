import { describe, expect, it } from 'vitest';
import { html, text } from '@/components/ui/test-html';
import type { PublicCampaign } from '@/lib/server/tamani/public-campaign';
import { EMPTY_ANSWERS, initialPopupState, type PopupState } from '@/lib/tamani/popup-machine';
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
  shop: { name: 'Diallo Import', slug: 'diallo-import', logoUrl: null, dialCode: '+221' },
  poweredByBadge: true,
};

const awa = { firstName: 'Awa', phoneE164: '+221771234512', phoneMasked: '77 •• •• 12' };
const start = initialPopupState({ deliveryEnabled: true, memory: null, campaignId: 'camp_1' });
const at = (step: PopupState['step'], over: Partial<PopupState> = {}): PopupState => ({
  ...start,
  step,
  ...over,
});

describe('PopupView', () => {
  it('opens on the question with the product, its price and its arrival', () => {
    const t = text(<PopupView campaign={campaign} state={start} />);
    expect(t).toContain('Marmites inox 5 L');
    expect(t).toContain('7 500 FCFA la pièce');
    expect(t).toContain('Arrivage dans 10 jours');
    expect(t).toContain("Ça t'intéresse ?");
    expect(html(<PopupView campaign={campaign} state={start} />)).toContain('aria-pressed');
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
  });

  it('shows the wholesale price to a reseller', () => {
    const reseller = at('quantity', {
      answers: { ...EMPTY_ANSWERS, interested: true, buyerType: 'RESELLER' },
    });
    const t = text(<PopupView campaign={campaign} state={reseller} />);
    expect(t).toContain('Prix de gros : 6 000 FCFA dès 12');
    for (const n of ['6', '12', '24', '50']) expect(t).toContain(n);
  });

  it('thanks the respondent by name and offers to edit', () => {
    const t = text(<PopupView campaign={campaign} state={at('thanks', { remembered: awa })} />);
    expect(t).toContain('Merci Awa ! Diallo Import te préviendra.');
    expect(t).toContain('Modifier ma réponse');
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

  it('links Propulsé par Tamani to /?ref={slug} on the free plan', () => {
    expect(html(<PopupView campaign={campaign} state={start} />)).toContain(
      'href="/?ref=diallo-import"',
    );
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

  it('shows the stock only when the campaign shows it', () => {
    expect(
      text(<PopupView campaign={{ ...campaign, stockQuantity: 200 }} state={start} />),
    ).toContain('Plus que 200 pièces');
    expect(text(<PopupView campaign={campaign} state={start} />)).not.toContain('Plus que');
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
