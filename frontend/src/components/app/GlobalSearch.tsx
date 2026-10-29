'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui';
import { api } from '@/lib/api';
import { cloudinaryVariant, THUMB } from '@/lib/tamani/cloudinary-url';
import {
  SEARCH_MIN,
  searchOptions,
  type SearchGroup,
  type SearchOption,
  type SearchResults,
} from '@/lib/tamani/search-view';
import { cn } from '@/lib/utils';
import { useShop } from './shop-context';

const WAIT_MS = 250;
const GROUPS: readonly SearchGroup[] = ['Campagnes', 'Produits', 'Clients'];

interface Found {
  /** The text these options answer: an older answer is never shown for a newer text. */
  q: string;
  options: SearchOption[];
  error: boolean;
}

/**
 * The top bar's search (lot 7a): a combobox over campaigns, products and
 * clients. It asks 250 ms after the last key, from 2 characters; arrows walk
 * the options, Enter opens one, Escape closes, Ctrl K or ⌘ K brings the
 * field from anywhere in the shop space.
 */
export function GlobalSearch() {
  const { shop } = useShop();
  const router = useRouter();
  const inputId = useId();
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [found, setFound] = useState<Found>({ q: '', options: [], error: false });
  const [active, setActive] = useState(-1);
  const [mac, setMac] = useState(false);
  const term = q.trim();

  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform));
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        input.current?.focus();
        input.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  useEffect(() => {
    if (term.length < SEARCH_MIN) return;
    let live = true;
    const timer = setTimeout(() => {
      api<{ results: SearchResults }>(`/api/shops/${shop.id}/search?q=${encodeURIComponent(term)}`)
        .then((res) => {
          if (!live) return;
          setFound({ q: term, options: searchOptions(res.results), error: false });
          setActive(-1);
        })
        .catch(() => live && setFound({ q: term, options: [], error: true }));
    }, WAIT_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [term, shop.id]);

  const current = found.q === term;
  const options = current ? found.options : [];
  const showing = open && term.length >= SEARCH_MIN;
  const activeOption = showing ? options[active] : undefined;

  const pick = (o: SearchOption) => {
    setOpen(false);
    setQ('');
    router.push(o.href);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && options.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === 'ArrowUp' && options.length > 0) {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      const o = options[active] ?? (options.length === 1 ? options[0] : undefined);
      if (o) {
        e.preventDefault();
        pick(o);
      }
    } else if (e.key === 'Escape') {
      if (showing) setOpen(false);
      else setQ('');
    }
  };

  return (
    <div ref={box} className="relative">
      <label htmlFor={inputId} className="sr-only">
        Rechercher une campagne, un produit ou un client
      </label>
      <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-muted">
        <Icon name="search" className="size-5" />
      </span>
      <input
        ref={input}
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={showing}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeOption?.id}
        autoComplete="off"
        enterKeyHint="search"
        maxLength={60}
        placeholder="Campagne, produit, client…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="frame h-11 w-full rounded-full bg-surface pr-20 pl-11 text-ink placeholder:text-ink-muted"
      />
      <kbd
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded-case border-2 border-grid px-1.5 font-sans text-xs font-bold text-ink-muted"
      >
        {mac ? '⌘ K' : 'Ctrl K'}
      </kbd>
      {showing && (
        <SearchList
          id={listId}
          q={term}
          options={options}
          activeId={activeOption?.id ?? null}
          loading={!current}
          error={current && found.error}
          onPick={pick}
          onHover={setActive}
        />
      )}
    </div>
  );
}

/** The results under the field, drawn from props (the tests render it as static HTML). */
export function SearchList({
  id,
  q,
  options,
  activeId,
  loading,
  error,
  onPick,
  onHover,
}: {
  id: string;
  q: string;
  options: readonly SearchOption[];
  activeId: string | null;
  loading: boolean;
  error: boolean;
  onPick: (o: SearchOption) => void;
  onHover: (index: number) => void;
}) {
  return (
    <div className="frame absolute top-full right-0 left-0 z-30 mt-2 overflow-hidden rounded-card bg-surface shadow-sheet">
      {options.length > 0 ? (
        <div
          id={id}
          role="listbox"
          aria-label="Résultats"
          className="max-h-[60vh] overflow-y-auto py-2"
        >
          {GROUPS.map((group) => {
            const inGroup = options.filter((o) => o.group === group);
            if (inGroup.length === 0) return null;
            const headingId = `${id}-${group}`;
            return (
              <div key={group} role="group" aria-labelledby={headingId}>
                <div
                  id={headingId}
                  className="px-4 pt-2 pb-1 text-xs font-bold tracking-wide text-ink-muted uppercase"
                >
                  {group}
                </div>
                {inGroup.map((o) => (
                  <div
                    key={o.id}
                    id={o.id}
                    role="option"
                    aria-selected={o.id === activeId}
                    // Keep the focus in the field: the click opens the page.
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => onPick(o)}
                    onPointerMove={() => onHover(options.indexOf(o))}
                    className={cn(
                      'mx-2 flex min-h-12 cursor-pointer items-center gap-3 rounded-control px-2 py-1.5',
                      o.id === activeId && 'bg-grid/70',
                    )}
                  >
                    {o.photo ? (
                      <img
                        src={cloudinaryVariant(o.photo, THUMB)}
                        alt=""
                        className="size-9 shrink-0 rounded-case bg-bg object-cover"
                      />
                    ) : (
                      <span className="grid size-9 shrink-0 place-items-center rounded-case bg-bg text-ink-muted">
                        <Icon name={o.icon} className="size-5" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-ink">{o.label}</span>
                      <span className="block truncate text-sm text-ink-soft">{o.detail}</span>
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <p id={id} role="status" className="px-4 py-3 text-ink-soft">
          {loading
            ? 'Recherche…'
            : error
              ? "La recherche n'a pas abouti. Réessaie."
              : `Aucun résultat pour « ${q} »`}
        </p>
      )}
    </div>
  );
}
