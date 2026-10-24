// Request bodies of the Tamani shop routes. zod strips unknown keys, so an
// organizationId sent in a body never reaches Prisma: routes take it from
// the URL after requireOrgRole.
import 'server-only';
import { z } from 'zod';
import { isSupportedCountry } from 'libphonenumber-js/min';

/** Drops undefined keys (exactOptionalPropertyTypes vs. Prisma inputs). */
export function compact<T extends object>(o: T): { [K in keyof T]?: Exclude<T[K], undefined> } {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as {
    [K in keyof T]?: Exclude<T[K], undefined>;
  };
}

const nonEmpty = (o: object) => Object.keys(o).length > 0;

/** Output of /api/upload: Cloudinary delivery URLs only. */
export const cloudinaryUrl = z
  .string()
  .max(500)
  .regex(/^https:\/\/res\.cloudinary\.com\/\S+$/, 'Cloudinary URL expected');

const country = z
  .string()
  .regex(/^[A-Z]{2}$/)
  .refine((c) => isSupportedCountry(c), 'Unsupported country');
const shopName = z.string().trim().min(1).max(60);
const rawPhone = z.string().trim().min(1).max(30);
const coefficient = z.number().min(0).max(1);

export const ShopCreate = z.object({
  name: shopName,
  whatsappPhone: rawPhone,
  country: country.default('SN'),
  logoUrl: cloudinaryUrl.optional(),
});

export const ShopPatch = z
  .object({
    name: shopName.optional(),
    whatsappPhone: rawPhone.optional(),
    country: country.optional(),
    logoUrl: cloudinaryUrl.nullable().optional(),
    coefConsumer: coefficient.optional(),
    coefReseller: coefficient.optional(),
  })
  .refine(nonEmpty, 'Nothing to update');

const zoneName = z.string().trim().min(1).max(60);
const sortOrder = z.number().int().min(0).max(10_000);

export const ZoneCreate = z.object({ name: zoneName, sortOrder: sortOrder.default(0) });

export const ZonePatch = z
  .object({ name: zoneName.optional(), sortOrder: sortOrder.optional() })
  .refine(nonEmpty, 'Nothing to update');
