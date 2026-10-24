'use client';

import { Button } from '@/components/ui/Button';

// Errors say what happened and what to do, without apologizing
// (docs/brand/tamani-brand.md). The message itself is not shown: it can
// carry internal details; the digest lets support find the server log.
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-start justify-center gap-4 px-6">
      <h1 className="font-hand text-3xl font-bold text-primary">
        Quelque chose s&apos;est mal passé.
      </h1>
      <p className="text-ink-soft">Réessaie dans un instant. Si ça recommence, recharge la page.</p>
      {error.digest && <p className="text-sm text-ink-muted">Référence : {error.digest}</p>}
      <Button onClick={reset}>Réessayer</Button>
    </main>
  );
}
