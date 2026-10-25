'use client';

// The rounded "Rechercher" bar at the top of a list, as on WhatsApp. It
// keeps what is typed and writes it to the URL (?q=) 300 ms after the last
// key; the page reloads its list from the URL.
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@/components/ui';
import { debounce, searchHref } from '@/lib/tamani/search-query';

export function SearchField({ placeholder, param = 'q' }: { placeholder: string; param?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const search = params.toString();
  const [text, setText] = useState(params.get(param) ?? '');
  // The latest URL, read when the timer fires: a filter chip may change it meanwhile.
  const latest = useRef({ pathname, search });
  useEffect(() => {
    latest.current = { pathname, search };
  }, [pathname, search]);

  const write = useMemo(
    () =>
      debounce((value: string) => {
        const next = searchHref(latest.current.pathname, latest.current.search, value, param);
        router.replace(next, { scroll: false });
      }, 300),
    [router, param],
  );
  useEffect(() => () => write.cancel(), [write]);

  return (
    <form
      role="search"
      className="relative"
      onSubmit={(e) => {
        e.preventDefault();
        write.cancel();
        router.replace(searchHref(pathname, search, text, param), { scroll: false });
      }}
    >
      <Icon
        name="search"
        className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-muted"
      />
      <input
        type="search"
        enterKeyHint="search"
        value={text}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => {
          setText(e.target.value);
          write(e.target.value);
        }}
        className="frame min-h-12 w-full rounded-full bg-surface pr-12 pl-11 text-base text-ink placeholder:text-ink-muted [&::-webkit-search-cancel-button]:hidden"
      />
      {text && (
        <button
          type="button"
          aria-label="Effacer"
          onClick={() => {
            setText('');
            write.cancel();
            router.replace(searchHref(pathname, search, '', param), { scroll: false });
          }}
          className="absolute top-1/2 right-1 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-ink-soft hover:bg-bg"
        >
          <Icon name="close" className="size-5" />
        </button>
      )}
    </form>
  );
}
