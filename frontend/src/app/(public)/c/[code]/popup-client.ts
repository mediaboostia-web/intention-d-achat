// The popup's two calls. Plain fetch, not @/lib/api: a respondent has no
// session to refresh, and that client would add its weight to the popup.
import type { RememberedRespondent } from '@/lib/tamani/device-memory';
import type { ResponseStepBody } from '@/lib/tamani/popup-machine';

export interface StepResult {
  responseId: string;
  token: string;
  completed: boolean;
  respondent: RememberedRespondent | null;
  interestedCount: number | null;
}

export type StepReply = { ok: true; result: StepResult } | { ok: false; code: string | null };

export async function postStep(
  body: ResponseStepBody & { code: string; deviceId: string },
  token: string | null,
): Promise<StepReply> {
  try {
    const res = await fetch('/api/public/responses', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { 'x-response-token': token } : {}),
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => null)) as (StepResult & { error?: string }) | null;
    if (res.ok && data?.token) return { ok: true, result: data };
    return { ok: false, code: data?.error ?? null };
  } catch {
    return { ok: false, code: 'NETWORK' };
  }
}

export function postView(code: string, deviceId: string): void {
  fetch('/api/public/views', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code, deviceId }),
    keepalive: true,
  }).catch(() => {});
}

const MESSAGES: Record<string, string> = {
  NETWORK: "Ta réponse n'est pas partie : vérifie ta connexion, puis touche à nouveau.",
  INVALID_PHONE: "Ce numéro WhatsApp n'est pas valide. Vérifie-le.",
  CAMPAIGN_CLOSED: 'Cette campagne vient de se terminer.',
  ANSWERS_CLOSED: 'Les réponses sont fermées pour ce mois.',
  RATE_LIMITED: 'Trop de tentatives. Réessaie dans quelques minutes.',
  INVALID_RESPONSE_TOKEN: 'Cette réponse ne peut plus être modifiée depuis ce téléphone.',
};

export function popupErrorMessage(code: string | null): string {
  return (code && MESSAGES[code]) ?? "Ta réponse n'est pas partie. Réessaie.";
}
