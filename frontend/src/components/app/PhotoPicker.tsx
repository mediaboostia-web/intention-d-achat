'use client';

// Photos of a product, or the shop logo (max 1). Each picked file goes to
// /api/upload at once; the field keeps only the returned Cloudinary URLs.
import { useState } from 'react';
import { Icon } from '@/components/ui';
import { uploadErrorMessage } from '@/lib/tamani/api-messages';
import { UploadError, uploadPhoto } from '@/lib/tamani/upload';

// The upload route's UPLOAD_ALLOWED_MIME. Naming them (not image/*) makes
// iPhones send a JPEG copy instead of HEIC.
const ACCEPT = 'image/jpeg,image/png,image/webp';

export function PhotoPicker({
  id,
  label,
  hint,
  value,
  onChange,
  max,
}: {
  id: string;
  label: string;
  hint?: string | undefined;
  value: string[];
  onChange: (urls: string[]) => void;
  max: number;
}) {
  const [sending, setSending] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const hintId = hint ? `${id}-hint` : undefined;

  async function pick(files: File[]) {
    const room = max - value.length;
    const batch = files.slice(0, room);
    if (batch.length === 0) return;
    setError(null);
    setSending(batch.length);
    const urls = [...value];
    for (const file of batch) {
      try {
        urls.push(await uploadPhoto(file));
        onChange([...urls]);
      } catch (err) {
        setError(
          err instanceof UploadError
            ? uploadErrorMessage(err.status, err.code)
            : uploadErrorMessage(0, null),
        );
      } finally {
        setSending((n) => n - 1);
      }
    }
  }

  const tiles = 'frame size-24 rounded-control bg-surface';

  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-sm font-bold text-ink">{label}</legend>
      <ul className="mt-1.5 flex flex-wrap gap-3">
        {value.map((url, i) => (
          <li key={url} className="relative">
            {/* Cloudinary already resizes; next/image would need a remote pattern. */}
            <img src={url} alt={`Photo ${i + 1}`} className={`${tiles} object-cover`} />
            <button
              type="button"
              aria-label={`Retirer la photo ${i + 1}`}
              onClick={() => onChange(value.filter((u) => u !== url))}
              className="frame absolute -top-3 -right-3 flex size-11 items-center justify-center rounded-full bg-surface text-ink"
            >
              <Icon name="close" className="size-5" />
            </button>
          </li>
        ))}
        {Array.from({ length: sending }, (_, i) => (
          <li
            key={`sending-${i}`}
            className={`${tiles} flex items-center justify-center text-sm text-ink-muted`}
          >
            Envoi…
          </li>
        ))}
        {value.length + sending < max && (
          <li>
            <label
              htmlFor={id}
              className={`${tiles} flex cursor-pointer flex-col items-center justify-center gap-1 border-dashed text-sm font-bold text-primary focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-primary`}
            >
              <Icon name="photo" />
              Ajouter
              <input
                id={id}
                type="file"
                accept={ACCEPT}
                multiple={max > 1}
                aria-describedby={hintId}
                className="sr-only"
                onChange={(e) => {
                  const files = [...(e.target.files ?? [])];
                  e.target.value = '';
                  void pick(files);
                }}
              />
            </label>
          </li>
        )}
      </ul>
      {hint && (
        <p id={hintId} className="text-sm text-ink-soft">
          {hint}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm font-bold text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
