import { cn } from '@/lib/utils';
import { Stamp } from './Stamp';

/**
 * An in-stock campaign's reading of its stock (lot 6b): the stamp, the
 * sentence that says what to do, and a hand-written note while the
 * estimate is provisional.
 */
export function StockCard({
  word,
  figure,
  unit,
  sentence,
  tone,
  note,
  className,
}: {
  word: string;
  figure: string;
  unit: string;
  sentence: string;
  tone: 'success' | 'warning';
  note?: string | undefined;
  className?: string;
}) {
  return (
    <section aria-label={`État du stock : ${word}`} className={cn('relative', className)}>
      <Stamp word={word} figure={figure} unit={unit} tone={tone} />
      <p className="mt-5 text-lg leading-snug font-bold text-ink">{sentence}</p>
      {note && <p className="mt-1 font-hand text-lg text-ink-soft">{note}</p>}
    </section>
  );
}
