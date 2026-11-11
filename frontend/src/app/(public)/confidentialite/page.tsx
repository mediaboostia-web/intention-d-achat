import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/LegalPage';
import { LEGAL_PAGES, LEGAL_SEO } from '@/lib/tamani/legal';

const page = LEGAL_PAGES['confidentialite'];
const seo = LEGAL_SEO['confidentialite'];

export function generateMetadata(): Metadata {
  const base = (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
  return {
    title: { absolute: seo.title },
    description: seo.description,
    alternates: { canonical: `${base}${page.path}` },
  };
}

export default function Page() {
  return <LegalPage slug="confidentialite" />;
}
