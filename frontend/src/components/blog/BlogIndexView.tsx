import Link from 'next/link';
import {
  BLOG_DESCRIPTION,
  BLOG_PAGE_SIZE,
  BLOG_PATH,
  BLOG_TITLE,
  blogCategoryPath,
  type BlogCardView,
  type BlogCategoryRef,
  type BlogGuideView,
} from '@/lib/tamani/blog';
import { BlogCard, BlogFeature } from './BlogCard';
import { GuideButton } from './GuideButton';

/**
 * The « Magazine » index (porteur, 2026-11-21): the newest article big, the
 * categories as pills, a grid of cards, then the guide band. The same view
 * serves a category, its pill marked current.
 */
export function BlogIndexView({
  posts,
  total,
  page,
  categories,
  current,
  guide,
}: {
  posts: BlogCardView[];
  total: number;
  page: number;
  categories: BlogCategoryRef[];
  /** The category shown, or null for every article. */
  current: BlogCategoryRef | null;
  guide: BlogGuideView | null;
}) {
  const base = current ? blogCategoryPath(current.slug) : BLOG_PATH;
  const pages = Math.max(1, Math.ceil(total / BLOG_PAGE_SIZE));
  const [first, ...rest] = posts;
  const feature = page === 1 && !current ? first : undefined;
  const grid = feature ? rest : posts;
  const pageHref = (n: number) => (n === 1 ? base : `${base}?page=${n}`);

  return (
    <div className="blog-wrap">
      <header className="max-w-[760px]">
        <p className="font-bold text-primary">{current ? 'Catégorie' : 'Blog'}</p>
        <h1 className="mt-1 text-[clamp(2rem,5vw,3.2rem)] leading-tight font-extrabold">
          {current ? current.name : BLOG_TITLE}
        </h1>
        <p className="mt-3 text-lg text-ink-soft">{BLOG_DESCRIPTION}</p>
      </header>

      {categories.length > 0 && (
        <nav aria-label="Catégories" className="blog-pills mt-6">
          <Link
            className="blog-pill"
            href={BLOG_PATH}
            {...(!current && { 'aria-current': 'page' })}
          >
            Tout
          </Link>
          {categories.map((c) => (
            <Link
              key={c.slug}
              className="blog-pill"
              href={blogCategoryPath(c.slug)}
              {...(current?.slug === c.slug && { 'aria-current': 'page' })}
            >
              {c.name}
            </Link>
          ))}
        </nav>
      )}

      {posts.length === 0 ? (
        <p className="mt-12 rounded-card bg-surface p-8 text-center text-lg text-ink-soft frame">
          {current
            ? 'Pas encore d’article dans cette catégorie.'
            : 'Les premiers articles arrivent bientôt.'}
        </p>
      ) : (
        <>
          {feature && <BlogFeature post={feature} />}
          <div className={`blog-grid ${feature ? '' : 'mt-8'}`}>
            {grid.map((p) => (
              <BlogCard key={p.id} post={p} />
            ))}
          </div>
        </>
      )}

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-10 flex flex-wrap items-center justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={pageHref(n)}
              className="blog-pill"
              {...(n === page && { 'aria-current': 'page' })}
            >
              {n}
            </Link>
          ))}
        </nav>
      )}

      {guide && (
        <section className="blog-band" aria-labelledby="blog-band-title">
          <div>
            <h2 id="blog-band-title" className="text-2xl font-extrabold">
              {guide.title}
            </h2>
            {guide.description && <p className="mt-2 opacity-90">{guide.description}</p>}
          </div>
          <GuideButton guide={guide} label="Recevoir le guide" variant="secondary" />
        </section>
      )}
    </div>
  );
}
