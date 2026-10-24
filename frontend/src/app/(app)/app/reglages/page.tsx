import type { Metadata } from 'next';
import { googleSignInEnabled } from '@/lib/server/oauth/google-enabled';
import { SettingsView } from './settings-view';

export const metadata: Metadata = { title: 'Réglages — Tamani' };

// Server page: it alone can tell whether Google sign-in is configured.
export default function SettingsPage() {
  return <SettingsView google={googleSignInEnabled()} />;
}
