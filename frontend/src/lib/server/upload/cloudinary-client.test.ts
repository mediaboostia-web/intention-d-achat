import { afterEach, describe, it, expect, vi } from 'vitest';

const sent: Record<string, unknown>[] = [];

vi.mock('cloudinary', () => ({
  v2: {
    config: vi.fn(),
    uploader: {
      upload_stream: (options: Record<string, unknown>, done: (e: unknown, r: unknown) => void) => {
        sent.push(options);
        return {
          end: () =>
            done(undefined, {
              public_id: options.public_id,
              secure_url: 'https://res.cloudinary.com/x/image/upload/a.png',
              bytes: 3,
            }),
        };
      },
    },
  },
}));

const { uploadBuffer, __resetCloudinarySingleton } = await import('./cloudinary-client');

afterEach(() => {
  sent.length = 0;
  vi.unstubAllEnvs();
  __resetCloudinarySingleton();
});

describe('uploadBuffer', () => {
  it('works on a fresh Cloudinary account: the MIME goes in the free-form context', async () => {
    vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'demo');
    vi.stubEnv('CLOUDINARY_API_KEY', 'key');
    vi.stubEnv('CLOUDINARY_API_SECRET', 'secret');
    vi.stubEnv('CLOUDINARY_UPLOAD_PRESET', '');

    const res = await uploadBuffer('user_1/abc', Buffer.from([1, 2, 3]), 'image/png');

    expect(res.publicId).toBe('user_1/abc');
    // Structured `metadata` needs a field defined in the account first:
    // without it Cloudinary answers 400 "Metadata External IDs do not exist".
    expect(sent[0]).not.toHaveProperty('metadata');
    expect(sent[0]).toMatchObject({ public_id: 'user_1/abc', context: 'mime=image/png' });
    expect(sent[0]).not.toHaveProperty('upload_preset');
  });
});
