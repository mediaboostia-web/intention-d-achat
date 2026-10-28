import { describe, it, expect } from 'vitest';
import {
  BottomSheet,
  CalcTable,
  DataList,
  DemandGauge,
  EmptyState,
  FilterBar,
  Icon,
  MoneyCard,
  Stamp,
  StatTile,
  StockCard,
  VerdictCard,
} from '.';
import { html, text } from './test-html';

describe('Stamp', () => {
  it('renders the word, the figure and the unit in the tone colour', () => {
    const el = <Stamp word="Commande" figure="≈120" unit="cartons" tone="success" />;
    expect(text(el)).toBe('Commande ≈120 cartons');
    const out = html(el);
    expect(out).toContain('text-success');
    expect(out).toContain('-rotate-[5deg]');
    expect(out).toMatch(/class="[^"]*\bstamp\b/);
    expect(out).toContain('border-solid');
  });

  it('is dashed for the neutral tone and keeps extra classes', () => {
    const out = html(
      <Stamp word="Attends" figure="9/20" unit="réponses" tone="neutral" className="x-y" />,
    );
    expect(out).toContain('border-dashed');
    expect(out).toContain('text-neutral-verdict');
    expect(out).toContain('x-y');
  });
});

describe('Icon', () => {
  it('draws the menu and the left chevron', () => {
    expect(html(<Icon name="menu" />)).toContain('M4 7h16M4 12h16M4 17h16');
    expect(html(<Icon name="chevron-left" />)).toContain('m14.5 5.5-6.5 6.5 6.5 6.5');
  });
});

describe('BottomSheet disables its animation under reduced motion', () => {
  it('slides up with CSS only, and not under reduced motion', () => {
    const out = html(<BottomSheet label="Ta réponse">x</BottomSheet>);
    expect(out).toContain('animate-sheet-up');
    expect(out).toContain('motion-reduce:animate-none');
    expect(out).toContain('aria-label="Ta réponse"');
  });

  it('shows the market-stall awning unless turned off', () => {
    expect(html(<BottomSheet label="a">x</BottomSheet>)).toMatch(/class="[^"]*\bawning\b/);
    expect(
      html(
        <BottomSheet label="a" awning={false}>
          x
        </BottomSheet>,
      ),
    ).not.toMatch(/class="[^"]*\bawning\b/);
  });
});

describe('VerdictCard', () => {
  const caution = (
    <VerdictCard
      code="CAUTION"
      realistic={211}
      completedResponses={94}
      reference={400}
      basis={{ low: 176, high: 246, interestedCount: 64 }}
    />
  );

  it('stamps the verdict and writes the margin note', () => {
    const t = text(caution);
    expect(t).toContain('Prudence');
    expect(t).toContain('~210');
    expect(t).toContain('Commande environ 210 pièces, pas les 400 prévues.');
    expect(t).toContain('et pas 400 !');
    expect(t).toContain("Entre 176 et 246 pièces, d'après 94 réponses dont 64 intéressés.");
    expect(html(caution)).toContain('text-warning');
    expect(html(caution)).toContain('stamp');
  });

  it('WAIT shows progress towards 20 responses', () => {
    const t = text(
      <VerdictCard code="WAIT" realistic={30} completedResponses={9} reference={400} />,
    );
    expect(t).toContain('9/20');
    expect(t).toContain('Encore 11 réponses');
  });

  it('VerdictCard keeps long figures inside the card (break-words, no fixed width)', () => {
    const el = (
      <VerdictCard
        code="CAUTION"
        realistic={1250}
        completedResponses={300}
        reference={2000}
        unitLabel="sac de 25 kg"
      />
    );
    expect(text(el)).toContain('~1250');
    expect(text(el)).toContain('sacs de 25 kg');
    expect(html(el)).toContain('break-words');
    expect(html(el)).toContain('max-w-full');
    expect(html(el)).not.toMatch(/\bw-\[/);
  });
});

describe('MoneyCard', () => {
  it('highlights the avoided dead stock and lists the expected profit', () => {
    const el = <MoneyCard avoidedDeadStock={850500} expectedProfit={444000} reference={400} />;
    const t = text(el);
    expect(t).toContain('850 500');
    expect(t).toContain('de stock qui aurait dormi au dépôt si tu commandais 400.');
    expect(t).toContain('Bénéfice attendu');
    expect(t).toContain('~444 000 FCFA');
    expect(html(el)).toContain('highlight');
  });

  it('invites to add a cost price when there is none', () => {
    const el = (
      <MoneyCard
        avoidedDeadStock={null}
        expectedProfit={null}
        addCostPriceHref="/app/produits/p1"
      />
    );
    expect(text(el)).toContain("Ajoute ton prix d'achat pour voir l'argent que tu évites.");
    expect(html(el)).toContain('href="/app/produits/p1"');
  });
});

describe('StockCard', () => {
  it('stamps the word and the figure, then the sentence and the note', () => {
    const el = (
      <StockCard
        word="Réassort"
        figure="~40"
        unit="pièces"
        sentence="Rupture probable : prévois un réassort d'environ 40 pièces."
        tone="warning"
        note="Estimation provisoire : 12 réponses sur 20."
      />
    );
    const t = text(el);
    expect(t).toContain('Réassort');
    expect(t).toContain('~40');
    expect(t).toContain("Rupture probable : prévois un réassort d'environ 40 pièces.");
    expect(t).toContain('Estimation provisoire : 12 réponses sur 20.');
    expect(html(el)).toContain('text-warning');
    expect(html(el)).toContain('aria-label="État du stock : Réassort"');
  });

  it('leaves the note out when there is none', () => {
    const el = (
      <StockCard
        word="Stock suffisant"
        figure="30"
        unit="pièces en stock"
        sentence="Il t'en restera environ 24 pièces."
        tone="success"
      />
    );
    expect(text(el)).not.toContain('provisoire');
    expect(html(el)).toContain('text-success');
  });
});

describe('DemandGauge', () => {
  it('shows the three figures, ten squares and a sentence for screen readers', () => {
    const el = <DemandGauge realistic={211} announced={350} reference={400} />;
    const markup = html(el);
    expect(text(el)).toContain('réaliste 211');
    expect(text(el)).toContain('annoncé 350');
    expect(text(el)).toContain('prévu 400');
    expect(markup.match(/rounded-case/g)).toHaveLength(10);
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toMatch(
      /class="sr-only">Demande réaliste 211, annoncée 350, pour 400 prévues\.</,
    );
  });

  it('names the reference "en stock" for an in-stock campaign', () => {
    const el = (
      <DemandGauge realistic={6} announced={12} reference={30} referenceLabel="en stock" />
    );
    expect(text(el)).toContain('en stock 30');
    expect(text(el)).not.toContain('prévu');
    expect(html(el)).toMatch(
      /class="sr-only">Demande réaliste 6, annoncée 12, pour 30 en stock\.</,
    );
  });

  it('stops the squares at the reference', () => {
    const markup = html(<DemandGauge realistic={900} announced={1200} reference={400} />);
    // Every square is full: nothing goes past the tenth.
    expect(markup.match(/var\(--color-primary\) 100%/g)).toHaveLength(10);
    expect(markup.match(/rounded-case/g)).toHaveLength(10);
  });
});

describe('FilterBar, DataList, StatTile, EmptyState, CalcTable', () => {
  it('FilterBar marks the active filter', () => {
    const out = html(
      <FilterBar
        label="Filtrer les clients"
        items={[
          { id: 'all', label: 'Tous', href: '/app/clients' },
          { id: 'res', label: 'Revendeurs', href: '/app/clients?buyerType=RESELLER', active: true },
        ]}
      />,
    );
    expect(out).toContain('aria-label="Filtrer les clients"');
    expect(out).toMatch(/<a[^>]*aria-current="true"[^>]*>Revendeurs|aria-current="true"/);
    expect(out.match(/aria-current/g)).toHaveLength(1);
  });

  it('hides a chip whose count is 0 unless it is active', () => {
    const items = [
      { id: 'all', label: 'Toutes', href: '/app/campagnes' },
      { id: 'draft', label: 'Brouillons', href: '/app/campagnes?statut=DRAFT', count: 0 },
      { id: 'live', label: 'En cours', href: '/app/campagnes?statut=ACTIVE', count: 3 },
    ];
    const t = text(<FilterBar label="Afficher" items={items} />);
    expect(t).not.toContain('Brouillons');
    expect(t).toContain('En cours 3');
    const active = items.map((i) => (i.id === 'draft' ? { ...i, active: true } : i));
    expect(text(<FilterBar label="Afficher" items={active} />)).toContain('Brouillons 0');
  });

  it('keeps the all chip and items without a count', () => {
    const t = text(
      <FilterBar
        label="Afficher"
        items={[
          { id: 'all', label: 'Tous', href: '/app/clients' },
          { id: 'x', label: 'Revendeurs', href: '/app/clients?type=revendeurs' },
        ]}
      />,
    );
    expect(t).toBe('Tous Revendeurs');
  });

  it('renders the chip icon as a pill', () => {
    const out = html(
      <FilterBar
        label="Afficher"
        items={[{ id: 'live', label: 'En cours', href: '/x', icon: 'megaphone', count: 2 }]}
      />,
    );
    expect(out).toMatch(/<a [^>]*class="[^"]*rounded-full[^"]*"[^>]*><svg[^>]*aria-hidden="true"/);
  });

  it('DataList renders label and value', () => {
    const t = text(<DataList items={[{ id: 'm', label: 'Médina', value: 24 }]} />);
    expect(t).toContain('Médina');
    expect(t).toContain('24');
  });

  it('StatTile renders its parts', () => {
    const t = text(<StatTile label="Revendeurs" value={22} hint="180 pièces annoncées" />);
    expect(t).toBe('Revendeurs 22 180 pièces annoncées');
  });

  it('EmptyState renders title, body and action', () => {
    const t = text(
      <EmptyState title="Pas encore de campagne" action={<a href="/x">Créer une campagne</a>}>
        Lance ta première campagne en 3 minutes.
      </EmptyState>,
    );
    expect(t).toContain('Pas encore de campagne');
    expect(t).toContain('Lance ta première campagne en 3 minutes.');
    expect(t).toContain('Créer une campagne');
  });

  it('CalcTable writes the coefficients the French way', () => {
    const t = text(
      <CalcTable
        rows={[
          { label: 'Revendeurs', count: 22, announced: 180, coef: 0.7, realistic: 126 },
          { label: 'Usagers', count: 42, announced: 170, coef: 0.5, realistic: 85 },
        ]}
        total={{ announced: 350, realistic: 211 }}
        footnote="0,7 : sur 10 revendeurs qui disent oui, 7 achètent vraiment."
      />,
    );
    expect(t).toContain('× 0,7');
    expect(t).toContain('× 0,5');
    expect(t).toContain('≈ 211');
    expect(t).toContain('sur 10 revendeurs');
  });
});
