// Where to go after signing in. `?next=` comes from the URL, so it is only
// followed to a path of this site: "//evil.com", "/\evil.com" or
// "https://…" would send a fresh session to someone else's page.

const hasControlChar = (s: string) =>
  [...s].some((c) => {
    const code = c.charCodeAt(0);
    return code < 32 || code === 127;
  });

export function safeNextPath(raw: string | null | undefined, fallback = '/app'): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return fallback;
  if (raw.includes('\\') || hasControlChar(raw)) return fallback;
  return raw;
}
