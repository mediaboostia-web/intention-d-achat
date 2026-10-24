// Words of the popup and of the shop space for buyer types, reasons for a
// no and suggested quantities (spec §5.3).

export const BUYER_TYPES = ['CONSUMER', 'RESELLER'] as const;
export type BuyerType = (typeof BUYER_TYPES)[number];

/** As the respondent reads it: "Tu achètes pour… Moi / Revendre". */
export const BUYER_TYPE_POPUP_LABELS: Readonly<Record<BuyerType, string>> = {
  CONSUMER: 'Moi',
  RESELLER: 'Revendre',
};

/** As the wholesaler reads it on the dashboard. */
export const BUYER_TYPE_LABELS: Readonly<Record<BuyerType, string>> = {
  CONSUMER: 'Usager',
  RESELLER: 'Revendeur',
};

export const NOT_INTERESTED_REASONS = [
  'TOO_EXPENSIVE',
  'NO_NEED',
  'ALREADY_BOUGHT',
  'OTHER',
] as const;
export type NotInterestedReason = (typeof NOT_INTERESTED_REASONS)[number];

export const NOT_INTERESTED_REASON_LABELS: Readonly<Record<NotInterestedReason, string>> = {
  TOO_EXPENSIVE: 'Trop cher',
  NO_NEED: 'Pas besoin',
  ALREADY_BOUGHT: 'Déjà acheté',
  OTHER: 'Autre',
};

/** Quantity buttons of popup step 3; "+" opens a number field. */
export const QUANTITY_PRESETS: Readonly<Record<BuyerType, readonly number[]>> = {
  CONSUMER: [1, 2, 3, 5],
  RESELLER: [6, 12, 24, 50],
};
