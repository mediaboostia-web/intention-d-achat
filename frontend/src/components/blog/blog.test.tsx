import { describe, expect, it } from 'vitest';
import { html, text } from '@/components/ui/test-html';
import type { BlogCardView, BlogPostView } from '@/lib/tamani/blog';
import { ActionBlock, ArticleView } from './ArticleView';
import { BlogIndexView } from './BlogIndexView';

const card = (n: number, extra: Partial<BlogCardView> = {}): BlogCardView => ({
  id: `p${n}`,
  slug: `article-${n}`,
  title: `Article ${n}`,
  excerpt: `Résumé ${n}`,
  coverUrl: n === 1 ? 'https://res.cloudinary.com/x/cover.jpg' : null,
  coverAlt: n === 1 ? 'Des cartons' : null,
  readMinutes: 3,
  publishedAt: '2026-11-18T09:00:00.000Z',
  category: { slug: 'outils', name: 'Outils' },
  ...extra,
});

const GUIDE = { id: 'g1', title: 'Le guide du grossiste', description: 'Pour tester la demande.' };
const CATS = [
  { slug: 'actualites', name: 'Actualités' },
  { slug: 'outils', name: 'Outils' },
];

describe('BlogIndexView (« Magazine »)', () => {
  it('puts the newest article big, the categories as pills, then the grid and the guide band', () => {
    const out = html(
      <BlogIndexView
        posts={[card(1), card(2), card(3)]}
        total={3}
        page={1}
        categories={CATS}
        current={null}
        guide={GUIDE}
      />,
    );
    expect(out).toMatch(/<h1[^>]*>Le blog Tamani<\/h1>/);
    expect(out).toContain('class="blog-feature blog-card"');
    expect(out).toMatch(/<h2>Article 1<\/h2>/);
    expect(out).toMatch(/<h3>Article 2<\/h3>/);
    expect(out).toMatch(/<a class="blog-pill" aria-current="page" href="\/blog">Tout<\/a>/);
    expect(out).toContain('href="/blog/categorie/outils"');
    expect(out).toContain('href="/blog/article-2"');
    expect(
      text(
        <BlogIndexView
          posts={[card(1)]}
          total={1}
          page={1}
          categories={[]}
          current={null}
          guide={GUIDE}
        />,
      ),
    ).toContain('Le guide du grossiste');
  });

  it('a category: its pill is current, no big article, its name as title', () => {
    const out = html(
      <BlogIndexView
        posts={[card(1)]}
        total={1}
        page={1}
        categories={CATS}
        current={CATS[1]!}
        guide={null}
      />,
    );
    expect(out).toMatch(/<h1[^>]*>Outils<\/h1>/);
    expect(out).not.toContain('blog-feature');
    expect(out).toMatch(/aria-current="page" href="\/blog\/categorie\/outils"/);
    expect(out).not.toContain('blog-band');
  });

  it('says so when there is nothing yet, and pages beyond 12', () => {
    expect(
      text(
        <BlogIndexView posts={[]} total={0} page={1} categories={[]} current={null} guide={null} />,
      ),
    ).toContain('Les premiers articles arrivent bientôt.');
    const out = html(
      <BlogIndexView
        posts={[card(1)]}
        total={25}
        page={2}
        categories={[]}
        current={null}
        guide={null}
      />,
    );
    expect(out).toContain('href="/blog?page=3"');
    expect(out).toMatch(/aria-current="page" href="\/blog\?page=2"/);
  });
});

const POST: BlogPostView = {
  ...card(1),
  seoTitle: null,
  seoDescription: null,
  keywords: [],
  authorName: "L'équipe Tamani",
  updatedAt: '2026-11-19T09:00:00.000Z',
};

describe('ArticleView (« Discret »)', () => {
  const view = (
    guide = GUIDE as typeof GUIDE | null,
    community: string | null = 'https://chat.whatsapp.com/x',
  ) => (
    <ArticleView
      post={POST}
      html={'<h2 id="un">Un</h2><p>Texte</p>'}
      toc={[{ id: 'un', text: 'Un', level: 2 }]}
      url="https://tamani.win/blog/article-1"
      guide={guide}
      related={[card(2), card(3)]}
      signupHref="/liste-attente"
      signupLabel="Rejoindre la liste d'attente"
      community={community}
    />
  );

  it('shows the title, the reading time, the body, the table of contents and the share links', () => {
    const out = html(view());
    expect(out).toMatch(/<h1>Article 1<\/h1>/);
    expect(text(view())).toContain("Par L'équipe Tamani");
    expect(text(view())).toContain('3 min de lecture');
    expect(out).toContain('<div class="blog-prose"><h2 id="un">Un</h2><p>Texte</p></div>');
    expect(out).toContain('href="#un"');
    expect(out).toContain('href="https://wa.me/?text=');
    expect(out).toContain('facebook.com/sharer');
    expect(text(view())).toContain('À lire aussi');
  });

  it('ends on the three actions: guide, sign-up, group', () => {
    const t = text(view());
    expect(t).toContain("Passe à l'action");
    expect(t).toContain('Télécharger le guide');
    expect(html(view())).toContain('href="/liste-attente"');
    expect(t).toContain('Rejoindre le groupe');
  });

  it('a button without its target is not drawn', () => {
    const t = text(
      <ActionBlock
        guide={null}
        signupHref="/signup"
        signupLabel="Créer mon compte"
        community={null}
      />,
    );
    expect(t).not.toContain('Télécharger le guide');
    expect(t).not.toContain('Rejoindre le groupe');
    expect(t).toContain('Créer mon compte');
  });

  it('never interrupts the reading: no sticky bar, the guide window stays closed', () => {
    const out = html(view());
    expect(out).not.toMatch(/position:\s*fixed/);
    expect(out).toMatch(/<dialog(?![^>]*\bopen\b)/);
  });
});
