import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'surface' | 'paper' | 'ink';

const TONES: Record<Tone, string> = {
  surface: 'bg-surface text-ink',
  paper: 'bg-paper text-ink',
  ink: 'bg-ink text-surface',
};

export function Card({
  tone = 'surface',
  as: Tag = 'div',
  className,
  children,
}: {
  tone?: Tone;
  as?: 'div' | 'section' | 'article';
  className?: string;
  children: ReactNode;
}) {
  return <Tag className={cn('frame rounded-card p-4', TONES[tone], className)}>{children}</Tag>;
}
