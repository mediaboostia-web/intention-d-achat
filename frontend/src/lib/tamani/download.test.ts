import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';

const me = vi.fn();
vi.mock('@/lib/api', () => ({ api: (path: string) => me(path) }));

const { downloadFile, DownloadError } = await import('./download');

const csv = (filename: string) =>
  new Response('﻿Date;Prénom\r\n', {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
    },
  });
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn>;
let link: { href: string; download: string; click: ReturnType<typeof vi.fn>; remove: () => void };

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  link = { href: '', download: '', click: vi.fn(), remove: vi.fn() };
  vi.stubGlobal('document', {
    createElement: () => link,
    body: { append: vi.fn() },
  });
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:tamani');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  me.mockReset().mockResolvedValue({ user: { id: 'u1' } });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('downloadFile', () => {
  it('saves the file under the name the server gives', async () => {
    fetchMock.mockResolvedValueOnce(csv('tamani-marmites-2026-10-27.csv'));
    await downloadFile('/api/shops/o/campaigns/c/export', 'export.csv');
    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe('/api/shops/o/campaigns/c/export');
    expect(init.credentials).toBe('include');
    expect(link).toMatchObject({ href: 'blob:tamani', download: 'tamani-marmites-2026-10-27.csv' });
    expect(link.click).toHaveBeenCalledOnce();
  });

  it('retries once after refreshing the session on a 401', async () => {
    fetchMock.mockResolvedValueOnce(json(401, { error: 'UNAUTHORIZED' }));
    fetchMock.mockResolvedValueOnce(csv('a.csv'));
    await downloadFile('/x', 'export.csv');
    expect(me).toHaveBeenCalledWith('/api/auth/me');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(link.click).toHaveBeenCalledOnce();
  });

  it('throws the server code, and 0 on a network failure', async () => {
    fetchMock.mockResolvedValueOnce(json(403, { error: 'PLAN_FEATURE_LOCKED' }));
    await expect(downloadFile('/x', 'export.csv')).rejects.toMatchObject({
      status: 403,
      code: 'PLAN_FEATURE_LOCKED',
    });
    fetchMock.mockRejectedValueOnce(new TypeError('offline'));
    await expect(downloadFile('/x', 'export.csv')).rejects.toBeInstanceOf(DownloadError);
    expect(link.click).not.toHaveBeenCalled();
  });
});
