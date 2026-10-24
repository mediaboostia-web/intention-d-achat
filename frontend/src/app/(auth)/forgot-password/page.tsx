import type { Metadata } from 'next';
import { ForgotPasswordForm } from './forgot-form';

export const metadata: Metadata = { title: 'Mot de passe oublié — Tamani' };

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
