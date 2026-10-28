'use client';

// The account part of the settings (the kit's flows, in Tamani's words):
// change or set the password, link Google, sign out.
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Icon, Notice } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { PasswordInput } from './PasswordInput';
import { api } from '@/lib/api';
import { passwordErrorMessage } from '@/lib/tamani/api-messages';

const PASSWORD_MIN = 10;

export function AccountSection({ google }: { google: boolean }) {
  const router = useRouter();
  const { user, refresh, logout, loggingOut } = useAuth();
  const { toast } = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!user) return null;
  const hasPassword = user.hasPassword;
  const googleLinked = user.linkedProviders.includes('google');

  async function savePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (next !== confirm) {
      setError('Les deux mots de passe ne sont pas les mêmes.');
      return;
    }
    setSaving(true);
    try {
      if (hasPassword) {
        await api('/api/auth/change-password', {
          method: 'PUT',
          body: { currentPassword: current, newPassword: next },
        });
        toast('Mot de passe changé.', 'success');
      } else {
        await api('/api/auth/set-password', { method: 'POST', body: { newPassword: next } });
        toast('Mot de passe enregistré : tu peux aussi te connecter par email.', 'success');
      }
      setCurrent('');
      setNext('');
      setConfirm('');
      await refresh();
    } catch (err) {
      setError(passwordErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await logout();
    router.replace('/login');
  }

  return (
    <div className="flex flex-col gap-8">
      <p className="text-ink">
        Connecté avec <strong className="break-all">{user.email}</strong>
      </p>

      <form onSubmit={(e) => void savePassword(e)} className="flex flex-col gap-5">
        <h3 className="font-bold text-ink">
          {hasPassword ? 'Changer le mot de passe' : 'Choisir un mot de passe'}
        </h3>
        {!hasPassword && (
          <p className="-mt-3 text-sm text-ink-soft">
            Tu te connectes avec Google. Un mot de passe te permet aussi d&apos;entrer avec ton
            email.
          </p>
        )}
        {hasPassword && (
          <PasswordInput
            id="acc-current"
            label="Mot de passe actuel"
            required
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        )}
        <PasswordInput
          id="acc-new"
          label="Nouveau mot de passe"
          hint={`${PASSWORD_MIN} caractères au moins.`}
          required
          minLength={PASSWORD_MIN}
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
        <PasswordInput
          id="acc-confirm"
          label="Écris-le une deuxième fois"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {error && <Notice tone="danger">{error}</Notice>}
        <Button type="submit" variant="secondary" className="self-start" disabled={saving}>
          {saving
            ? 'Enregistrement…'
            : hasPassword
              ? 'Changer le mot de passe'
              : 'Enregistrer le mot de passe'}
        </Button>
      </form>

      {googleLinked ? (
        <p className="flex items-center gap-2 text-ink">
          <Icon name="check" className="size-5 text-success" />
          Ton compte Google est lié : tu peux te connecter en un clic.
        </p>
      ) : (
        google && (
          <div className="flex flex-col gap-3">
            <p className="text-ink-soft">Lie ton compte Google pour te connecter en un clic.</p>
            <Button
              href={`/api/auth/oauth/google/start?next=${encodeURIComponent('/app/reglages')}`}
              variant="secondary"
              className="self-start"
            >
              Lier mon compte Google
            </Button>
          </div>
        )
      )}

      <Button
        variant="ghost"
        className="self-start px-0"
        disabled={loggingOut}
        onClick={() => void signOut()}
      >
        {loggingOut ? 'Déconnexion…' : 'Se déconnecter'}
      </Button>
    </div>
  );
}
