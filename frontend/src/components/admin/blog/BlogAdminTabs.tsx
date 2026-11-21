import Link from 'next/link';
import { ADMIN_HOME } from '@/lib/tamani/admin-nav';

export const BLOG_ADMIN = `${ADMIN_HOME}/blog`;

const TABS = [
  { key: 'articles', href: BLOG_ADMIN, label: 'Articles' },
  { key: 'categories', href: `${BLOG_ADMIN}/categories`, label: 'Catégories' },
  { key: 'guides', href: `${BLOG_ADMIN}/guides`, label: 'Guides' },
  { key: 'contacts', href: `${BLOG_ADMIN}/contacts`, label: 'Contacts' },
] as const;

export type BlogAdminTab = (typeof TABS)[number]['key'];

/** The blog's four screens in the support-admin (lot 13d). */
export function BlogAdminTabs({ current }: { current: BlogAdminTab }) {
  return (
    <nav aria-label="Blog" className="flex gap-2 overflow-x-auto pb-1">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`inline-flex min-h-11 flex-none items-center rounded-control px-4 font-bold ${
            t.key === current ? 'bg-admin text-admin-ink' : 'bg-admin-soft text-ink'
          }`}
          {...(t.key === current && { 'aria-current': 'page' as const })}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
