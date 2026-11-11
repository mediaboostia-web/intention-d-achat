'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { Button, Input } from '@/components/ui';
import { ApiError, api } from '@/lib/api';
import {
  PlatformSettingsInput,
  SETTINGS_GROUPS,
  settingsFieldError,
  type SettingsField,
} from '@/lib/tamani/platform-settings';

type Values = Record<SettingsField, string>;
type State = 'idle' | 'saving' | 'saved' | 'error';

function failure(err: unknown): string {
  if (err instanceof ApiError && err.status === 403) return 'Réservé au super-admin.';
  if (err instanceof ApiError && err.code === 'VALIDATION_FAILED') {
    return 'Un champ est refusé : vérifier les liens, puis réessayer.';
  }
  return "Les paramètres n'ont pas été enregistrés. Réessayer.";
}

/** A super-admin edits the platform's details; each field is checked before sending. */
export function PlatformSettingsForm({ initial }: { initial: Values }) {
  const router = useRouter();
  const busy = useRef(false);
  const [values, setValues] = useState<Values>(initial);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<SettingsField, string>>>({});
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy.current) return;
    const check = PlatformSettingsInput.safeParse(values);
    if (!check.success) {
      const errors: Partial<Record<SettingsField, string>> = {};
      for (const issue of check.error.issues) {
        const name = issue.path[0] as SettingsField;
        errors[name] = settingsFieldError(name);
      }
      setFieldErrors(errors);
      setState('error');
      setError('Un champ est à corriger.');
      return;
    }
    busy.current = true;
    setFieldErrors({});
    setError(null);
    setState('saving');
    try {
      await api('/api/admin/settings', { method: 'PUT', body: values });
      setState('saved');
      router.refresh();
    } catch (err) {
      setState('error');
      setError(failure(err));
    } finally {
      busy.current = false;
    }
  }

  return (
    <form id="platform-settings" onSubmit={submit} noValidate className="space-y-6">
      {SETTINGS_GROUPS.map((group) => (
        <fieldset key={group.title} className="admin-card space-y-4 p-4">
          <legend className="float-left w-full text-lg font-bold text-ink">{group.title}</legend>
          <div className="clear-both grid gap-4 md:grid-cols-2">
            {group.fields.map((f) => (
              <Input
                key={f.name}
                id={`settings-${f.name}`}
                name={f.name}
                label={f.label}
                hint={f.hint}
                error={fieldErrors[f.name]}
                type={f.type}
                inputMode={f.type === 'url' ? 'url' : f.type === 'email' ? 'email' : undefined}
                autoComplete="off"
                spellCheck={false}
                value={values[f.name]}
                onChange={(e) => {
                  const value = e.target.value;
                  setValues((v) => ({ ...v, [f.name]: value }));
                  setState('idle');
                }}
                className="min-w-0"
              />
            ))}
          </div>
        </fieldset>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={state === 'saving'}>
          Enregistrer
        </Button>
        <p role="status" className="text-sm text-ink-soft">
          {state === 'saved' ? 'Enregistré. Le site public est à jour.' : ''}
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm font-bold text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
