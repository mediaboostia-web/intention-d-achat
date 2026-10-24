import type { FormEvent, ReactNode } from 'react';
import Link from 'next/link';
import { Button, Notice } from '@/components/ui';

// The frame shared by the sign-in pages: a handwritten title underlined in
// the margin colour, the fields, the error, and one pressed button.

export function AuthForm({
  title,
  note,
  error,
  errorAction,
  submitLabel,
  submittingLabel,
  submitting,
  onSubmit,
  children,
  after,
}: {
  title: string;
  note?: ReactNode;
  error?: string | null | undefined;
  errorAction?: ReactNode;
  submitLabel: string;
  submittingLabel: string;
  submitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
  after?: ReactNode;
}) {
  return (
    <>
      <AuthTitle title={title} note={note} />
      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5">
        {children}
        {error && (
          <Notice tone="danger" action={errorAction}>
            {error}
          </Notice>
        )}
        <Button type="submit" size="lg" disabled={submitting} className="w-full shadow-press">
          {submitting ? submittingLabel : submitLabel}
        </Button>
      </form>
      {after && <div className="mt-8 flex flex-col gap-5">{after}</div>}
    </>
  );
}

export function AuthTitle({ title, note }: { title: string; note?: ReactNode }) {
  return (
    <div>
      <h1 className="font-hand text-4xl leading-tight font-bold text-primary">{title}</h1>
      <svg
        viewBox="0 0 228 13"
        preserveAspectRatio="none"
        className="h-3 w-48 max-w-full"
        aria-hidden="true"
      >
        <path
          d="M2 5 C 60 2.5, 140 7, 224 3.5 M8 10.5 C 70 8.5, 150 11.5, 214 9"
          stroke="var(--color-margin)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
      {note && <p className="mt-3 text-ink-soft">{note}</p>}
    </div>
  );
}

/** "Pas encore de compte ? Crée ton espace" — a sentence ending on a link. */
export function AuthLink({
  question,
  href,
  children,
}: {
  question?: string;
  href: string;
  children: ReactNode;
}) {
  return (
    <p className="text-ink-soft">
      {question && <>{question} </>}
      <Link
        href={href}
        className="font-bold text-primary underline decoration-2 underline-offset-4"
      >
        {children}
      </Link>
    </p>
  );
}

/**
 * Google sign-in is a top-level navigation (plain <a>), not a fetch: the
 * browser follows the OAuth redirects and receives the cookies itself.
 */
export function GoogleButton({ next }: { next: string }) {
  return (
    <>
      <div className="flex items-center gap-3 text-sm text-ink-muted">
        <span aria-hidden="true" className="h-0.5 flex-1 rounded-full bg-grid" />
        ou
        <span aria-hidden="true" className="h-0.5 flex-1 rounded-full bg-grid" />
      </div>
      <Button
        href={`/api/auth/oauth/google/start?next=${encodeURIComponent(next)}`}
        variant="secondary"
        size="lg"
        className="w-full"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          {/* Google's own colours: its brand rules require the four-colour G. */}
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Continuer avec Google
      </Button>
    </>
  );
}
