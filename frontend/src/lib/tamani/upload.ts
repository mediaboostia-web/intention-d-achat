// Photo upload for products and the shop logo. api() only sends JSON, so
// the multipart POST to /api/upload is done here, with the same CSRF token
// and one retry after a session refresh. The route answers { code, message }
// on error (not { error }) and the Cloudinary URL as `url` on success.
import { api } from '@/lib/api';
import { API_URL, COOKIE_PREFIX } from '@/lib/constants';

export class UploadError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | null,
  ) {
    super(code ?? `Upload failed (${status})`);
    this.name = 'UploadError';
  }
}

const CSRF = `${COOKIE_PREFIX}-csrf`;

// Same lookup as api(): the stored token first, then the cookie.
function csrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const stored = typeof localStorage === 'undefined' ? null : localStorage.getItem(CSRF);
  if (stored) return stored;
  const pair = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${CSRF}=`));
  return pair ? decodeURIComponent(pair.slice(CSRF.length + 1)) : null;
}

function send(file: File): Promise<Response> {
  const body = new FormData();
  body.append('file', file);
  const token = csrfToken();
  return fetch(`${API_URL}/api/upload`, {
    method: 'POST',
    body,
    credentials: 'include',
    headers: token ? { 'x-csrf-token': token } : {},
  });
}

async function codeOf(res: Response): Promise<string | null> {
  try {
    const data = (await res.json()) as { code?: unknown; error?: unknown };
    if (typeof data.code === 'string') return data.code;
    return typeof data.error === 'string' ? data.error : null;
  } catch {
    return null;
  }
}

/** Uploads one photo and returns its Cloudinary URL; throws UploadError (status 0 = network). */
export async function uploadPhoto(file: File): Promise<string> {
  let res: Response;
  try {
    res = await send(file);
    if (res.status === 401) {
      // api() refreshes the access cookie on a 401; if that fails too, the session is over.
      try {
        await api('/api/auth/me');
      } catch {
        throw new UploadError(401, null);
      }
      res = await send(file);
    }
  } catch (err) {
    if (err instanceof UploadError) throw err;
    throw new UploadError(0, null);
  }

  if (!res.ok) throw new UploadError(res.status, await codeOf(res));
  const data = (await res.json().catch(() => null)) as { url?: unknown } | null;
  if (!data || typeof data.url !== 'string') throw new UploadError(res.status, 'UPLOAD_FAILED');
  return data.url;
}
