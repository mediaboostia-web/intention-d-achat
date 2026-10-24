'use client';

import { useEffect, useState } from 'react';
import { Button, Icon } from '@/components/ui';
import { cn } from '@/lib/utils';

/** Copies with the Clipboard API, or a hidden textarea in WebViews that lack it. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Refused (permissions, insecure context): try the old way below.
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    area.remove();
  }
}

export function CopyButton({
  text,
  label,
  size = 'md',
  className,
}: {
  text: string;
  label: string;
  size?: 'md' | 'lg';
  className?: string | undefined;
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  useEffect(() => {
    if (state === 'idle') return;
    const t = setTimeout(() => setState('idle'), 2500);
    return () => clearTimeout(t);
  }, [state]);

  return (
    <>
      <Button
        variant="secondary"
        size={size}
        className={cn('shrink-0', className)}
        onClick={() => void copyText(text).then((ok) => setState(ok ? 'copied' : 'failed'))}
      >
        <Icon name={state === 'copied' ? 'check' : 'copy'} className="size-5" />
        {state === 'copied' ? 'Copié' : label}
      </Button>
      <span role="status" className="sr-only">
        {state === 'copied' ? 'Copié' : ''}
        {state === 'failed' ? 'La copie a échoué : sélectionne le texte et copie-le.' : ''}
      </span>
    </>
  );
}
