// One legal page (2026-11-04): the notebook paper of the sign-in pages, a
// reading column, the date, its sections, then the other pages and the
// contact. Server only; the words live in lib/tamani/legal.ts.
import Link from 'next/link';
import { Logo } from '@/components/ui';
import {
  LEGAL_ENTITY,
  LEGAL_PAGES,
  LEGAL_SLUGS,
  LEGAL_UPDATED,
  type LegalSlug,
} from '@/lib/tamani/legal';

export function LegalPage({ slug }: { slug: LegalSlug }) {
  const page = LEGAL_PAGES[slug];
  const others = LEGAL_SLUGS.filter((s) => s !== slug).map((s) => LEGAL_PAGES[s]);
  return (
    <div className="min-h-dvh bg-paper">
      <div className="mx-auto w-full max-w-2xl px-4 pt-8 pb-16 sm:px-6">
        <Link href="/" aria-label="Tamani, accueil" className="inline-block rounded-control">
          <Logo variant="lockup" size={34} />
        </Link>
        <main className="mt-10">
          <h1 className="font-hand text-4xl leading-tight font-bold text-primary">{page.title}</h1>
          <p className="mt-2 text-sm text-ink-muted">Mis à jour le {LEGAL_UPDATED}</p>
          <div className="frame mt-8 rounded-card bg-surface p-5 sm:p-8">
            {page.sections.map((section) => (
              <section key={section.title} className="mt-8 first:mt-0">
                <h2 className="font-hand text-2xl font-bold text-ink">{section.title}</h2>
                {section.body.map((p) => (
                  <p key={p} className="mt-3 leading-relaxed text-ink-soft">
                    {p}
                  </p>
                ))}
              </section>
            ))}
          </div>
        </main>
        <footer className="mt-10 text-sm text-ink-soft">
          <nav aria-label="Pages légales">
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {others.map((o) => (
                <li key={o.path}>
                  <Link href={o.path} className="font-bold text-primary underline">
                    {o.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <p className="mt-4">
            Une question ?{' '}
            <a href={`mailto:${LEGAL_ENTITY.email}`} className="font-bold text-primary underline">
              {LEGAL_ENTITY.email}
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
