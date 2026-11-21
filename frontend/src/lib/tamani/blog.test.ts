import { describe, expect, it } from 'vitest';
import {
  BLOG_DEFAULT_AUTHOR,
  BlogCategoryInput,
  BlogGuideInput,
  BlogLeadInput,
  BlogPostInput,
  blogIndexMetadata,
  blogPostJsonLd,
  blogPostMetadata,
  blogSlug,
  type BlogPostView,
} from './blog';

const DOC = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x' }] }],
};

const POST: BlogPostView = {
  id: 'p1',
  slug: 'fetes-quels-produits',
  title: 'Fêtes : quels produits tester ?',
  excerpt: 'Avant de commander, demande à ta communauté.',
  coverUrl: 'https://res.cloudinary.com/x/cover.jpg',
  coverAlt: 'Des cartons',
  seoTitle: null,
  seoDescription: null,
  keywords: ['grossiste', 'fêtes'],
  authorName: BLOG_DEFAULT_AUTHOR,
  readMinutes: 4,
  publishedAt: '2026-11-18T09:00:00.000Z',
  updatedAt: '2026-11-19T09:00:00.000Z',
  category: { slug: 'opportunites', name: 'Opportunités' },
};

describe('blogSlug', () => {
  it('turns a French title into an address', () => {
    expect(blogSlug('Fêtes : quels produits tester ?')).toBe('fetes-quels-produits-tester');
    expect(blogSlug('   ')).toBe('');
  });
});

describe('BlogPostInput', () => {
  const base = { title: 'Un titre', excerpt: 'Un résumé', content: DOC, status: 'DRAFT' };
  it('fills the defaults: slug from the title, the team as author, no category', () => {
    const v = BlogPostInput.parse(base);
    expect(v).toMatchObject({
      slug: 'un-titre',
      authorName: BLOG_DEFAULT_AUTHOR,
      categoryId: null,
      guideId: null,
      coverUrl: null,
      seoTitle: null,
      keywords: [],
    });
  });
  it('keeps a slug the porteur typed, cleaned', () => {
    expect(BlogPostInput.parse({ ...base, slug: 'Mon Adresse' }).slug).toBe('mon-adresse');
  });
  it('refuses a cover that is not https, and a content that is not a document', () => {
    expect(BlogPostInput.safeParse({ ...base, coverUrl: 'http://x.com/a.jpg' }).success).toBe(
      false,
    );
    expect(BlogPostInput.safeParse({ ...base, content: '<p>x</p>' }).success).toBe(false);
  });
  it('refuses a title that gives no address', () => {
    expect(BlogPostInput.safeParse({ ...base, title: '???' }).success).toBe(false);
  });
});

describe('BlogCategoryInput and BlogGuideInput', () => {
  it('takes a slug from the name', () => {
    expect(BlogCategoryInput.parse({ name: 'Problèmes et solutions' }).slug).toBe(
      'problemes-et-solutions',
    );
  });
  it('a guide is an http(s) link only', () => {
    expect(BlogGuideInput.safeParse({ title: 'Guide', url: 'https://x.com/g.pdf' }).success).toBe(
      true,
    );
    expect(BlogGuideInput.safeParse({ title: 'Guide', url: 'javascript:alert(1)' }).success).toBe(
      false,
    );
    expect(BlogGuideInput.parse({ title: 'Guide', url: 'https://x.com' }).isDefault).toBe(false);
  });
});

describe('BlogLeadInput', () => {
  it('asks a first name, a number and the consent', () => {
    const ok = { firstName: 'Awa', phone: '0197000019', country: 'bj', consent: true, post: 'a-b' };
    expect(BlogLeadInput.parse(ok)).toMatchObject({ country: 'BJ', post: 'a-b' });
    expect(BlogLeadInput.safeParse({ ...ok, consent: false }).success).toBe(false);
    expect(BlogLeadInput.safeParse({ ...ok, phone: '' }).success).toBe(false);
  });
});

describe('metadata and JSON-LD', () => {
  it('an article: canonical, its cover as share image, article type', () => {
    const m = blogPostMetadata('https://tamani.win/', POST);
    expect(m.alternates?.canonical).toBe('https://tamani.win/blog/fetes-quels-produits');
    expect(m.title).toEqual({ absolute: 'Fêtes : quels produits tester ? · Tamani' });
    expect(m.description).toBe(POST.excerpt);
    expect(m.openGraph).toMatchObject({
      type: 'article',
      url: 'https://tamani.win/blog/fetes-quels-produits',
      images: [{ url: POST.coverUrl }],
      publishedTime: POST.publishedAt,
    });
  });
  it('the Google title and description win when written', () => {
    const m = blogPostMetadata('https://tamani.win', {
      ...POST,
      seoTitle: 'Titre Google',
      seoDescription: 'Desc Google',
    });
    expect(m.title).toEqual({ absolute: 'Titre Google' });
    expect(m.description).toBe('Desc Google');
  });
  it('the index and a category have their own canonical', () => {
    expect(blogIndexMetadata('https://tamani.win').alternates?.canonical).toBe(
      'https://tamani.win/blog',
    );
    expect(
      blogIndexMetadata('https://tamani.win', { slug: 'outils', name: 'Outils' }).alternates
        ?.canonical,
    ).toBe('https://tamani.win/blog/categorie/outils');
  });
  it('BlogPosting and its breadcrumb', () => {
    const ld = blogPostJsonLd('https://tamani.win', POST);
    const graph = ld['@graph'] as Record<string, unknown>[];
    expect(graph[0]).toMatchObject({
      '@type': 'BlogPosting',
      headline: POST.title,
      datePublished: POST.publishedAt,
      dateModified: POST.updatedAt,
      image: [POST.coverUrl],
      author: { '@type': 'Organization', name: BLOG_DEFAULT_AUTHOR },
      mainEntityOfPage: 'https://tamani.win/blog/fetes-quels-produits',
      keywords: 'grossiste, fêtes',
      articleSection: 'Opportunités',
    });
    expect(graph[1]).toMatchObject({ '@type': 'BreadcrumbList' });
    expect((graph[1]?.['itemListElement'] as unknown[]).length).toBe(3);
  });
});
