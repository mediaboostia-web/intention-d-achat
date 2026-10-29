import { describe, it, expect } from 'vitest';
import { ApiError } from '@/lib/api';
import {
  TAMANI_ERROR_CODES,
  errorMessage,
  passwordErrorMessage,
  uploadErrorMessage,
} from './api-messages';

const apiError = (status: number, error?: string) =>
  new ApiError(status, 'raw', error ? { error } : {});

describe('errorMessage', () => {
  it('errorMessage explains CAMPAIGN_LIMIT_REACHED', () => {
    const text = errorMessage(apiError(409, 'CAMPAIGN_LIMIT_REACHED'));
    expect(text).toContain('une seule campagne');
    expect(text).toContain('brouillon');
  });

  it('has a specific French text for every Tamani code', () => {
    const generic = errorMessage(apiError(400, 'SOMETHING_NEW'));
    for (const code of TAMANI_ERROR_CODES) {
      const text = errorMessage(apiError(400, code));
      expect(text, code).not.toBe(generic);
      expect(text.length, code).toBeGreaterThan(10);
    }
  });

  it('translates the kit auth codes', () => {
    expect(errorMessage(apiError(401, 'INVALID_CREDENTIALS'))).toBe(
      'Email ou mot de passe incorrect.',
    );
    expect(errorMessage(apiError(400, 'PASSWORD_TOO_SHORT'))).toContain('10 caractères');
    expect(errorMessage(apiError(400, 'VERIFICATION_CODE_INVALID'))).toContain('code');
    expect(errorMessage(apiError(429, 'TOO_MANY_LOGIN_ATTEMPTS'))).toContain('minutes');
  });

  it('falls back on the status, and on the network', () => {
    expect(errorMessage(apiError(401))).toContain('session');
    expect(errorMessage(apiError(503))).toContain('Réessaie');
    expect(errorMessage(new TypeError('Failed to fetch'))).toContain('connexion');
    expect(errorMessage(apiError(0))).toContain('connexion');
  });
});

describe('passwordErrorMessage', () => {
  it('speaks of the current password, not of the email', () => {
    expect(passwordErrorMessage(apiError(400, 'INVALID_CREDENTIALS'))).toBe(
      'Ton mot de passe actuel ne correspond pas.',
    );
  });

  it('says a password is already there, and falls back on errorMessage', () => {
    expect(passwordErrorMessage(apiError(409, 'PASSWORD_ALREADY_SET'))).toContain(
      'déjà un mot de passe',
    );
    expect(errorMessage(apiError(409, 'PASSWORD_ALREADY_SET'))).toContain('déjà un mot de passe');
    expect(passwordErrorMessage(apiError(400, 'PASSWORD_BANNED'))).toBe(
      errorMessage(apiError(400, 'PASSWORD_BANNED')),
    );
  });
});

describe('uploadErrorMessage', () => {
  it('uploadErrorMessage covers the upload route codes', () => {
    expect(uploadErrorMessage(413, 'FILE_TOO_LARGE')).toMatch(/trop lourde.*Mo/);
    expect(uploadErrorMessage(415, 'INVALID_MIME')).toContain('JPG, PNG ou WebP');
    expect(uploadErrorMessage(415, 'MAGIC_BYTE_MISMATCH')).toContain('JPG, PNG ou WebP');
    expect(uploadErrorMessage(503, 'STORAGE_NOT_CONFIGURED')).toContain('pas encore activé');
    expect(uploadErrorMessage(502, 'UPLOAD_FAILED')).toContain('Réessaie');
    expect(uploadErrorMessage(0, null)).toContain('connexion');
  });
});

describe('TAMANI_ERROR_CODES', () => {
  it('mirrors the server list', async () => {
    const { TAMANI_ERRORS } = await import('@/lib/server/tamani/errors');
    expect([...TAMANI_ERROR_CODES]).toEqual([...TAMANI_ERRORS]);
  });
});
