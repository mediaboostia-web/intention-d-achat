// "il y a 5 min": when a notification arrived, as a person would say it.
import { formatDateFr } from './dates';

const MIN = 60_000;
const HOUR = 60 * MIN;

export function relativeTime(date: Date, now: Date): string {
  const ago = now.getTime() - date.getTime();
  if (ago < MIN) return "à l'instant";
  if (ago < HOUR) return `il y a ${Math.floor(ago / MIN)} min`;
  if (ago < 24 * HOUR) return `il y a ${Math.floor(ago / HOUR)} h`;
  if (ago < 48 * HOUR) return 'hier';
  return formatDateFr(date, now);
}
