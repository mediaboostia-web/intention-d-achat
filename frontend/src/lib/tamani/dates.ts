// Dates as the shop space writes them: "3 novembre", with the year only
// when it is not the current one.

const DAY_MS = 86_400_000;

export function addDays(now: Date, n: number): Date {
  return new Date(now.getTime() + n * DAY_MS);
}

export function formatDateFr(d: Date, now: Date = new Date()): string {
  const sameYear = d.getUTCFullYear() === now.getUTCFullYear();
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    ...(sameYear ? {} : { year: 'numeric' }),
    timeZone: 'UTC',
  }).format(d);
}
