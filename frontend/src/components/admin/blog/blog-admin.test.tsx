import { describe, expect, it, vi } from 'vitest';
import { html, text } from '@/components/ui/test-html';

vi.mock('next/navigation', async () => (await import('@/test-utils/next-navigation')).navigation);

const { PostsView } = await import('./PostsView');
const { LeadsView } = await import('./LeadsView');
const { CategoriesManager } = await import('./CategoriesManager');
const { GuidesManager } = await import('./GuidesManager');
const { PostEditor } = await import('./PostEditor');

const STATS = {
  published: 3,
  drafts: 1,
  leads: 12,
  leads30: 5,
  topPost: { title: 'Fêtes : quels produits ?', leads: 7 },
};
const ROWS = [
  {
    id: 'p1',
    slug: 'fetes',
    title: 'Fêtes : quels produits ?',
    status: 'PUBLISHED',
    publishedAt: '2026-11-18T09:00:00.000Z',
    updatedAt: '2026-11-19T09:00:00.000Z',
    category: 'Opportunités',
    leads: 7,
  },
  {
    id: 'p2',
    slug: 'brouillon',
    title: 'Un brouillon',
    status: 'DRAFT',
    publishedAt: null,
    updatedAt: '2026-11-20T09:00:00.000Z',
    category: null,
    leads: 0,
  },
];
const CATS = [
  {
    id: 'c1',
    slug: 'outils',
    name: 'Outils',
    description: null,
    position: 0,
    published: 2,
    total: 3,
  },
];
const GUIDES = [
  {
    id: 'g1',
    title: 'Le guide',
    description: null,
    url: 'https://boutique.example.com/guide',
    isDefault: true,
    posts: 1,
    leads: 4,
  },
];

describe('PostsView', () => {
  it('shows the figures, the tabs, each article with its state and contacts', () => {
    const t = text(<PostsView rows={ROWS} stats={STATS} categories={CATS} filter={{}} canEdit />);
    for (const s of [
      '3 publiés',
      '1 brouillon',
      '5 contacts sur 30 jours',
      'Fêtes : quels produits ?',
      'Publié',
      'Brouillon',
      'Catégories',
      'Guides',
      'Contacts',
    ]) {
      expect(t).toContain(s);
    }
    const out = html(<PostsView rows={ROWS} stats={STATS} categories={CATS} filter={{}} canEdit />);
    expect(out).toContain('href="/support-admin/blog/nouveau"');
    expect(out).toContain('href="/support-admin/blog/p1"');
    expect(out).toContain('href="/blog/fetes"');
    expect(out).not.toContain('href="/blog/brouillon"');
  });

  it('an admin without the super-admin role reads only', () => {
    const out = html(
      <PostsView rows={ROWS} stats={STATS} categories={CATS} filter={{}} canEdit={false} />,
    );
    expect(out).not.toContain('/support-admin/blog/nouveau');
  });

  it('says so when there is no article yet', () => {
    expect(
      text(
        <PostsView
          rows={[]}
          stats={{ ...STATS, published: 0 }}
          categories={[]}
          filter={{}}
          canEdit
        />,
      ),
    ).toContain('Aucun article');
  });
});

describe('LeadsView', () => {
  it('lists the contacts with their article and offers the CSV', () => {
    const rows = [
      {
        id: 'l1',
        firstName: 'Awa',
        phone: '+229 01 97 00 00 19',
        country: 'BJ',
        post: 'Fêtes',
        guide: 'Le guide',
        createdAt: '2026-11-21T10:00:00.000Z',
      },
    ];
    const out = html(<LeadsView rows={rows} />);
    expect(out).toContain('href="/api/admin/blog/leads/export"');
    expect(text(<LeadsView rows={rows} />)).toContain('Awa');
    expect(out).toContain('href="https://wa.me/2290197000019"');
  });
});

describe('CategoriesManager and GuidesManager', () => {
  it('lists the categories; a category with articles cannot be deleted', () => {
    const out = html(<CategoriesManager categories={CATS} canEdit />);
    expect(out).toContain('value="Outils"');
    expect(out).toMatch(/<button[^>]*disabled=""[^>]*>Supprimer<\/button>/);
    expect(text(<CategoriesManager categories={CATS} canEdit />)).toContain(
      'Ajouter une catégorie',
    );
  });

  it('lists the guides with the default one marked', () => {
    const t = text(<GuidesManager guides={GUIDES} canEdit />);
    expect(t).toContain('Le guide');
    expect(t).toContain('Par défaut');
    expect(t).toContain('Ajouter un guide');
  });

  it('read-only admins get no form', () => {
    expect(text(<GuidesManager guides={GUIDES} canEdit={false} />)).not.toContain(
      'Ajouter un guide',
    );
    expect(text(<CategoriesManager categories={CATS} canEdit={false} />)).not.toContain(
      'Ajouter une catégorie',
    );
  });
});

describe('PostEditor', () => {
  it('a new article: title, address, summary, category, guide, Google fields, save buttons', () => {
    const t = text(<PostEditor post={null} categories={CATS} guides={GUIDES} />);
    for (const s of [
      'Titre',
      'Adresse',
      'Résumé',
      'Catégorie',
      'Guide proposé',
      'Image de couverture',
      'Pour Google',
      'Enregistrer le brouillon',
      'Publier',
    ]) {
      expect(t).toContain(s);
    }
    expect(t).not.toContain('Supprimer');
  });
});
