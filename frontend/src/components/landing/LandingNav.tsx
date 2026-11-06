'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Button, Icon, Logo } from '@/components/ui';
import { useInstall } from '@/components/app/use-install';
import { INSTALL_COPY, type InstallState } from '@/lib/tamani/install';
import {
  LANDING_LINKS,
  LANDING_NAV,
  navStep,
  type LandingLinks,
  LANDING_NAV_CTA_LABEL,
  LANDING_SIGNUP_HREF,
  LANDING_SIGNUP_LABEL,
} from '@/lib/tamani/landing';
import { Illustration } from './Illustration';
import { PlatformLogo } from './PlatformLogo';

/** « Installer l'application » in the phone menu, or the iPhone steps; nothing elsewhere. */
export function DrawerInstall({
  state,
  onInstall,
}: {
  state: InstallState | 'hidden';
  onInstall: () => void;
}) {
  if (state === 'prompt') {
    return (
      <button type="button" className="lp-drawer__install" onClick={onInstall}>
        <Icon name="download" />
        <span>
          <b>{INSTALL_COPY.prompt.label}</b>
          {INSTALL_COPY.prompt.note}
        </span>
      </button>
    );
  }
  if (state === 'ios') {
    return (
      <p className="lp-drawer__install">
        <Icon name="download" />
        <span>
          <b>{INSTALL_COPY.ios.label}</b>
          {INSTALL_COPY.ios.note}
        </span>
      </p>
    );
  }
  return null;
}

/**
 * The floating bar of the porteur's references: logo, section links, sign-up.
 * It slides away while the visitor reads down and comes back as soon as they
 * scroll up; it stays while its phone menu is open or the keyboard is in it.
 * On a phone (lot 7a) the bar keeps only the logo and the yellow menu button,
 * straight on the paper; the menu is a drawer from the right that ends on
 * « Commencer gratuitement », then « Se connecter ». Above them, two drawn
 * cards open the support and the WhatsApp group (porteur, 2026-10-30).
 */
export function LandingNav({
  links = LANDING_LINKS,
  current = '/',
}: {
  links?: LandingLinks;
  /** The page showing the bar: its own entry is marked aria-current="page". */
  current?: '/' | '/forfaits' | '/liste-attente';
}) {
  const help = [
    ...(links.whatsappContact
      ? [
          {
            href: links.whatsappContact,
            image: 'menu-support' as const,
            title: "Besoin d'aide ?",
            line: 'Une vraie personne te répond sur WhatsApp.',
          },
        ]
      : []),
    ...(links.community
      ? [
          {
            href: links.community,
            image: 'menu-groupe' as const,
            title: 'Rejoindre la communauté',
            line: 'Des conseils et des échanges entre vendeurs.',
          },
        ]
      : []),
  ];
  const { state: installState, install } = useInstall();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  // On the home page, the section in view: its menu entry gets underlined.
  const [active, setActive] = useState<string | null>(null);
  const here = (href: string) => ({
    ...(href === current && { 'aria-current': 'page' as const }),
    ...(href === active && { 'data-active': 'true' }),
  });
  const barRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef(false);

  useEffect(() => {
    if (current !== '/' || !('IntersectionObserver' in window)) return;
    const sections = LANDING_NAV.flatMap((n) => {
      const el = n.href.startsWith('/#') ? document.getElementById(n.href.slice(2)) : null;
      return el ? [{ href: n.href, el }] : [];
    });
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const hit = sections.find((x) => x.el === e.target);
          if (hit && e.isIntersecting) setActive(hit.href);
        }
      },
      // A thin band across the middle of the screen: the section crossing it is « here ».
      { rootMargin: '-45% 0px -50% 0px' },
    );
    sections.forEach((x) => io.observe(x.el));
    return () => io.disconnect();
  }, [current]);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    let state = { lastY: window.scrollY, hidden: false };
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = Math.max(0, window.scrollY);
      const busy = openRef.current || Boolean(barRef.current?.querySelector(':focus-visible'));
      state = navStep(state, y, busy);
      setHidden(state.hidden);
      setScrolled(y > 8);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  // While the drawer is open: focus inside it, Tab kept in it, Escape closes,
  // the page under it does not scroll, and a window grown past 1280px (where
  // the bar shows every link) closes it.
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        menuRef.current?.focus();
        return;
      }
      if (e.key !== 'Tab' || !drawerRef.current) return;
      const items = [...drawerRef.current.querySelectorAll<HTMLElement>('a[href], button')];
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    const wide = window.matchMedia('(min-width: 1280px)');
    const onWide = () => {
      if (wide.matches) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    wide.addEventListener('change', onWide);
    return () => {
      root.style.overflow = overflow;
      window.removeEventListener('keydown', onKey);
      wide.removeEventListener('change', onWide);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    menuRef.current?.focus();
  };

  return (
    <>
      <header
        ref={barRef}
        className="lp-nav"
        data-hidden={hidden ? 'true' : 'false'}
        data-scrolled={scrolled ? 'true' : 'false'}
        onFocus={() => setHidden(false)}
      >
        <div className="lp-nav__bar">
          <Link href="/" className="lp-nav__logo" aria-label="Tamani, accueil">
            <Logo size={34} />
          </Link>
          <nav className="lp-nav__links" aria-label="Sections de la page">
            {LANDING_NAV.map((s) => (
              <Link key={s.href} href={s.href} {...here(s.href)}>
                {s.label}
              </Link>
            ))}
          </nav>
          <div className="lp-nav__end">
            <Link href="/login" className="lp-nav__login">
              Se connecter
            </Link>
            <Button
              href={LANDING_SIGNUP_HREF}
              className="lp-nav__cta min-h-11 rounded-[12px] bg-ink px-[18px] text-[15px] whitespace-nowrap"
            >
              {LANDING_NAV_CTA_LABEL}
            </Button>
            <button
              ref={menuRef}
              type="button"
              className="lp-nav__menu"
              aria-expanded={open}
              aria-controls="lp-menu"
              aria-label="Ouvrir le menu"
              onClick={() => setOpen(true)}
            >
              <Icon name="menu" />
            </button>
          </div>
        </div>
      </header>
      <div className="lp-drawer" data-open={open ? 'true' : 'false'}>
        {/* The darkened page: a tap on it closes the drawer (the close button is the keyboard's way). */}
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          className="lp-drawer__backdrop"
          onClick={close}
        />
        <div
          ref={drawerRef}
          id="lp-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          inert={!open}
          className="lp-drawer__panel"
        >
          <div className="lp-drawer__head">
            <Logo size={30} />
            <button
              ref={closeRef}
              type="button"
              className="lp-drawer__close"
              aria-label="Fermer le menu"
              onClick={close}
            >
              <Icon name="close" />
            </button>
          </div>
          <nav className="lp-drawer__links" aria-label="Sections de la page">
            {LANDING_NAV.map((s, i) => (
              <Link
                key={s.href}
                href={s.href}
                onClick={() => setOpen(false)}
                style={{ '--i': i } as CSSProperties}
                {...here(s.href)}
              >
                {s.label}
                <Icon name="chevron-right" />
              </Link>
            ))}
          </nav>
          {help.length > 0 && (
            <ul className="lp-drawer__help">
              {help.map((h) => (
                <li key={h.title}>
                  <a href={h.href} target="_blank" rel="noopener" onClick={() => setOpen(false)}>
                    <Illustration name={h.image} alt="" sizes="320px" />
                    <span>
                      <b>
                        <PlatformLogo slug="whatsapp" />
                        {h.title}
                      </b>
                      {h.line}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
          <DrawerInstall state={installState} onInstall={() => void install()} />
          <div className="lp-drawer__end" style={{ '--i': LANDING_NAV.length } as CSSProperties}>
            <Button href={LANDING_SIGNUP_HREF} size="lg" className="w-full">
              {LANDING_SIGNUP_LABEL}
            </Button>
            <p>
              Déjà un compte ?{' '}
              <Link href="/login" onClick={() => setOpen(false)}>
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
