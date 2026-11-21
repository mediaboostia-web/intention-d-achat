import Link from 'next/link';
import { Button } from '@/components/ui';
import type { TocEntry } from '@/lib/tamani/blog-render';
import {
  BLOG_PATH,
  blogCategoryPath,
  blogDate,
  facebookShareHref,
  whatsappShareHref,
  type BlogCardView,
  type BlogGuideView,
  type BlogPostView,
} from '@/lib/tamani/blog';
import { BlogCard, BlogCover } from './BlogCard';
import { GuideButton } from './GuideButton';

/**
 * « Passe à l'action » (porteur, 2026-11-21): the guide for a contact, the
 * sign-up, the WhatsApp group. A button without its target is not drawn.
 */
export function ActionBlock({
  guide,
  post,
  signupHref,
  signupLabel,
  community,
}: {
  guide: BlogGuideView | null;
  post?: string;
  signupHref: string;
  signupLabel: string;
  community: string | null;
}) {
  return (
    <section className="blog-action" aria-labelledby="blog-action-title">
      <h2 id="blog-action-title" className="text-2xl font-extrabold">
        Passe à l&apos;action
      </h2>
      <p className="mt-2 opacity-90">
        Teste la demande de ta communauté avant de commander ton stock.
      </p>
      <div className="blog-action__row">
        {guide && (
          <GuideButton
            guide={guide}
            {...(post ? { post } : {})}
            label="📘 Télécharger le guide"
            variant="secondary"
          />
        )}
        <Button href={signupHref} size="lg">
          {signupLabel}
        </Button>
        {community && (
          <Button href={community} variant="whatsapp" size="lg" target="_blank" rel="noopener">
            Rejoindre le groupe
          </Button>
        )}
      </div>
    </section>
  );
}

export function ArticleView({
  post,
  html,
  toc,
  url,
  guide,
  related,
  signupHref,
  signupLabel,
  community,
}: {
  post: BlogPostView;
  /** Produced by renderDoc's whitelist, never the stored HTML of an editor. */
  html: string;
  toc: TocEntry[];
  url: string;
  guide: BlogGuideView | null;
  related: BlogCardView[];
  signupHref: string;
  signupLabel: string;
  community: string | null;
}) {
  return (
    <article className="blog-wrap">
      <header className="blog-article-head blog-narrow mx-auto">
        <nav aria-label="Fil d'Ariane" className="blog-crumbs">
          <Link href="/">Accueil</Link>
          <span aria-hidden="true">›</span>
          <Link href={BLOG_PATH}>Blog</Link>
          {post.category && (
            <>
              <span aria-hidden="true">›</span>
              <Link href={blogCategoryPath(post.category.slug)}>{post.category.name}</Link>
            </>
          )}
        </nav>
        {post.category && (
          <Link className="blog-tag mt-5" href={blogCategoryPath(post.category.slug)}>
            {post.category.name}
          </Link>
        )}
        <h1>{post.title}</h1>
        <p className="text-lg text-ink-soft">{post.excerpt}</p>
        <p className="blog-meta mt-3">
          Par {post.authorName}
          {post.publishedAt && (
            <>
              {' · '}
              <time dateTime={post.publishedAt}>{blogDate(post.publishedAt)}</time>
            </>
          )}
          {' · '}
          {post.readMinutes} min de lecture
        </p>
      </header>

      {post.coverUrl && (
        <div className="mx-auto mt-8 max-w-[1000px]">
          <BlogCover src={post.coverUrl} alt={post.coverAlt} eager />
        </div>
      )}

      <div className="blog-layout mx-auto max-w-[1080px]">
        <div className="min-w-0">
          {/* Safe: renderDoc escapes every text and keeps whitelisted tags only. */}
          <div className="blog-prose" dangerouslySetInnerHTML={{ __html: html }} />
          <ActionBlock
            guide={guide}
            post={post.slug}
            signupHref={signupHref}
            signupLabel={signupLabel}
            community={community}
          />
        </div>
        <aside className="blog-aside" aria-label="Sommaire et partage">
          {toc.length > 0 && (
            <nav aria-labelledby="blog-toc-title">
              <h2 id="blog-toc-title" className="mb-3 font-bold text-ink">
                Sommaire
              </h2>
              <ol className="flex flex-col gap-2 text-sm">
                {toc.map((t) => (
                  <li key={t.id} className={t.level === 3 ? 'pl-4' : ''}>
                    <a href={`#${t.id}`}>{t.text}</a>
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <div className="mt-8">
            <h2 className="mb-3 font-bold text-ink">Partager</h2>
            <ul className="flex flex-col gap-2 text-sm">
              <li>
                <a href={whatsappShareHref(post.title, url)} target="_blank" rel="noopener">
                  Sur WhatsApp
                </a>
              </li>
              <li>
                <a href={facebookShareHref(url)} target="_blank" rel="noopener">
                  Sur Facebook
                </a>
              </li>
            </ul>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mx-auto mt-16 max-w-[1080px]" aria-labelledby="blog-related-title">
          <h2 id="blog-related-title" className="mb-6 text-2xl font-extrabold">
            À lire aussi
          </h2>
          <div className="blog-grid">
            {related.map((r) => (
              <BlogCard key={r.id} post={r} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
