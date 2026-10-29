// WhatsApp numbers: one stored form (E.164) whatever the way it was typed,
// so "77 123 45 67", "+221771234567" and "00221771234567" are one client.
import 'server-only';
import {
  isSupportedCountry,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js/min';

/**
 * Benin moved to 10 digits in November 2024: an old 8-digit number keeps
 * working with « 01 » in front ("97 12 34 56" → "01 97 12 34 56"). Old
 * numbers never started with 0: "01 97 12 34" is a new one cut short, refused.
 */
function beninTenDigits(input: string, defaultCountry: CountryCode): string {
  const compact = input.replace(/[\s.\-()]/g, '');
  const international = /^\+229([1-9]\d{7})$/.exec(compact);
  if (international) return `+22901${international[1]}`;
  if (defaultCountry === 'BJ' && /^[1-9]\d{7}$/.test(compact)) return `01${compact}`;
  return input;
}

/** E.164 ("+221771234567"), or null when the input is not a valid number. Never throws. */
export function normalizePhone(raw: string, defaultCountry: CountryCode): string | null {
  const input = beninTenDigits(raw.trim().replace(/^00/, '+'), defaultCountry);
  if (!input) return null;
  const phone = parsePhoneNumberFromString(input, defaultCountry);
  return phone?.isValid() ? phone.number : null;
}

/** "+221771234512" → "SN"; null when the number names no country. */
export function phoneCountryOf(e164: string): string | null {
  return parsePhoneNumberFromString(e164)?.country ?? null;
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
