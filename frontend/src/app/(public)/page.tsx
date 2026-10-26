import type { Metadata } from 'next';
import '@/components/landing/landing.css';
import { BeforeAfter } from '@/components/landing/BeforeAfter';
import { Community } from '@/components/landing/Community';
import { Faq } from '@/components/landing/Faq';
import { Film } from '@/components/landing/Film';
import { Hero } from '@/components/landing/Hero';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingNav } from '@/components/landing/LandingNav';
import { Pricing } from '@/components/landing/Pricing';
import { Problem } from '@/components/landing/Problem';
import { Solution } from '@/components/landing/Solution';
import { Steps } from '@/components/landing/Steps';
import { StickyCta } from '@/components/landing/StickyCta';
import { landingJsonLd, landingMetadata } from '@/lib/tamani/landing';

const appUrl = () => process.env.APP_URL ?? 'http://localhost:3000';

export function generateMetadata(): Metadata {
  return landingMetadata(appUrl());
}

/**
 * The public home page (lot 9a, mockup docs/brand/mockups/2026-10-25-page-accueil-v3.html):
 * the porteur's ten sections, in their order.
 */
export default function HomePage() {
  // `<` escaped so the graph can never close its <script> early.
  const jsonLd = JSON.stringify(landingJsonLd(appUrl())).replace(/</g, '\\u003c');
  return (
    <div className="lp">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-4 focus:z-[100] focus:rounded-control focus:bg-ink focus:px-4 focus:py-3 focus:font-bold focus:text-surface"
      >
        Aller au contenu
      </a>
      <LandingNav />
      <main id="contenu">
        <Hero />
        <Film />
        <Problem />
        <Solution />
        <Steps />
        <BeforeAfter />
        <Pricing />
        <Community />
        <Faq />
      </main>
      <LandingFooter />
      <StickyCta />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    </div>
  );
}
