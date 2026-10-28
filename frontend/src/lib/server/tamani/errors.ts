// Stable Tamani API error codes (roadmap §Contrats). The front end switches
// on ApiError.code, never on the message; messages are the French default
// a screen may show as is.
import 'server-only';
import { NextResponse } from 'next/server';
import { requestIdHeaders } from './http';

export const TAMANI_ERRORS = [
  'SHOP_ALREADY_EXISTS',
  'SHOP_NOT_FOUND',
  'ZONE_NOT_FOUND',
  'ZONE_ALREADY_EXISTS',
  'PRODUCT_NOT_FOUND',
  'PRODUCT_IN_USE',
  'CAMPAIGN_NOT_FOUND',
  'CAMPAIGN_CLOSED',
  'CAMPAIGN_LIMIT_REACHED',
  'INVALID_CAMPAIGN_TRANSITION',
  'PLAN_FEATURE_LOCKED',
  'INVALID_PHONE',
  'INVALID_RESPONSE_TOKEN',
  'RATE_LIMITED',
  'ORDER_NOT_FOUND',
  'ORDER_ALREADY_EXISTS',
  'INVALID_ORDER_TRANSITION',
  'CLIENT_NOT_FOUND',
  'RESPONSE_NOT_FOUND',
  'RESPONSE_NOT_INTERESTED',
  'BILLING_NOT_CONFIGURED',
  'PAYMENT_VERIFY_FAILED',
  'PUSH_NOT_CONFIGURED',
] as const;

export type TamaniErrorCode = (typeof TAMANI_ERRORS)[number];

const DEFAULT_MESSAGES: Record<TamaniErrorCode, string> = {
  SHOP_ALREADY_EXISTS: 'Tu as déjà une boutique.',
  SHOP_NOT_FOUND: "Tu n'as pas encore de boutique.",
  ZONE_NOT_FOUND: 'Cette zone de livraison est introuvable.',
  ZONE_ALREADY_EXISTS: 'Cette zone de livraison existe déjà.',
  PRODUCT_NOT_FOUND: 'Ce produit est introuvable.',
  PRODUCT_IN_USE: "Ce produit a une campagne en cours. Termine-la d'abord.",
  CAMPAIGN_NOT_FOUND: 'Cette campagne est introuvable.',
  CAMPAIGN_CLOSED: 'Cette campagne est terminée.',
  CAMPAIGN_LIMIT_REACHED: 'Tu as atteint le nombre de campagnes actives de ton forfait.',
  INVALID_CAMPAIGN_TRANSITION: 'Cette campagne ne peut pas passer à ce statut.',
  PLAN_FEATURE_LOCKED: "Cette fonction n'est pas comprise dans ton forfait.",
  INVALID_PHONE: "Ce numéro WhatsApp n'est pas valide.",
  INVALID_RESPONSE_TOKEN: 'Cette réponse ne peut plus être modifiée depuis ce téléphone.',
  RATE_LIMITED: 'Trop de tentatives. Réessaie dans quelques minutes.',
  ORDER_NOT_FOUND: 'Cette commande est introuvable.',
  ORDER_ALREADY_EXISTS: 'Cette réponse a déjà sa commande.',
  INVALID_ORDER_TRANSITION: 'Cette commande ne peut pas passer à ce statut.',
  RESPONSE_NOT_FOUND: 'Cette réponse est introuvable.',
  RESPONSE_NOT_INTERESTED: "Cette personne n'a pas dit oui : pas de commande à créer.",
  CLIENT_NOT_FOUND: 'Ce client est introuvable.',
  BILLING_NOT_CONFIGURED: "Le paiement n'est pas encore disponible.",
  PAYMENT_VERIFY_FAILED: "Le paiement n'a pas pu être vérifié.",
  PUSH_NOT_CONFIGURED: 'Les notifications sur le téléphone ne sont pas encore disponibles.',
};

export function tamaniError(code: TamaniErrorCode, status: number, message?: string): NextResponse {
  return NextResponse.json(
    { error: code, message: message ?? DEFAULT_MESSAGES[code] },
    { status, headers: requestIdHeaders() },
  );
}

/** A Prisma unique-constraint violation (P2002), optionally on one field. */
export function isUniqueViolation(err: unknown, field?: string): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as { code?: unknown; meta?: { target?: unknown } };
  if (e.code !== 'P2002') return false;
  if (field === undefined) return true;
  const target = e.meta?.target;
  if (Array.isArray(target)) return target.includes(field);
  return typeof target === 'string' && target.includes(field);
}
