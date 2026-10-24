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

/** Integer FCFA, strictly positive. "7 500", 7500.5 and 0 are refused. */
const price = z.number().int().min(1).max(100_000_000);

const ProductFields = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(1000).nullable(),
  unitLabel: z.string().trim().min(1).max(30),
  unitPrice: price,
  wholesalePrice: price.nullable(),
  wholesaleMinQty: z.number().int().min(2).max(100_000).nullable(),
  costPrice: price.nullable(),
  photos: z.array(cloudinaryUrl).max(6),
  optionLabel: z.string().trim().min(1).max(30).nullable(),
  options: z
    .array(z.string().trim().min(1).max(30))
    .max(12)
    .refine((o) => new Set(o).size === o.length, 'Duplicate option'),
});

export const ProductCreate = ProductFields.extend({
  description: ProductFields.shape.description.default(null),
  unitLabel: ProductFields.shape.unitLabel.default('pièce'),
  wholesalePrice: ProductFields.shape.wholesalePrice.default(null),
  wholesaleMinQty: ProductFields.shape.wholesaleMinQty.default(null),
  costPrice: ProductFields.shape.costPrice.default(null),
  photos: ProductFields.shape.photos.default([]),
  optionLabel: ProductFields.shape.optionLabel.default(null),
  options: ProductFields.shape.options.default([]),
});

export const ProductPatch = ProductFields.partial().refine(nonEmpty, 'Nothing to update');

/** Rules across fields, checked on a new product and on the merged product of a PATCH. */
export function checkProductRules(p: {
  unitPrice: number;
  wholesalePrice: number | null;
  wholesaleMinQty: number | null;
  optionLabel: string | null;
  options: readonly string[];
}): string | null {
  if ((p.wholesalePrice === null) !== (p.wholesaleMinQty === null)) {
    return 'wholesalePrice and wholesaleMinQty go together';
  }
  if (p.wholesalePrice !== null && p.wholesalePrice >= p.unitPrice) {
    return 'wholesalePrice must be below unitPrice';
  }
  if ((p.optionLabel === null) !== (p.options.length === 0)) {
    return 'optionLabel and options go together';
  }
  return null;
}
