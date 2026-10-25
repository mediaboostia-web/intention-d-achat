// wa.me links: they open WhatsApp on a phone and WhatsApp Web elsewhere.

/** Chat with one number: "+221771234567" → https://wa.me/221771234567. */
export function waChatLink(phoneE164: string, text?: string): string {
  const base = `https://wa.me/${phoneE164.replace(/^\+/, '')}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/** Share a message to a contact or group the user picks. */
export function waShareLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/**
 * A message cut where WhatsApp shows *bold*: the preview renders it the same
 * way. Like WhatsApp, the starred text must not start or end with a space.
 */
export function whatsappSegments(text: string): Array<{ text: string; bold: boolean }> {
  const out: Array<{ text: string; bold: boolean }> = [];
  let last = 0;
  for (const m of text.matchAll(/\*([^*\s](?:[^*\n]*[^*\s])?)\*/g)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), bold: false });
    out.push({ text: m[1] ?? '', bold: true });
    last = m.index + m[0].length;
  }
  if (last < text.length || out.length === 0) out.push({ text: text.slice(last), bold: false });
  return out;
}
