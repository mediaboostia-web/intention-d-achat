import {
  SETTINGS_GROUPS,
  inputFromSettings,
  type PlatformSettings,
} from '@/lib/tamani/platform-settings';
import { PlatformSettingsForm } from './PlatformSettingsForm';

/**
 * /support-admin/parametres (lot 13a): the platform's own details. A
 * super-admin edits them; an admin reads them. The site's address is
 * APP_URL, set in Vercel, so it shows here as text only.
 */
export function SettingsView({
  settings,
  canEdit,
  appUrl,
}: {
  settings: PlatformSettings;
  canEdit: boolean;
  appUrl: string;
}) {
  const values = inputFromSettings(settings);
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink">Paramètres</h1>
        <p className="text-ink-soft">
          Les informations de Tamani. Le site public les affiche dès l&apos;enregistrement.
        </p>
      </header>

      <section className="admin-card space-y-1 p-4">
        <h2 className="text-lg font-bold text-ink">Adresse du site</h2>
        <p className="font-bold break-words text-ink">{appUrl}</p>
        <p className="text-sm text-ink-soft">Se change dans Vercel (la variable APP_URL).</p>
      </section>

      {canEdit ? (
        <PlatformSettingsForm initial={values} />
      ) : (
        <>
          <p className="text-sm text-ink-soft">Réservé au super-admin : toi, tu peux les lire.</p>
          {SETTINGS_GROUPS.map((group) => (
            <section key={group.title} className="admin-card space-y-3 p-4">
              <h2 className="text-lg font-bold text-ink">{group.title}</h2>
              <dl className="grid gap-3 md:grid-cols-2">
                {group.fields.map((f) => (
                  <div key={f.name} className="min-w-0">
                    <dt className="text-sm text-ink-soft">{f.label}</dt>
                    <dd className="font-bold break-words text-ink">{values[f.name] || 'Aucun'}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
