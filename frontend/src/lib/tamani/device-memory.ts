// What the respondent's phone remembers (spec §5.3, §6.5): a random device
// id, their first name and number for the next campaigns, and the token of
// each answer so it can be changed. localStorage can be missing or throw
// (private browsing, in-app browsers): the popup then works without memory.
import type { PopupAnswers } from './popup-machine';

export interface RememberedRespondent {
  firstName: string;
  phoneE164: string;
  phoneMasked: string;
}

export interface SavedAnswer {
  token: string;
  answers: PopupAnswers;
  savedAt: string;
}

export interface DeviceMemory {
  deviceId: string;
  respondent: RememberedRespondent | null;
  saved: Record<string, SavedAnswer>;
}

const KEY = 'tamani:device';
const MAX_SAVED = 20;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The browser's localStorage when it can be written to, otherwise null. */
export function safeStorage(): Storage | null {
  try {
    const storage = window.localStorage;
    storage.setItem('tamani:probe', '1');
    storage.removeItem('tamani:probe');
    return storage;
  } catch {
    return null;
  }
}

/** A UUID v4; crypto.randomUUID exists only on HTTPS pages. */
export function newDeviceId(): string {
  if (typeof globalThis.crypto.randomUUID === 'function') return globalThis.crypto.randomUUID();
  const b = globalThis.crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const hex = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function isRespondent(v: unknown): v is RememberedRespondent {
  const r = v as RememberedRespondent | null;
  return (
    typeof r === 'object' &&
    r !== null &&
    typeof r.firstName === 'string' &&
    typeof r.phoneE164 === 'string' &&
    typeof r.phoneMasked === 'string'
  );
}

export function loadDeviceMemory(storage: Storage | null): DeviceMemory {
  try {
    const raw = JSON.parse(storage?.getItem(KEY) ?? 'null') as Partial<DeviceMemory> | null;
    if (raw && typeof raw.deviceId === 'string' && UUID.test(raw.deviceId)) {
      return {
        deviceId: raw.deviceId,
        respondent: isRespondent(raw.respondent) ? raw.respondent : null,
        saved: typeof raw.saved === 'object' && raw.saved !== null ? raw.saved : {},
      };
    }
  } catch {
    // Corrupt or unreadable: start over.
  }
  return { deviceId: newDeviceId(), respondent: null, saved: {} };
}

export function saveDeviceMemory(storage: Storage | null, memory: DeviceMemory): void {
  if (!storage) return;
  const recent = Object.entries(memory.saved)
    .sort(([, a], [, b]) => b.savedAt.localeCompare(a.savedAt))
    .slice(0, MAX_SAVED);
  try {
    storage.setItem(KEY, JSON.stringify({ ...memory, saved: Object.fromEntries(recent) }));
  } catch {
    // Full or blocked: the answer is on the server anyway.
  }
}
