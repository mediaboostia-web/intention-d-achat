import type { ReactNode } from 'react';
import '@/components/landing/landing.css';
import './blog.css';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingNav } from '@/components/landing/LandingNav';
import type { LandingLinks } from '@/lib/tamani/landing';

/** The public site's bar and footer around a blog page. */
export function BlogShell({
  links,
  contactEmail,
  jsonLd,
  children,
}: {
  links: LandingLinks;
  contactEmail: string;
  /** Structured data for Google, already serialised. */
  jsonLd?: Record<string, unknown>;
  children: ReactNode;
}) {
  return (
    <div className="lp">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-4 focus:z-[100] focus:rounded-control focus:bg-ink focus:px-4 focus:py-3 focus:font-bold focus:text-surface"
      >
        Aller au contenu
      </a>
      <LandingNav current="/blog" links={links} />
      <main id="contenu" className="blog-page">
        {children}
      </main>
      <LandingFooter links={links} contactEmail={contactEmail} />
      {jsonLd && (
        <script
          type="application/ld+json"
          // `<` escaped so the graph can never close its <script> early.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
      )}
    </div>
  );
}
