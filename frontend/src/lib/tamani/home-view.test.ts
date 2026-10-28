import { describe, it, expect } from 'vitest';
import {
  activityLine,
  campaignVerdictLine,
  greeting,
  onboardingSteps,
  todoLine,
  upcomingLine,
  verdictCalc,
  verdictGauge,
  type ActivityItem,
  type CampaignBulletinItem,
} from './home-view';

const at = (hour: number) => new Date(2026, 9, 25, hour, 0, 0);

const response = (
  over: Partial<Extract<ActivityItem, { kind: 'RESPONSE' }>> = {},
): ActivityItem => ({
  kind: 'RESPONSE',
  id: 'resp_1',
  at: '2026-10-25T10:00:00.000Z',
  campaignId: 'c1',
  productName: 'Riz parfumé',
  unitLabel: 'pièce',
  locked: false,
  interested: true,
  quantity: 3,
  ...over,
});

describe('greeting', () => {
  it('greets by the hour', () => {
    expect(greeting('Fatou', 'Diallo Import', at(9))).toBe('Bonjour, Fatou');
    expect(greeting('Fatou', 'Diallo Import', at(12))).toBe('Bon après-midi, Fatou');
    expect(greeting('Fatou', 'Diallo Import', at(18))).toBe('Bonsoir, Fatou');
    expect(greeting('Fatou', 'Diallo Import', at(2))).toBe('Bonsoir, Fatou');
    expect(greeting('Fatou', 'Diallo Import', at(5))).toBe('Bonjour, Fatou');
  });

  it('greets the shop when the account has no name', () => {
    expect(greeting(null, 'Diallo Import', at(9))).toBe('Bonjour, Diallo Import');
  });
});

describe('activityLine', () => {
  it('a yes shows its quantity in green', () => {
    expect(activityLine(response())).toMatchObject({
      title: 'Riz parfumé',
      amount: '3 pièces',
      tone: 'yes',
      href: '/app/campagnes/c1',
    });
    expect(activityLine(response({ quantity: 1 })).amount).toBe('1 pièce');
  });

  it('a no says non in red', () => {
    expect(activityLine(response({ interested: false, quantity: null }))).toMatchObject({
      amount: 'non',
      tone: 'no',
      href: '/app/campagnes/c1',
    });
  });

  it('a locked answer hides its content', () => {
    const line = activityLine(response({ locked: true, interested: null, quantity: null }));
    expect(line).toMatchObject({
      title: 'Réponse en attente',
      detail: 'Forfait du mois plein',
      amount: null,
      tone: 'neutral',
      icon: 'lock',
    });
    expect(JSON.stringify(line)).not.toContain('Riz');
  });

  it('a new client opens the client page', () => {
    const client: ActivityItem = {
      kind: 'NEW_CLIENT',
      id: 'r1',
      at: '2026-10-25T10:00:00.000Z',
      respondentId: 'r1',
      firstName: 'Awa',
    };
    expect(activityLine(client)).toMatchObject({ title: 'Awa', href: '/app/clients/r1' });
    expect(activityLine({ ...client, firstName: null }).title).toBe('Nouveau client');
  });
});

describe('upcomingLine', () => {
  const now = new Date('2026-10-25T12:00:00Z');
  it('upcomingLine says tomorrow and in N days', () => {
    const end = { kind: 'ENDS' as const, campaignId: 'c1', title: 'Riz parfumé' };
    expect(upcomingLine({ ...end, at: '2026-10-26T08:00:00.000Z' }, now)).toEqual({
      title: 'Fin de Riz parfumé',
      when: 'demain',
      href: '/app/campagnes/c1',
    });
    expect(
      upcomingLine({ ...end, kind: 'ARRIVES', at: '2026-11-04T12:00:00.000Z' }, now),
    ).toMatchObject({ title: 'Arrivage de Riz parfumé', when: 'dans 10 jours' });
    expect(upcomingLine({ ...end, at: '2026-10-25T23:00:00.000Z' }, now).when).toBe("aujourd'hui");
  });
});

describe('onboardingSteps', () => {
  it('onboardingSteps marks what is done', () => {
    expect(onboardingSteps({ hasProduct: true, hasCampaign: false })).toEqual([
      { label: 'Ajoute un produit', href: '/app/produits/nouveau', done: true },
      { label: 'Crée et partage une campagne', href: '/app/campagnes/nouvelle', done: false },
    ]);
  });
});

describe('campaignVerdictLine', () => {
  const item = (over: Partial<CampaignBulletinItem> = {}): CampaignBulletinItem => ({
    id: 'c1',
    title: 'Riz parfumé',
    unitLabel: 'sac',
    completed: 34,
    verdict: 'GO',
    realistic: 120,
    reference: 130,
    offered: false,
    availability: 'INCOMING',
    interested: 20,
    stockStatus: null,
    restock: null,
    ...over,
  });

  it('says how much to order, in the verdict tone', () => {
    expect(campaignVerdictLine(item())).toEqual({
      title: 'Riz parfumé',
      word: 'Commande',
      figure: '~120 sacs',
      tone: 'success',
      locked: false,
      href: '/app/campagnes/c1',
    });
    expect(campaignVerdictLine(item({ verdict: 'STOP', realistic: 40 }))).toMatchObject({
      word: "N'achète pas",
      figure: '~40 sacs au plus',
      tone: 'danger',
    });
  });

  it('counts the answers while waiting', () => {
    expect(
      campaignVerdictLine(item({ verdict: 'WAIT', completed: 12, realistic: 30 })),
    ).toMatchObject({ word: 'On attend', figure: '12/20', tone: 'neutral', locked: false });
  });

  it('an in-stock campaign counts the people to serve and reads its stock', () => {
    const stock = (over: Partial<CampaignBulletinItem>) =>
      campaignVerdictLine(item({ availability: 'IN_STOCK', interested: 6, ...over }));
    expect(stock({ stockStatus: 'ENOUGH' })).toEqual({
      title: 'Riz parfumé',
      word: 'Stock suffisant',
      figure: '6 à servir',
      tone: 'success',
      locked: false,
      href: '/app/campagnes/c1',
    });
    expect(stock({ stockStatus: 'SHORTAGE', restock: 41 })).toMatchObject({
      word: 'Réassort ~40',
      tone: 'warning',
    });
    expect(stock({ verdict: null, stockStatus: null, interested: 1 })).toMatchObject({
      word: 'À servir',
      figure: '1 à servir',
      tone: 'primary',
      locked: false,
    });
  });

  it('a hidden verdict points to Pro', () => {
    expect(
      campaignVerdictLine(item({ verdict: null, realistic: null, reference: null })),
    ).toMatchObject({ word: 'Verdict avec Pro', figure: null, tone: 'neutral', locked: true });
  });
});

describe('todoLine', () => {
  it('asks to tell the interested people and opens their list', () => {
    const todo = {
      kind: 'NOTIFY_INTERESTED' as const,
      campaignId: 'c1',
      title: 'Riz parfumé',
      interested: 4,
    };
    expect(todoLine(todo)).toEqual({
      title: 'Préviens tes 4 intéressés',
      detail: 'Arrivage de Riz parfumé',
      href: '/app/campagnes/c1?onglet=interesses',
      icon: 'whatsapp',
      action: 'Écrire',
    });
    expect(todoLine({ ...todo, interested: 1 }).title).toBe('Préviens ton intéressé');
  });

  it('counts the orders to confirm and opens them', () => {
    expect(todoLine({ kind: 'CONFIRM_ORDERS', count: 3 })).toEqual({
      title: '3 commandes à confirmer',
      detail: 'Confirme-les avec tes clients',
      href: '/app/commandes?statut=a-confirmer',
      icon: 'receipt',
      action: 'Voir',
    });
    expect(todoLine({ kind: 'CONFIRM_ORDERS', count: 1 })).toMatchObject({
      title: '1 commande à confirmer',
      detail: 'Confirme-la avec ton client',
    });
  });

  it('counts the orders to deliver and their zones, and opens the rounds', () => {
    expect(todoLine({ kind: 'DELIVER', count: 5, zones: 2 })).toEqual({
      title: '5 commandes à livrer dans 2 quartiers',
      detail: 'Prépare ta tournée par quartier',
      href: '/app/commandes?vue=a-livrer',
      icon: 'truck',
      action: 'Voir',
    });
    expect(todoLine({ kind: 'DELIVER', count: 1, zones: 1 }).title).toBe(
      '1 commande à livrer dans 1 quartier',
    );
    // Orders without a zone: no zone to name.
    expect(todoLine({ kind: 'DELIVER', count: 2, zones: 0 }).title).toBe('2 commandes à livrer');
  });
});

describe('verdict tiles (lot 7a)', () => {
  const item = (over: Partial<CampaignBulletinItem>): CampaignBulletinItem => ({
    id: 'c1',
    title: 'Riz parfumé',
    unitLabel: 'sac',
    completed: 34,
    verdict: 'GO',
    realistic: 124,
    reference: 130,
    offered: false,
    availability: 'INCOMING',
    interested: 20,
    stockStatus: null,
    restock: null,
    ...over,
  });

  it('writes the calculation by hand: realistic against planned', () => {
    expect(verdictCalc(item({}))).toBe('≈ 120 réalistes sur 130 prévus');
    expect(verdictCalc(item({ realistic: 12, reference: 40 }))).toBe(
      '≈ 12 réalistes sur 40 prévus',
    );
  });

  it('counts the answers while the verdict waits', () => {
    expect(verdictCalc(item({ verdict: 'WAIT', completed: 11 }))).toBe('11 réponses sur 20');
    expect(verdictCalc(item({ verdict: 'WAIT', completed: 1 }))).toBe('1 réponse sur 20');
    expect(verdictGauge(item({ verdict: 'WAIT', completed: 11 }))).toEqual({ value: 11, max: 20 });
  });

  it('reads the stock for an in-stock campaign', () => {
    const stock = item({
      availability: 'IN_STOCK',
      verdict: null,
      stockStatus: 'ENOUGH',
      realistic: 40,
      reference: 200,
      interested: 57,
    });
    expect(verdictCalc(stock)).toBe('57 à servir · stock 200');
    expect(verdictGauge(stock)).toEqual({ value: 40, max: 200 });
    expect(verdictCalc({ ...stock, stockStatus: null, reference: null })).toBe('57 à servir');
  });

  it('shows no calculation and no gauge behind the Pro lock', () => {
    const locked = item({ verdict: null, realistic: null, reference: null });
    expect(verdictCalc(locked)).toBeNull();
    expect(verdictGauge(locked)).toBeNull();
  });

  it('says there is nothing planned when the campaign has no reference', () => {
    const neutral = item({ verdict: 'NEUTRAL', reference: null });
    expect(verdictCalc(neutral)).toBe('≈ 120 réalistes, rien de prévu');
    expect(verdictGauge(neutral)).toBeNull();
  });
});
