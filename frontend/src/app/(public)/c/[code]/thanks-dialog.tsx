'use client';

// The end of an answer (lot 7a, porteur's feedback): a clean dialog over
// the popup. A yes reads as an order recorded that the shop will confirm on
// WhatsApp; a no is thanked, with a way back to a yes. CSS only, cut under
// prefers-reduced-motion (no animation library on the popup).
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/icons';
import type { ThanksCopy } from '@/lib/tamani/popup-copy';
import { cn } from '@/lib/utils';

export function ThanksDialog({
  copy,
  interested,
  recap,
  left,
  footer,
  onClose,
  onEdit,
  onChangeMind,
}: {
  copy: ThanksCopy;
  interested: boolean;
  /** When and how, under a yes. */
  recap: string[];
  /** The browser kept the page after « Fermer »: say so instead of a dead button. */
  left: boolean;
  footer?: ReactNode;
  onClose: () => void;
  onEdit: () => void;
  onChangeMind: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    title.current?.focus();
  }, []);

  // Tab stays in the dialog: the popup behind is inert.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !box.current) return;
    const focusable = [...box.current.querySelectorAll<HTMLElement>('button, a[href]')].filter(
      (el) => !el.hasAttribute('disabled'),
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (
      e.shiftKey &&
      (document.activeElement === first || document.activeElement === title.current)
    ) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-deep/55 p-4 motion-safe:animate-fade-in [@media(max-height:640px)]:p-3">
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby="popup-thanks-title"
        aria-describedby="popup-thanks-body"
        onKeyDown={onKeyDown}
        className="frame my-auto w-full max-w-sm rounded-sheet bg-surface px-5 pt-6 pb-5 text-center text-ink shadow-press motion-safe:animate-dialog-in [@media(max-height:640px)]:pt-4 [@media(max-height:640px)]:pb-4"
      >
        <span
          aria-hidden="true"
          className={cn(
            'frame mx-auto grid size-16 place-items-center rounded-full [@media(max-height:640px)]:size-12',
            interested ? 'bg-success text-primary-ink' : 'bg-accent text-accent-ink',
          )}
        >
          <Icon
            name={interested ? 'check' : 'heart'}
            className="size-8 [@media(max-height:640px)]:size-6"
          />
        </span>
        <h2
          ref={title}
          id="popup-thanks-title"
          tabIndex={-1}
          className="mt-4 font-hand text-3xl leading-tight font-bold break-words text-primary focus:outline-none [@media(max-height:640px)]:mt-2 [@media(max-height:640px)]:text-2xl"
        >
          {copy.title}
        </h2>
        <div
          id="popup-thanks-body"
          className="mt-2 grid gap-1.5 text-lg break-words [@media(max-height:640px)]:gap-1 [@media(max-height:640px)]:text-base"
        >
          {copy.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        {interested && recap.length > 0 && (
          <ul className="bg-paper mt-4 grid gap-1 rounded-card border-2 border-grid px-4 py-3 text-left break-words text-ink-soft [@media(max-height:640px)]:mt-3 [@media(max-height:640px)]:py-2">
            {recap.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
        <div className="mt-5 grid gap-2 [@media(max-height:640px)]:mt-4">
          {left ? (
            <p role="status" className="font-bold">
              C&apos;est noté. Tu peux fermer cette page.
            </p>
          ) : (
            <Button className="w-full" onClick={onClose}>
              Fermer
            </Button>
          )}
          {interested ? (
            <Button variant="secondary" className="w-full" onClick={onEdit}>
              Modifier ma réponse
            </Button>
          ) : (
            <Button variant="secondary" className="w-full" onClick={onChangeMind}>
              En fait, ça m&apos;intéresse
            </Button>
          )}
        </div>
        {footer}
      </div>
    </div>
  );
}
