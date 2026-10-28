'use client';

// /app/profil (porteur's feedback 2, §8), opened by the avatar at the top:
// the shop's logo or the initials, the name (the kit has no route for it,
// PATCH /api/account does it), the email read only, the password changed or,
// for a Google account without one, created, then signing out. The page
// does the calls; this view keeps what is typed and shows what failed.
import { useState, type FormEvent } from 'react';
import { Avatar, Button, Card, Input, Notice } from '@/components/ui';
import { errorMessage, passwordErrorMessage } from '@/lib/tamani/api-messages';
import { PROFILE_NAME_MAX } from '@/lib/tamani/names';
import { PasswordInput } from './PasswordInput';

const PASSWORD_MIN = 10;

export interface PasswordChange {
  /** null when the account has no password yet: it is created. */
  currentPassword: string | null;
  newPassword: string;
}

export function ProfileView({
  name,
  shopName,
  email,
  hasPassword,
  logoUrl,
  signingOut = false,
  onRename,
  onPassword,
  onSignOut,
}: {
  name: string | null;
  /** The avatar's initials when the person has no name yet, as in the header. */
  shopName: string;
  email: string;
  hasPassword: boolean;
  logoUrl: string | null;
  signingOut?: boolean;
  /** Receives the trimmed name; throws an ApiError when the server refuses. */
  onRename: (name: string) => Promise<void>;
  onPassword: (change: PasswordChange) => Promise<void>;
  onSignOut: () => void;
}) {
  const [nameValue, setNameValue] = useState(name ?? '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);
  const shownName = name?.trim() || null;

  async function saveName(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const clean = nameValue.trim();
    if (!clean) {
      setNameError('Écris ton nom.');
      return;
    }
    setSavingName(true);
    setNameError(null);
    try {
      await onRename(clean);
      setNameValue(clean);
    } catch (err) {
      setNameError(errorMessage(err));
    } finally {
      setSavingName(false);
    }
  }

  async function savePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingPassword(true);
    setPasswordError(null);
    try {
      await onPassword({ currentPassword: hasPassword ? current : null, newPassword: next });
      setCurrent('');
      setNext('');
    } catch (err) {
      setPasswordError(passwordErrorMessage(err));
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="mt-8 flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Avatar name={shownName ?? shopName} src={logoUrl} size="lg" />
        <div className="min-w-0">
          <p className="font-hand text-2xl leading-tight font-bold break-words text-primary">
            {shownName ?? 'Ton profil'}
          </p>
          <p className="text-sm text-ink-soft">{shopName}</p>
        </div>
      </div>

      <Card className="p-5 sm:p-6">
        <form onSubmit={(e) => void saveName(e)} className="flex flex-col gap-4">
          <Input
            id="profile-name"
            label="Ton nom"
            hint="Tamani te salue par ton prénom."
            error={nameError ?? undefined}
            required
            maxLength={PROFILE_NAME_MAX}
            autoComplete="name"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
          />
          <Button type="submit" variant="secondary" className="self-start" disabled={savingName}>
            {savingName ? 'Enregistrement…' : 'Enregistrer le nom'}
          </Button>
        </form>
      </Card>

      <Card className="p-5 sm:p-6">
        <Input
          id="profile-email"
          label="E-mail"
          hint="Ton adresse de connexion. Elle ne se change pas ici."
          type="email"
          readOnly
          value={email}
        />
      </Card>

      <section aria-labelledby="profile-password-title">
        <Card className="p-5 sm:p-6">
          <form onSubmit={(e) => void savePassword(e)} className="flex flex-col gap-5">
            <h2
              id="profile-password-title"
              className="font-hand text-2xl leading-tight font-bold text-primary"
            >
              {hasPassword ? 'Changer le mot de passe' : 'Créer un mot de passe'}
            </h2>
            {!hasPassword && (
              <p className="-mt-3 text-sm text-ink-soft">
                Tu te connectes avec Google. Un mot de passe te permet aussi d&apos;entrer avec ton
                e-mail.
              </p>
            )}
            {hasPassword && (
              <PasswordInput
                id="profile-current"
                label="Mot de passe actuel"
                required
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
            )}
            <PasswordInput
              id="profile-new"
              label="Nouveau mot de passe"
              hint={`${PASSWORD_MIN} caractères au moins.`}
              required
              minLength={PASSWORD_MIN}
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
            {passwordError && <Notice tone="danger">{passwordError}</Notice>}
            <Button
              type="submit"
              variant="secondary"
              className="self-start"
              disabled={savingPassword}
            >
              {savingPassword
                ? 'Enregistrement…'
                : hasPassword
                  ? 'Changer le mot de passe'
                  : 'Enregistrer le mot de passe'}
            </Button>
          </form>
        </Card>
      </section>

      <Button variant="secondary" className="self-start" disabled={signingOut} onClick={onSignOut}>
        {signingOut ? 'Déconnexion…' : 'Se déconnecter'}
      </Button>
    </div>
  );
}
