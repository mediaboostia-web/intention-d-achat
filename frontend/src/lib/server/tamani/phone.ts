// WhatsApp numbers: one stored form (E.164) whatever the way it was typed,
// so "77 123 45 67", "+221771234567" and "00221771234567" are one client.
import 'server-only';
import {
  isSupportedCountry,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js/min';

/** E.164 ("+221771234567"), or null when the input is not a valid number. Never throws. */
export function normalizePhone(raw: string, defaultCountry: CountryCode): string | null {
  const input = raw.trim().replace(/^00/, '+');
  if (!input) return null;
  const phone = parsePhoneNumberFromString(input, defaultCountry);
  return phone?.isValid() ? phone.number : null;
}

/** "+221771234512" → "77 •• •• 12". */
export function maskPhone(e164: string): string {
  const national = parsePhoneNumberFromString(e164)?.nationalNumber;
  if (!national) return `•• •• ${e164.slice(-2)}`;
  return `${national.slice(0, 2)} •• •• ${national.slice(-2)}`;
}

/** "+221771112233" → "+221 77 111 22 33", for a plan that shows numbers. */
export function displayPhone(e164: string): string {
  return parsePhoneNumberFromString(e164)?.formatInternational() ?? e164;
}

/** The shop's country as a phone region, Senegal when unknown. */
export function shopCountry(country: string): CountryCode {
  return isSupportedCountry(country) ? country : 'SN';
}
