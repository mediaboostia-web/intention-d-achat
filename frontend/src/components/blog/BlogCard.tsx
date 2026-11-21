import Link from 'next/link';
import { blogCategoryPath, blogDate, blogPostPath, type BlogCardView } from '@/lib/tamani/blog';

/** The cover, or a soft colour block of the same shape when there is none. */
export function BlogCover({
  src,
  alt,
  eager = false,
}: {
  src: string | null;
  alt: string | null;
  eager?: boolean;
}) {
  if (!src) return <div className="blog-cover" aria-hidden="true" />;
  return (
    <img
      className="blog-cover"
      src={src}
      alt={alt ?? ''}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      {...(eager ? { fetchPriority: 'high' as const } : {})}
    />
  );
}

export function BlogMeta({ post }: { post: Pick<BlogCardView, 'publishedAt' | 'readMinutes'> }) {
  return (
    <p className="blog-meta">
      {post.publishedAt && <time dateTime={post.publishedAt}>{blogDate(post.publishedAt)}</time>}
      {post.publishedAt && ' · '}
      {post.readMinutes} min de lecture
    </p>
  );
}

export function BlogCard({ post }: { post: BlogCardView }) {
  return (
    <article className="blog-card">
      <Link href={blogPostPath(post.slug)} aria-label={post.title} tabIndex={-1}>
        <BlogCover src={post.coverUrl} alt={post.coverAlt} />
      </Link>
      {post.category && (
        <Link className="blog-tag self-start" href={blogCategoryPath(post.category.slug)}>
          {post.category.name}
        </Link>
      )}
      <Link href={blogPostPath(post.slug)}>
        <h3>{post.title}</h3>
      </Link>
      <p className="text-ink-soft">{post.excerpt}</p>
      <BlogMeta post={post} />
    </article>
  );
}

/** The newest article, big, at the top of the index. */
export function BlogFeature({ post }: { post: BlogCardView }) {
  return (
    <article className="blog-feature blog-card">
      <Link href={blogPostPath(post.slug)} aria-label={post.title} tabIndex={-1}>
        <BlogCover src={post.coverUrl} alt={post.coverAlt} eager />
      </Link>
      <div className="flex flex-col gap-3">
        {post.category && (
          <Link className="blog-tag self-start" href={blogCategoryPath(post.category.slug)}>
            {post.category.name}
          </Link>
        )}
        <Link href={blogPostPath(post.slug)}>
          <h2>{post.title}</h2>
        </Link>
        <p className="text-lg text-ink-soft">{post.excerpt}</p>
        <BlogMeta post={post} />
      </div>
    </article>
  );
}
