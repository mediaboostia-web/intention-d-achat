// A client's number as it may leave the server (porteur, 2026-11-04). The
// popup's box « J'accepte que {boutique} me contacte » is not required: a
// client who leaves it unticked still counts in the results, but the shop
// never sees their number, on any plan. Respondent.contactConsentAt is when
// they last ticked it (or when the shop typed the number for a manual order);
// clients recorded before the box keep theirs (migration 9f).
import 'server-only';
import type { Prisma } from '@prisma/client';
import { displayPhone, maskPhone } from './phone';

/** The clients whose number may be shown, in a Respondent where. */
export const CONTACT_CONSENTED = {
  contactConsentAt: { not: null },
} satisfies Prisma.RespondentWhereInput;

export interface ShownPhone {
  /** In full, masked ("77 •• •• 12"), or null. */
  phone: string | null;
  /** For the WhatsApp buttons and the numbers export: in full or null. */
  phoneE164: string | null;
  /** The client gave a number but did not agree to be contacted. */
  contactRefused: boolean;
}

export function shownPhone(
  e164: string | null,
  canSeeContacts: boolean,
  consentAt: Date | null,
): ShownPhone {
  if (e164 === null) return { phone: null, phoneE164: null, contactRefused: false };
  if (consentAt === null) return { phone: null, phoneE164: null, contactRefused: true };
  return canSeeContacts
    ? { phone: displayPhone(e164), phoneE164: e164, contactRefused: false }
    : { phone: maskPhone(e164), phoneE164: null, contactRefused: false };
}
