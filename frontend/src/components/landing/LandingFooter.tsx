import Link from 'next/link';
import { Logo } from '@/components/ui';
import { WORDMARK_PATH, WORDMARK_VIEWBOX } from '@/lib/design/logo-paths';
import { colors } from '@/lib/design/tokens';
import { LEGAL_PAGES, LEGAL_SLUGS } from '@/lib/tamani/legal';
import {
  LANDING_CONTACT_EMAIL,
  LANDING_LINKS,
  LANDING_SLOGAN,
  type LandingLinkName,
  type LandingLinks,
} from '@/lib/tamani/landing';
import { InView } from './InView';
import { PlatformLogo } from './PlatformLogo';
import type { PlatformSlug } from './platform-paths';

const SOCIALS: readonly { link: LandingLinkName; slug: PlatformSlug; label: string }[] = [
  { link: 'whatsappContact', slug: 'whatsapp', label: 'Tamani sur WhatsApp' },
  { link: 'facebook', slug: 'facebook', label: 'Tamani sur Facebook' },
  { link: 'instagram', slug: 'instagram', label: 'Tamani sur Instagram' },
  { link: 'tiktok', slug: 'tiktok', label: 'Tamani sur TikTok' },
];

/**
 * 10. The notebook's back cover: links, then the name written whole, then the
 * small print. The legal pages join the columns when they ship (lot 9).
 */
export function LandingFooter({ links = LANDING_LINKS }: { links?: LandingLinks }) {
  const socials = SOCIALS.flatMap((s) => {
    const href = links[s.link];
    return href ? [{ ...s, href }] : [];
  });
  const help = [
    { href: '/#faq', label: 'FAQ' },
    ...(links.community ? [{ href: links.community, label: 'Le groupe WhatsApp' }] : []),
    { href: `mailto:${LANDING_CONTACT_EMAIL}`, label: LANDING_CONTACT_EMAIL },
  ];

  return (
    <footer id="contact" className="lp-panel lp-panel--cover lp-foot">
      <div className="lp-wrap">
        <div className="lp-foot__top">
          <div className="lp-foot__brand">
            <Link href="/" aria-label="Tamani, accueil" className="inline-block rounded-[8px]">
              <Logo size={34} tone="inverse" />
            </Link>
            <p className="lp-foot__slogan">{LANDING_SLOGAN}</p>
            {links.whatsappContact && (
              <a
                className="lp-foot__ask"
                href={links.whatsappContact}
                target="_blank"
                rel="noopener"
              >
                <PlatformLogo slug="whatsapp" />
                Une question ? Écris-nous sur WhatsApp
              </a>
            )}
            {socials.length > 0 && (
              <div className="lp-foot__social">
                {socials.map((s) => (
                  <a key={s.link} href={s.href} aria-label={s.label} target="_blank" rel="noopener">
                    <PlatformLogo slug={s.slug} />
                  </a>
                ))}
              </div>
            )}
          </div>
          <nav aria-label="Produit">
            <h3>Produit</h3>
            <ul>
              <li>
                <a href="/#comment-ca-marche">Comment ça marche</a>
              </li>
              <li>
                <a href="/#fonctionnalites">Fonctionnalités</a>
              </li>
              <li>
                <a href="/#benefices">Bénéfices</a>
              </li>
              <li>
                <Link href="/forfaits">Forfaits</Link>
              </li>
            </ul>
          </nav>
          <nav aria-label="Compte">
            <h3>Ton compte</h3>
            <ul>
              <li>
                <Link href="/signup">Créer un compte</Link>
              </li>
              <li>
                <Link href="/login">Se connecter</Link>
              </li>
            </ul>
          </nav>
          <nav aria-label="Aide">
            <h3>Aide</h3>
            <ul>
              {help.map((h) => (
                <li key={h.label}>
                  <a href={h.href}>{h.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        {/* The path keeps its own viewBox: wrapping it in a <symbol> with an offset viewBox cut the word's top off (v2). */}
        <InView className="lp-foot__giant" threshold={0.2} aria-hidden>
          <svg viewBox={WORDMARK_VIEWBOX} aria-hidden="true" focusable="false">
            <defs>
              <linearGradient id="lp-wordmark" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={colors.grid} />
                <stop
                  offset="0.55"
                  stopColor={`color-mix(in srgb, ${colors.primary} 55%, ${colors.surface})`}
                />
                <stop
                  offset="1"
                  stopColor={`color-mix(in srgb, ${colors.primary} 85%, ${colors.surface})`}
                />
              </linearGradient>
            </defs>
            <path d={WORDMARK_PATH} fill="url(#lp-wordmark)" />
          </svg>
        </InView>
        <div className="lp-foot__bar">
          <p>© 2026 Tamani. Tous droits réservés.</p>
          <nav aria-label="Pages légales" className="lp-foot__legal">
            {LEGAL_SLUGS.map((slug) => (
              <Link key={slug} href={LEGAL_PAGES[slug].path}>
                {LEGAL_PAGES[slug].label}
              </Link>
            ))}
          </nav>
          <p>Fait pour les grossistes et vendeurs en ligne d&apos;Afrique francophone.</p>
        </div>
      </div>
    </footer>
  );
}
