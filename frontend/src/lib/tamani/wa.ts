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
