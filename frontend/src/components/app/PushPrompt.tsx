'use client';

// The phone asks by itself (porteur's feedback 2, §7): no site can turn
// notifications on alone, so on a phone (touch screen narrower than 1024px)
// a small sheet asks the first time the shop space opens, while they are
// neither on nor refused. « Plus tard » asks once more 7 days later, then
// never. An iPhone outside the home screen is told how to install first, at
// the same pace. Computers get no sheet: Réglages keeps the switch.
import { useEffect, useRef, useState } from 'react';
import { BottomSheet, Button } from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import { safeStorage } from '@/lib/tamani/device-memory';
import {
  answeredPushPrompt,
  pushPromptDue,
  readPushPrompt,
  writePushPrompt,
} from '@/lib/tamani/push-state';
import { INSTALL_FIRST_COPY } from './PushCard';
import { usePush } from './use-push';

const TITLE_ID = 'push-prompt-title';

/** Stateless: `onYes` is « Oui, préviens-moi », or « J'ai compris » on an iPhone. */
export function PushPromptView({
  state,
  busy,
  onYes,
  onLater,
}: {
  state: 'ask' | 'install-first';
  busy: boolean;
  onYes: () => void;
  onLater: () => void;
}) {
  const ask = state === 'ask';
  return (
    <>
      <h2 id={TITLE_ID} className="font-hand text-2xl leading-tight font-bold text-primary">
        Être prévenu à chaque réponse&nbsp;?
      </h2>
      <p className="mt-2 text-ink-soft">
        {ask
          ? "Une notification sur ton téléphone dès qu'un client répond, même quand Tamani est fermé."
          : INSTALL_FIRST_COPY}
      </p>
      <div className="mt-5 flex flex-col gap-3">
        <Button size="lg" className="shadow-press" disabled={busy} onClick={onYes}>
          {ask ? 'Oui, préviens-moi' : "J'ai compris"}
        </Button>
        <Button variant="ghost" className="self-center" disabled={busy} onClick={onLater}>
          Plus tard
        </Button>
      </div>
    </>
  );
}

function isPhoneScreen(): boolean {
  try {
    return window.matchMedia('(pointer: coarse)').matches && window.innerWidth < 1024;
  } catch {
    return false;
  }
}

/** Mounted once by AppShell. Renders nothing until the sheet is due. */
export function PushPrompt() {
  const { state, ready, busy, error, enable } = usePush('settings');
  const { toast } = useToast();
  const [shown, setShown] = useState<'ask' | 'install-first' | null>(null);
  const phone = useRef(false);
  const decided = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    phone.current = isPhoneScreen();
  }, []);

  // Decided once, when the browser has been looked at: a later change of
  // state (on, refused) never brings the sheet back.
  useEffect(() => {
    if (!ready || decided.current) return;
    decided.current = true;
    const memory = readPushPrompt(safeStorage());
    if (
      (state === 'ask' || state === 'install-first') &&
      pushPromptDue({ state, isPhone: phone.current, memory, now: Date.now() })
    ) {
      setShown(state);
    }
  }, [ready, state]);

  useEffect(() => {
    const d = dialog.current;
    if (shown && d && !d.open) d.showModal();
  }, [shown]);

  useEffect(() => {
    if (error) toast(error, 'error');
  }, [error, toast]);

  /** Every answer counts, a failed « Oui » too: the question is not asked again at once. */
  function remember() {
    const storage = safeStorage();
    writePushPrompt(storage, answeredPushPrompt(readPushPrompt(storage), Date.now()));
  }

  function later() {
    remember();
    setShown(null);
  }

  async function yes() {
    remember();
    await enable();
    setShown(null);
  }

  if (!shown) return null;
  return (
    <dialog
      ref={dialog}
      aria-labelledby={TITLE_ID}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) later();
      }}
      className="m-0 mt-auto w-full max-w-none bg-transparent p-0 backdrop:bg-ink/40"
    >
      <BottomSheet
        label="Notifications"
        awning={false}
        className="pb-[env(safe-area-inset-bottom)]"
      >
        <PushPromptView
          state={shown}
          busy={busy}
          onYes={shown === 'ask' ? () => void yes() : later}
          onLater={later}
        />
      </BottomSheet>
    </dialog>
  );
}
