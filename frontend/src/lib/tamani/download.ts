// Files the shop downloads (the Excel export). api() only reads JSON, so the
// file is fetched here, with one retry after a session refresh like
// upload.ts, then saved through a blob: link under the server's file name.
import { api } from '@/lib/api';
import { API_URL } from '@/lib/constants';

export class DownloadError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | null,
  ) {
    super(code ?? `Download failed (${status})`);
    this.name = 'DownloadError';
  }
}

async function codeOf(res: Response): Promise<string | null> {
  try {
    const data = (await res.json()) as { error?: unknown; code?: unknown };
    if (typeof data.error === 'string') return data.error;
    return typeof data.code === 'string' ? data.code : null;
  } catch {
    return null;
  }
}

function serverFilename(res: Response): string | null {
  const header = res.headers.get('content-disposition') ?? '';
  return /filename="([^"]+)"/.exec(header)?.[1] ?? null;
}

/** Downloads `path` and saves it; throws DownloadError (status 0 = network). */
export async function downloadFile(path: string, fallbackName: string): Promise<void> {
  const get = () => fetch(`${API_URL}${path}`, { credentials: 'include' });
  let res: Response;
  try {
    res = await get();
    if (res.status === 401) {
      // api() refreshes the access cookie on a 401; if that fails too, the session is over.
      try {
        await api('/api/auth/me');
      } catch {
        throw new DownloadError(401, null);
      }
      res = await get();
    }
  } catch (err) {
    if (err instanceof DownloadError) throw err;
    throw new DownloadError(0, null);
  }
  if (!res.ok) throw new DownloadError(res.status, await codeOf(res));

  const href = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = href;
  link.download = serverFilename(res) ?? fallbackName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
