import { cn } from '@/lib/utils';

/** Where the wholesaler is in a step-by-step form: "Étape 2 sur 6" and the question. */
export function Steps({
  current,
  total,
  title,
  className,
}: {
  current: number;
  total: number;
  title: string;
  className?: string | undefined;
}) {
  return (
    <div className={className}>
      <div aria-hidden="true" className="flex gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={cn('h-2 flex-1 rounded-case', i < current ? 'bg-primary' : 'bg-grid')}
          />
        ))}
      </div>
      <p className="mt-3 text-sm font-bold text-ink-soft">
        Étape {current} sur {total}
      </p>
      <h2 className="font-hand text-3xl leading-tight font-bold text-primary">{title}</h2>
    </div>
  );
}
