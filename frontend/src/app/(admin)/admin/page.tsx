import { redirect } from 'next/navigation';
import { ADMIN_HOME } from '@/lib/tamani/admin-nav';

// The kit's /admin became « Support-admin » (porteur, 2026-10-30).
export default function AdminRedirect(): never {
  redirect(ADMIN_HOME);
}
