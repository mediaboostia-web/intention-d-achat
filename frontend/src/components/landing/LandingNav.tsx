'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Button, Icon, Logo } from '@/components/ui';
import { navStep } from '@/lib/tamani/landing';

const SECTIONS = [
  { href: '#comment-ca-marche', label: 'Comment ça marche' },
  { href: '#avant-apres', label: 'Avant / après' },
  { href: '#tarifs', label: 'Tarifs' },
  { href: '#questions', label: 'Questions' },
] as const;

/**
 * The floating bar of the porteur's references: logo, section links, sign-up.
 * It slides away while the visitor reads down and comes back as soon as they
 * scroll up; it stays while its phone menu is open or the keyboard is in it.
 * On a phone (lot 7a) the bar keeps only the logo and the yellow menu button,
 * straight on the paper; the menu is a drawer from the right that ends on
 * « Commencer gratuitement », then « Se connecter ».
 */
export function LandingNav() {
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const barRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef(false);

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
  // the page under it does not scroll, and a window grown past 1000px (where
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
    const wide = window.matchMedia('(min-width: 1000px)');
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
            {SECTIONS.map((s) => (
              <a key={s.href} href={s.href}>
                {s.label}
              </a>
            ))}
          </nav>
          <div className="lp-nav__end">
            <Link href="/login" className="lp-nav__login">
              Se connecter
            </Link>
            <Button
              href="/signup"
              className="lp-nav__cta min-h-11 rounded-[12px] bg-ink px-[18px] text-[15px]"
            >
              Essayer gratuitement
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
            {SECTIONS.map((s, i) => (
              <a
                key={s.href}
                href={s.href}
                onClick={() => setOpen(false)}
                style={{ '--i': i } as CSSProperties}
              >
                {s.label}
                <Icon name="chevron-right" />
              </a>
            ))}
          </nav>
          <div className="lp-drawer__end" style={{ '--i': SECTIONS.length } as CSSProperties}>
            <Button href="/signup" size="lg" className="w-full">
              Commencer gratuitement
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
