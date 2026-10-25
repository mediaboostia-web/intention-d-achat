import { Logo } from '@/components/ui/Logo';

// A mistyped or deleted share link.
export default function PopupNotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-paper px-6 text-center">
      <Logo variant="mark" size={48} />
      <h1 className="font-hand text-4xl font-bold text-primary">Ce lien ne marche pas</h1>
      <p className="max-w-sm text-lg text-ink-soft">
        Il a peut-être été mal copié. Demande au vendeur de te le renvoyer.
      </p>
    </main>
  );
}
