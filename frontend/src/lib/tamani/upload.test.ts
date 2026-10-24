import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';

const me = vi.fn();
vi.mock('@/lib/api', () => ({ api: (path: string) => me(path) }));

const { uploadPhoto, UploadError } = await import('./upload');

const URL_OK = 'https://res.cloudinary.com/demo/image/upload/v1/tamani/marmite.jpg';
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
const photo = () =>
  new File([new Uint8Array([0xff, 0xd8, 0xff])], 'marmite.jpg', { type: 'image/jpeg' });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('document', { cookie: 'theme=light; app-csrf=tok123' });
  vi.stubGlobal('localStorage', { getItem: () => null });
  me.mockReset().mockResolvedValue({ user: { id: 'u1' } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('uploadPhoto', () => {
  it('uploadPhoto posts multipart with the csrf header and returns the url', async () => {
    fetchMock.mockResolvedValueOnce(json(201, { id: 'f1', url: URL_OK }));
    await expect(uploadPhoto(photo())).resolves.toBe(URL_OK);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe('/api/upload');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect((init.headers as Record<string, string>)['x-csrf-token']).toBe('tok123');
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get('file')).toBeInstanceOf(File);
  });

  it('retries once after a 401', async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, { error: 'UNAUTHORIZED' }))
      .mockResolvedValueOnce(json(201, { url: URL_OK }));
    await expect(uploadPhoto(photo())).resolves.toBe(URL_OK);
    expect(me).toHaveBeenCalledWith('/api/auth/me');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gives up with a 401 when the session cannot be refreshed', async () => {
    fetchMock.mockResolvedValue(json(401, { error: 'UNAUTHORIZED' }));
    me.mockRejectedValueOnce(new Error('401'));
    const err = await uploadPhoto(photo()).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(UploadError);
    expect(err).toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws UploadError with the route code on 413', async () => {
    fetchMock.mockResolvedValueOnce(json(413, { code: 'FILE_TOO_LARGE', message: 'Max' }));
    const err = await uploadPhoto(photo()).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(UploadError);
    expect(err).toMatchObject({ status: 413, code: 'FILE_TOO_LARGE' });
  });

  it('reports a network failure as status 0', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(uploadPhoto(photo())).rejects.toMatchObject({ status: 0, code: null });
  });
});
