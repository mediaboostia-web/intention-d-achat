import type { ReactNode } from 'react';
import { AuthPanel } from './auth-panel';

// Sign-in pages (lot 12, after the porteur's AMU capture): a big rounded
// picture — a band on a phone, the left column from lg — then the form.
// Tamani's light colours. No session provider — the shop space mounts its
// own once signed in.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-[minmax(0,46fr)_minmax(0,54fr)] lg:items-start">
      <AuthPanel />
      <div className="mx-auto flex w-full max-w-md flex-col px-4 pt-6 pb-16 lg:min-h-dvh lg:justify-center lg:py-16">
        <main>{children}</main>
      </div>
    </div>
  );
}
