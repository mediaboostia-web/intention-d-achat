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

/**
 * Uploads the files one by one, within the room left. A file that fails
 * does not drop the photos already there; the last error is returned.
 */
export async function uploadInto(
  current: readonly string[],
  files: readonly File[],
  max: number,
  upload: (file: File) => Promise<string>,
  onChange: (urls: string[]) => void,
  onSettled?: () => void,
): Promise<string | null> {
  const urls = [...current];
  let error: string | null = null;
  for (const file of files.slice(0, Math.max(0, max - current.length))) {
    try {
      urls.push(await upload(file));
      onChange([...urls]);
    } catch (err) {
      error =
        err instanceof UploadError
          ? uploadErrorMessage(err.status, err.code)
          : uploadErrorMessage(0, null);
    } finally {
      onSettled?.();
    }
  }
  return error;
}

interface PickerProps {
  id: string;
  label: string;
  hint?: string | undefined;
  value: string[];
  max: number;
}

export function PhotoPicker({
  onChange,
  ...props
}: PickerProps & { onChange: (urls: string[]) => void }) {
  const [sending, setSending] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function pick(files: File[]) {
    const batch = files.slice(0, Math.max(0, props.max - props.value.length));
    if (batch.length === 0) return;
    setError(null);
    setSending(batch.length);
    const failed = await uploadInto(props.value, batch, props.max, uploadPhoto, onChange, () =>
      setSending((n) => n - 1),
    );
    setError(failed);
  }

  return (
    <PhotoPickerView
      {...props}
      sending={sending}
      error={error}
      onPick={(files) => void pick(files)}
      onRemove={(url) => onChange(props.value.filter((u) => u !== url))}
    />
  );
}

export function PhotoPickerView({
  id,
  label,
  hint,
  value,
  max,
  sending,
  error,
  onPick,
  onRemove,
}: PickerProps & {
  sending: number;
  error: string | null;
  onPick: (files: File[]) => void;
  onRemove: (url: string) => void;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const tile = 'frame size-24 rounded-control bg-surface';
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-sm font-bold text-ink">{label}</legend>
      <ul className="mt-1.5 flex flex-wrap gap-3">
        {value.map((url, i) => (
          <li key={url} className="relative">
            {/* Cloudinary already resizes; next/image would need a remote pattern. */}
            <img src={url} alt={`Photo ${i + 1}`} className={`${tile} object-cover`} />
            <button
              type="button"
              aria-label={`Retirer la photo ${i + 1}`}
              onClick={() => onRemove(url)}
              className="frame absolute -top-3 -right-3 flex size-11 items-center justify-center rounded-full bg-surface text-ink"
            >
              <Icon name="close" className="size-5" />
            </button>
          </li>
        ))}
        {Array.from({ length: sending }, (_, i) => (
          <li
            key={`sending-${i}`}
            className={`${tile} flex items-center justify-center text-sm text-ink-muted`}
          >
            Envoi…
          </li>
        ))}
        {value.length + sending < max && (
          <li>
            <label
              htmlFor={id}
              className={`${tile} flex cursor-pointer flex-col items-center justify-center gap-1 border-dashed text-sm font-bold text-primary focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-primary`}
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
                  onPick(files);
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
