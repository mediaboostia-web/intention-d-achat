import Link from 'next/link';
import { Logo } from '@/components/ui';
import { WORDMARK_PATH, WORDMARK_VIEWBOX } from '@/lib/design/logo-paths';
import { colors } from '@/lib/design/tokens';
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
    { href: '#questions', label: 'Questions' },
    ...(links.community ? [{ href: links.community, label: 'Le groupe WhatsApp' }] : []),
    ...(links.whatsappContact
      ? [{ href: links.whatsappContact, label: 'Écrire sur WhatsApp' }]
      : []),
    { href: `mailto:${LANDING_CONTACT_EMAIL}`, label: LANDING_CONTACT_EMAIL },
  ];

  return (
    <footer id="lp-footer" className="lp-panel lp-panel--cover lp-foot">
      <div className="lp-wrap">
        <div className="lp-foot__top">
          <div className="lp-foot__brand">
            <Link href="/" aria-label="Tamani, accueil" className="inline-block rounded-[8px]">
              <Logo size={34} tone="inverse" />
            </Link>
            <p className="lp-foot__slogan">{LANDING_SLOGAN}</p>
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
                <a href="#comment-ca-marche">Comment ça marche</a>
              </li>
              <li>
                <a href="#avant-apres">Avant / après</a>
              </li>
              <li>
                <a href="#film">La vidéo</a>
              </li>
              <li>
                <a href="#tarifs">Tarifs</a>
              </li>
            </ul>
          </nav>
          <nav aria-label="Compte">
            <h3>Ton compte</h3>
            <ul>
              <li>
                <Link href="/signup">Essayer gratuitement</Link>
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
          <p>Fait pour les grossistes et importateurs d&apos;Afrique de l&apos;Ouest.</p>
        </div>
      </div>
    </footer>
  );
}
