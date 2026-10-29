import { describe, expect, it } from 'vitest';
import { shopSettingsBody } from './shop-settings';

const values = {
  name: 'Bah Import',
  whatsappPhone: '601123456',
  country: 'GN',
  logoUrl: null,
  description: '  ',
};

describe('shopSettingsBody (lot 7b review)', () => {
  it('leaves the country out when it does not change, so a locked shop keeps saving', () => {
    expect(shopSettingsBody(values, { country: 'GN' })).toEqual({
      name: 'Bah Import',
      whatsappPhone: '601123456',
      logoUrl: null,
      description: null,
    });
  });

  it('sends a new country', () => {
    expect(shopSettingsBody({ ...values, country: 'SN' }, { country: 'GN' })).toMatchObject({
      country: 'SN',
    });
  });

  it('trims the description', () => {
    expect(
      shopSettingsBody({ ...values, description: ' Riz en gros. ' }, { country: 'GN' }).description,
    ).toBe('Riz en gros.');
  });
});
