// Request bodies of the Tamani shop routes. zod strips unknown keys, so an
// organizationId sent in a body never reaches Prisma: routes take it from
// the URL after requireOrgRole.
import 'server-only';
import { z } from 'zod';
import { isSupportedCountry } from 'libphonenumber-js/min';
import { checkProductRules } from '@/lib/tamani/product-rules';
import { BUYER_TYPES, NOT_INTERESTED_REASONS } from '@/lib/tamani/labels';
import { isPhoneCountry } from '@/lib/tamani/phone-countries';
import { DEFAULT_SHARE_TEMPLATE } from '@/lib/tamani/share-message';
import { TIMING_OPTIONS, type Timing } from '@/lib/tamani/timing';
import { SHORT_CODE_REGEX } from './short-code';

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
/** What the popup shows of the shop (lot 5b); blank clears it. */
const shopDescription = z
  .string()
  .trim()
  .max(300)
  .nullable()
  .transform((s) => (s ? s : null));
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
    description: shopDescription.optional(),
    coefConsumer: coefficient.optional(),
    coefReseller: coefficient.optional(),
  })
  .refine(nonEmpty, 'Nothing to update');

const zoneName = z.string().trim().min(1).max(60);

/** The lists' search bar (?q=): longer text is a 400. */
export const SEARCH_MAX = 60;
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

export { checkProductRules };

/** ISO 8601 date-time (the front end sends Date#toISOString()). */
const isoDate = z.iso.datetime({ offset: true }).transform((s) => new Date(s));
const quantity = z.number().int().max(10_000_000);

const CampaignFields = z.object({
  title: z.string().trim().min(1).max(80),
  availability: z.enum(['IN_STOCK', 'INCOMING']),
  availableAt: isoDate.nullable(),
  stockQuantity: quantity.min(0).nullable(),
  plannedQuantity: quantity.min(1).nullable(),
  showStock: z.boolean(),
  endsAt: isoDate.nullable(),
  deliveryEnabled: z.boolean(),
  showLiveCounter: z.boolean(),
  shareTemplate: z.string().trim().min(1).max(1000),
});

export const CampaignCreate = CampaignFields.extend({
  productId: z.string().min(1).max(40),
  title: CampaignFields.shape.title.optional(),
  availableAt: CampaignFields.shape.availableAt.default(null),
  stockQuantity: CampaignFields.shape.stockQuantity.default(null),
  plannedQuantity: CampaignFields.shape.plannedQuantity.default(null),
  showStock: CampaignFields.shape.showStock.default(false),
  endsAt: CampaignFields.shape.endsAt.default(null),
  deliveryEnabled: CampaignFields.shape.deliveryEnabled.default(false),
  showLiveCounter: CampaignFields.shape.showLiveCounter.default(true),
  shareTemplate: CampaignFields.shape.shareTemplate.default(DEFAULT_SHARE_TEMPLATE),
  status: z.enum(['DRAFT', 'ACTIVE']).default('ACTIVE'),
});

export const CampaignPatch = CampaignFields.partial()
  .extend({ status: z.enum(['DRAFT', 'ACTIVE', 'CLOSED', 'ARRIVED']).optional() })
  .refine(nonEmpty, 'Nothing to update');

export const LinkCreate = z.object({ label: z.string().trim().min(1).max(60) });

// ── Public popup (lot 5) ────────────────────────────────────────────────
// One step of a respondent's answer: every field is optional, the server
// merges what each tap sends. `website` is a honeypot the popup never fills.
const TIMINGS = [...TIMING_OPTIONS.IN_STOCK, ...TIMING_OPTIONS.INCOMING] as [Timing, ...Timing[]];
const shareCode = z.string().regex(SHORT_CODE_REGEX);

export const viewSchema = z.object({ code: shareCode, deviceId: z.uuid() });

export const responseStepSchema = z
  .object({
    code: shareCode,
    deviceId: z.uuid(),
    website: z.string().max(200).optional(),
    interested: z.boolean().optional(),
    notInterestedReason: z.enum(NOT_INTERESTED_REASONS).nullable().optional(),
    buyerType: z.enum(BUYER_TYPES).optional(),
    quantity: z.number().int().min(1).max(100_000).optional(),
    option: z.string().trim().min(1).max(60).nullable().optional(),
    timing: z.enum(TIMINGS).optional(),
    wantsDelivery: z.boolean().optional(),
    zoneId: z.string().min(1).max(40).nullable().optional(),
    // « Autre endroit »: a place outside the shop's zones, never a control character.
    deliveryPlace: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .refine((v) => [...v].every((ch) => ch.charCodeAt(0) > 31 && ch.charCodeAt(0) !== 127), {
        message: 'No control characters',
      })
      .nullable()
      .optional(),
    firstName: z.string().trim().min(1).max(40).optional(),
    phone: z.string().trim().min(6).max(30).optional(),
    /** The respondent's own country, when it is not the shop's. */
    phoneCountry: z.string().refine(isPhoneCountry, { message: 'Unknown country' }).optional(),
  })
  .refine((s) => (s.firstName === undefined) === (s.phone === undefined), {
    message: 'firstName and phone go together',
  });

export type ResponseStepInput = z.infer<typeof responseStepSchema>;
