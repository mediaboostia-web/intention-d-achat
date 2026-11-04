import { describe, expect, it } from 'vitest';
import { html, text } from './test-html';
import {
  BillingSkeleton,
  CardsSkeleton,
  DetailSkeleton,
  FormSkeleton,
  HomeSkeleton,
  NotificationsSkeleton,
  RowsSkeleton,
  ShopSkeleton,
  Skeleton,
  TableSkeleton,
} from './Skeleton';

// Porteur, 2026-11-04: « Ajouter des Skeleton Loader complete ». Every
// loading screen shows grey blocks in the shape of what is coming, and says
// once, to a screen reader only, what is loading.

const count = (out: string, needle: string) => out.split(needle).length - 1;

describe('Skeleton', () => {
  it('says what is loading once, to screen readers, and hides its blocks', () => {
    const out = html(
      <Skeleton label="Chargement du client">
        <span className="h-4" />
      </Skeleton>,
    );
    expect(out).toMatch(/^<div role="status"/);
    expect(out).toContain('<span class="sr-only">Chargement du client</span>');
    expect(out).toContain('aria-hidden="true"');
    expect(out).toContain('motion-safe:animate-pulse');
    expect(text(<Skeleton label="Chargement du client" />)).toBe('Chargement du client');
  });

  it('every shape shows no text but its label', () => {
    const shapes = [
      <HomeSkeleton key="home" />,
      <CardsSkeleton key="cards" label="L" layout="card" />,
      <CardsSkeleton key="list" label="L" layout="list" />,
      <RowsSkeleton key="rows" label="L" />,
      <DetailSkeleton key="detail" label="L" tabs={4} />,
      <FormSkeleton key="form" label="L" />,
      <BillingSkeleton key="billing" />,
      <NotificationsSkeleton key="notifications" />,
      <TableSkeleton key="table" label="L" />,
      <ShopSkeleton key="shop" />,
    ];
    for (const shape of shapes) {
      const out = html(shape);
      expect(out).toContain('role="status"');
      expect(out).toContain('motion-safe:animate-pulse');
      expect(text(shape)).toMatch(/^(?:L|Chargement[^<]*)$/);
    }
  });
});

describe('shapes', () => {
  it('cards: a 16:7 photo band per card, in the card grid', () => {
    const out = html(<CardsSkeleton label="L" layout="card" count={3} />);
    expect(count(out, 'aspect-[16/7]')).toBe(3);
    expect(out).toContain('minmax(240px,1fr)');
  });

  it('list: one framed list, a 44px thumbnail per line', () => {
    const out = html(<CardsSkeleton label="L" layout="list" count={5} />);
    expect(count(out, 'size-11')).toBe(5);
    expect(out).toContain('divide-y-2');
    expect(out).not.toContain('aspect-[16/7]');
  });

  it('rows: a round avatar per line', () => {
    expect(count(html(<RowsSkeleton label="L" count={4} />), 'rounded-full')).toBe(4);
    expect(html(<RowsSkeleton label="L" count={2} avatar={false} />)).not.toContain('rounded-full');
  });

  it('detail: the title, then one block per tab', () => {
    const out = html(<DetailSkeleton label="L" tabs={5} />);
    expect(count(out, 'data-bone="tab"')).toBe(5);
    expect(html(<DetailSkeleton label="L" />)).not.toContain('data-bone="tab"');
  });

  it('form: a label and a field per line, then the button', () => {
    const out = html(<FormSkeleton label="L" fields={4} />);
    expect(count(out, 'data-bone="field"')).toBe(4);
    expect(count(out, 'data-bone="button"')).toBe(1);
  });

  it('table: a header and the rows, each with its cells', () => {
    const out = html(<TableSkeleton label="L" rows={3} cols={4} />);
    expect(count(out, 'data-bone="cell"')).toBe(16);
  });

  it('home, pass and bell say what they load', () => {
    expect(text(<HomeSkeleton />)).toBe("Chargement de l'accueil");
    expect(text(<BillingSkeleton />)).toBe('Chargement de ton pass');
    expect(text(<NotificationsSkeleton />)).toBe('Chargement des notifications');
  });

  it('the shop gate shows the notebook cover from 1024px, folded with the sidebar', () => {
    const out = html(<ShopSkeleton />);
    expect(text(<ShopSkeleton />)).toBe('Chargement de ta boutique');
    expect(out).toMatch(/class="bg-cover hidden w-\[248px\][^"]*lg:block collapsed:w-\[84px\]"/);
  });
});
