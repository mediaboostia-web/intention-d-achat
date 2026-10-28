'use client';

// The client book's filters on screen (lot 6b, retours §5): a « Filtrer »
// sheet with one choice per filter, and the active ones as chips under the
// search, each with its cross, then « Tout effacer ». The address holds them
// (lib/tamani/client-filters.ts).
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button, Select } from '@/components/ui';
import { Icon } from '@/components/ui/icons';
import { periodLabel, type ClientFilterState, type FilterChip } from '@/lib/tamani/client-filters';
import type { PhoneCountryChoice } from '@/lib/tamani/phone-countries';

export function ClientFilterChips({
  chips,
  clearHref,
}: {
  chips: readonly FilterChip[];
  clearHref: string;
}) {
  if (chips.length === 0) return null;
  return (
    <ul aria-label="Filtres actifs" className="mt-3 flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <li key={c.key}>
          <Link
            href={c.href}
            aria-label={`Retirer le filtre ${c.label}`}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border-2 border-ink bg-accent px-3 text-sm font-bold text-accent-ink"
          >
            {c.label}
            <Icon name="close" className="size-4" />
          </Link>
        </li>
      ))}
      <li>
        <Link
          href={clearHref}
          className="inline-flex min-h-10 items-center px-2 text-sm font-bold text-primary underline decoration-2 underline-offset-4"
        >
          Tout effacer
        </Link>
      </li>
    </ul>
  );
}

export interface FilterChoices {
  campaigns: ReadonlyArray<{ id: string; title: string }>;
  zones: ReadonlyArray<{ id: string; name: string }>;
  countries: readonly PhoneCountryChoice[];
  months: readonly string[];
}

/** The filters as a form; the sheet wraps it. Every select starts on the address's value. */
export function ClientFilterForm({
  state,
  choices,
  onApply,
  onCancel,
}: {
  state: ClientFilterState;
  choices: FilterChoices;
  onApply: (next: ClientFilterState) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(state);
  const set = (patch: Partial<ClientFilterState>) => setDraft((d) => ({ ...d, ...patch }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onApply(draft);
  };
  return (
    <form onSubmit={submit} className="grid gap-4">
      <h2 className="font-hand text-2xl font-bold text-primary">Filtrer les clients</h2>
      <Select
        id="filter-answer"
        label="Réponse"
        value={draft.answer ?? ''}
        onChange={(e) =>
          set({ answer: e.target.value === '' ? null : (e.target.value as 'yes' | 'no') })
        }
        options={[
          { value: '', label: 'Toutes les réponses' },
          { value: 'yes', label: 'Intéressés' },
          { value: 'no', label: 'Pas intéressés' },
        ]}
      />
      <Select
        id="filter-campaign"
        label="Campagne"
        value={draft.campaignId ?? ''}
        onChange={(e) => set({ campaignId: e.target.value || null })}
        options={[
          { value: '', label: 'Toutes les campagnes' },
          ...choices.campaigns.map((c) => ({ value: c.id, label: c.title })),
        ]}
      />
      <Select
        id="filter-zone"
        label="Quartier"
        value={draft.zone ?? ''}
        onChange={(e) => set({ zone: e.target.value || null })}
        options={[
          { value: '', label: 'Tous les quartiers' },
          ...choices.zones.map((z) => ({ value: z.id, label: z.name })),
          { value: 'OTHER', label: 'Autre endroit' },
        ]}
      />
      <Select
        id="filter-period"
        label="Période de la réponse"
        value={draft.period ?? ''}
        onChange={(e) => set({ period: e.target.value || null })}
        options={[
          { value: '', label: 'Toutes les dates' },
          ...['ce-mois', 'mois-dernier', '3-mois', ...choices.months].map((p) => ({
            value: p,
            label: periodLabel(p),
          })),
        ]}
      />
      <Select
        id="filter-country"
        label="Pays du numéro"
        value={draft.country ?? ''}
        onChange={(e) => set({ country: e.target.value || null })}
        options={[
          { value: '', label: 'Tous les pays' },
          ...choices.countries.map((c) => ({ value: c.code, label: c.label })),
        ]}
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit">Voir les clients</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  );
}

/** The « Filtrer » button and its sheet (a modal dialog). */
export function ClientFilterSheet({
  state,
  choices,
  active,
  onOpen,
  onApply,
}: {
  state: ClientFilterState;
  choices: FilterChoices;
  active: number;
  onOpen: () => void;
  onApply: (next: ClientFilterState) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          onOpen();
          setOpen(true);
        }}
      >
        {active > 0 ? `Filtrer (${active})` : 'Filtrer'}
      </Button>
      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        aria-label="Filtrer les clients"
        className="m-0 mt-auto max-h-[90dvh] w-full max-w-none rounded-t-sheet bg-paper p-5 shadow-sheet backdrop:bg-ink/40 lg:m-auto lg:max-w-md lg:rounded-card"
      >
        {open && (
          <ClientFilterForm
            key={JSON.stringify(state)}
            state={state}
            choices={choices}
            onApply={(next) => {
              setOpen(false);
              onApply(next);
            }}
            onCancel={() => setOpen(false)}
          />
        )}
      </dialog>
    </>
  );
}
