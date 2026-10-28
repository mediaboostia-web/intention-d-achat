// People's and shops' names as the shop space shows them: initials in an
// avatar, a first name in a greeting.

function words(name: string | null | undefined): string[] {
  return (name ?? '').trim().split(/\s+/).filter(Boolean);
}

/** Up to two capital letters, '?' for an empty name: « Diallo Import » → « DI ». */
export function initials(name: string): string {
  const letters = words(name)
    .slice(0, 2)
    .map((w) => w.charAt(0).toLocaleUpperCase('fr'));
  return letters.length > 0 ? letters.join('') : '?';
}

/** The first word of a full name, or null without one. */
export function firstName(fullName: string | null | undefined): string | null {
  return words(fullName)[0] ?? null;
}

/** A person's name on the Profil page: 1 to 80 characters once trimmed. */
export const PROFILE_NAME_MAX = 80;
