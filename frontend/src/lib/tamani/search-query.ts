// The lists' search bar (porteur's feedback §3 bis): the text goes to the
// URL as ?q=, a moment after the last key, so a list reloads once per word.

/** The URL with `param` set to the trimmed value (removed when empty); a cursor is dropped. */
export function searchHref(pathname: string, search: string, value: string, param = 'q'): string {
  const params = new URLSearchParams(search);
  params.delete('cursor');
  const v = value.trim();
  if (v) params.set(param, v);
  else params.delete(param);
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/** Calls `fn` once, `ms` after the last call; `cancel()` drops a pending call. */
export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  ms: number,
): ((...args: A) => void) & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const run = (...args: A) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
  return Object.assign(run, { cancel: () => clearTimeout(timer) });
}
