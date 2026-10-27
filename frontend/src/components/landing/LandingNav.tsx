'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
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
 */
export function LandingNav() {
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const barRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
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

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      menuRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
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
            className="min-h-11 rounded-[12px] bg-ink px-[18px] text-[15px] max-[419px]:px-3.5"
          >
            <span className="lp-nav__cta-long">Essayer gratuitement</span>
            <span className="lp-nav__cta-short">Essayer</span>
          </Button>
          <button
            ref={menuRef}
            type="button"
            className="lp-nav__menu"
            aria-expanded={open}
            aria-controls="lp-menu"
            aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
            onClick={() => setOpen((o) => !o)}
          >
            <Icon name={open ? 'close' : 'menu'} />
          </button>
        </div>
      </div>
      <nav id="lp-menu" className="lp-nav__drop" aria-label="Menu" hidden={!open}>
        {SECTIONS.map((s) => (
          <a key={s.href} href={s.href} onClick={() => setOpen(false)}>
            {s.label}
          </a>
        ))}
        <Link href="/login" onClick={() => setOpen(false)}>
          Se connecter
        </Link>
      </nav>
    </header>
  );
}
