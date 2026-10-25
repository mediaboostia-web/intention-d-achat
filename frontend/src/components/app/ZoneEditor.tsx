'use client';

// The shop's delivery zones: rename in place, delete after a confirmation,
// add at the bottom. Each change is saved at once (zones routes, ADMIN).
import { useState, type FormEvent } from 'react';
import { Button, Icon, Input } from '@/components/ui';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/tamani/api-messages';

export interface Zone {
  id: string;
  name: string;
  sortOrder: number;
}

const iconButton =
  'flex size-11 shrink-0 items-center justify-center rounded-control text-ink-soft disabled:opacity-50';

export function ZoneEditor({ shopId, zones }: { shopId: string; zones: Zone[] }) {
  const [items, setItems] = useState(zones);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [newName, setNewName] = useState('');
  const [addError, setAddError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const base = `/api/shops/${shopId}/zones`;

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  const rename = (zone: Zone) =>
    run(async () => {
      const name = draft.trim();
      if (!name || name === zone.name) return setEditing(null);
      try {
        const res = await api<{ zone: Zone }>(`${base}/${zone.id}`, {
          method: 'PATCH',
          body: { name },
        });
        setItems((list) => list.map((z) => (z.id === zone.id ? res.zone : z)));
        setEditing(null);
        setRowError(null);
      } catch (err) {
        setRowError({ id: zone.id, message: errorMessage(err) });
      }
    });

  const remove = (zone: Zone) =>
    run(async () => {
      try {
        await api(`${base}/${zone.id}`, { method: 'DELETE' });
        setItems((list) => list.filter((z) => z.id !== zone.id));
        setConfirming(null);
      } catch (err) {
        setRowError({ id: zone.id, message: errorMessage(err) });
        setConfirming(null);
      }
    });

  const add = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void run(async () => {
      const name = newName.trim();
      if (!name) return;
      setAddError(undefined);
      try {
        const sortOrder = items.reduce((max, z) => Math.max(max, z.sortOrder + 1), 0);
        const res = await api<{ zone: Zone }>(base, { method: 'POST', body: { name, sortOrder } });
        setItems((list) => [...list, res.zone]);
        setNewName('');
      } catch (err) {
        setAddError(errorMessage(err));
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {items.length === 0 ? (
        <p className="text-ink-soft">
          Pas encore de zone. Ajoute les quartiers ou les villes où tu livres.
        </p>
      ) : (
        <ul className="flex flex-col">
          {items.map((zone) => (
            <li key={zone.id} className="border-b-2 border-dashed border-grid py-2 last:border-b-0">
              {editing === zone.id ? (
                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor={`zone-${zone.id}`} className="sr-only">
                    Nouveau nom de {zone.name}
                  </label>
                  <input
                    id={`zone-${zone.id}`}
                    value={draft}
                    maxLength={60}
                    onChange={(e) => setDraft(e.target.value)}
                    className="frame min-h-12 min-w-0 flex-1 rounded-control bg-surface px-4 text-base text-ink"
                  />
                  <Button disabled={busy} onClick={() => void rename(zone)}>
                    Enregistrer
                  </Button>
                  <Button variant="ghost" disabled={busy} onClick={() => setEditing(null)}>
                    Annuler
                  </Button>
                </div>
              ) : confirming === zone.id ? (
                <div className="flex flex-col gap-2">
                  <p className="font-bold text-ink">Supprimer « {zone.name} » ?</p>
                  <p className="text-sm text-ink-soft">
                    Les réponses déjà reçues de ce quartier n&apos;auront plus de zone.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" disabled={busy} onClick={() => void remove(zone)}>
                      Oui, supprimer
                    </Button>
                    <Button variant="ghost" disabled={busy} onClick={() => setConfirming(null)}>
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="min-w-0 flex-1 font-bold break-words text-ink">{zone.name}</span>
                  <button
                    type="button"
                    aria-label={`Renommer ${zone.name}`}
                    disabled={busy}
                    className={iconButton}
                    onClick={() => {
                      setEditing(zone.id);
                      setDraft(zone.name);
                      setConfirming(null);
                    }}
                  >
                    <Icon name="pencil" className="size-5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Supprimer ${zone.name}`}
                    disabled={busy}
                    className={iconButton}
                    onClick={() => {
                      setConfirming(zone.id);
                      setEditing(null);
                    }}
                  >
                    <Icon name="trash" className="size-5" />
                  </button>
                </div>
              )}
              {rowError?.id === zone.id && (
                <p role="alert" className="mt-1 text-sm font-bold text-danger">
                  {rowError.message}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <Input
          id="zone-new"
          label="Ajouter une zone"
          placeholder="Médina, Parcelles…"
          maxLength={60}
          value={newName}
          error={addError}
          className="flex-1"
          onChange={(e) => {
            setNewName(e.target.value);
            setAddError(undefined);
          }}
        />
        <Button
          type="submit"
          variant="secondary"
          className="sm:mt-7"
          disabled={busy || !newName.trim()}
        >
          Ajouter
        </Button>
      </form>
    </div>
  );
}
