// What a screen says when an API call fails. Screens switch on the stable
// code (ApiError.code), never on the server's message; every text says
// what happened and what to do next (charter: "La voix").
import { ApiError } from '@/lib/api';

/** Mirror of TAMANI_ERRORS (lib/server/tamani/errors.ts, server only); a test keeps them equal. */
export const TAMANI_ERROR_CODES = [
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

const NETWORK = 'Pas de connexion au serveur. Vérifie ton réseau et réessaie.';
const GENERIC = "Ça n'a pas marché. Réessaie dans un instant.";

const MESSAGES: Record<string, string> = {
  // Tamani
  SHOP_ALREADY_EXISTS: 'Tu as déjà une boutique : on t’y emmène.',
  SHOP_NOT_FOUND: "Tu n'as pas encore de boutique. Crée-la pour commencer.",
  ZONE_NOT_FOUND: "Cette zone n'existe plus. Recharge la page.",
  ZONE_ALREADY_EXISTS: 'Tu as déjà une zone avec ce nom.',
  PRODUCT_NOT_FOUND: "Ce produit n'existe plus. Recharge la liste.",
  PRODUCT_IN_USE: "Ce produit a une campagne en cours. Termine la campagne d'abord.",
  CAMPAIGN_NOT_FOUND: "Cette campagne n'existe plus. Recharge la liste.",
  CAMPAIGN_CLOSED: 'Cette campagne est terminée.',
  CAMPAIGN_LIMIT_REACHED:
    'Tu as déjà 3 campagnes en cours, le maximum du forfait Gratuit. Termine-en une ou passe au Pro. Tu peux aussi enregistrer celle-ci en brouillon.',
  INVALID_CAMPAIGN_TRANSITION: 'Cette campagne ne peut pas passer à ce statut. Recharge la page.',
  PLAN_FEATURE_LOCKED: 'Cette fonction vient avec le forfait Pro.',
  INVALID_PHONE: "Ce numéro WhatsApp n'est pas valide. Vérifie l'indicatif et les chiffres.",
  INVALID_RESPONSE_TOKEN: 'Cette réponse ne peut plus être modifiée depuis ce téléphone.',
  RATE_LIMITED: 'Trop de tentatives. Attends quelques minutes et réessaie.',
  ORDER_NOT_FOUND: "Cette commande n'existe plus. Recharge la liste.",
  ORDER_ALREADY_EXISTS: 'Cette réponse a déjà sa commande.',
  INVALID_ORDER_TRANSITION: 'Cette commande ne peut pas passer à ce statut. Recharge la page.',
  CLIENT_NOT_FOUND: "Ce client n'existe plus. Recharge la liste.",
  RESPONSE_NOT_FOUND: "Cette réponse n'existe plus. Recharge la liste.",
  RESPONSE_NOT_INTERESTED: "Cette personne n'a pas dit oui : il n'y a pas de commande à créer.",
  BILLING_NOT_CONFIGURED: "Le paiement en ligne n'est pas encore ouvert.",
  PAYMENT_VERIFY_FAILED: "On n'a pas pu vérifier ton paiement. Réessaie dans un instant.",
  PUSH_NOT_CONFIGURED: 'Les notifications sur le téléphone ne sont pas encore disponibles.',
  // Kit: auth
  INVALID_CREDENTIALS: 'Email ou mot de passe incorrect.',
  EMAIL_NOT_VERIFIED: "Confirme d'abord ton email avec le code reçu.",
  ACCOUNT_SUSPENDED: 'Ce compte est suspendu. Écris-nous pour en savoir plus.',
  LOCKED_OUT: 'Trop d’essais : ton compte est bloqué quelques minutes. Réessaie plus tard.',
  PASSWORD_TOO_SHORT: 'Ton mot de passe doit faire au moins 10 caractères.',
  PASSWORD_PWNED:
    'Ce mot de passe a fuité sur internet. Choisis-en un autre, que tu n’utilises nulle part ailleurs.',
  PASSWORD_BANNED: 'Ce mot de passe est trop courant. Choisis-en un plus personnel.',
  PASSWORD_ALREADY_SET: 'Tu as déjà un mot de passe : change-le avec ton mot de passe actuel.',
  VERIFICATION_CODE_INVALID: 'Ce code ne correspond pas. Vérifie les 8 caractères reçus par email.',
  VERIFICATION_CODE_EXPIRED: 'Ce code a expiré. Demande un nouveau code.',
  INVALID_REFRESH: 'Ta session a expiré. Connecte-toi à nouveau.',
  UNAUTHORIZED: 'Ta session a expiré. Connecte-toi à nouveau.',
  CONFLICT: 'Ce compte est déjà relié. Connecte-toi avec ton mot de passe.',
  TOO_MANY_LOGIN_ATTEMPTS: 'Trop de tentatives de connexion. Attends 15 minutes et réessaie.',
  TOO_MANY_SIGNUP_ATTEMPTS: "Trop d'inscriptions depuis cet appareil. Attends quelques minutes.",
  TOO_MANY_RESET_REQUESTS:
    'Tu as déjà demandé un code. Attends quelques minutes avant de redemander.',
  TOO_MANY_RESET_ATTEMPTS: 'Trop d’essais de code. Attends quelques minutes et réessaie.',
  TOO_MANY_FORGOT_ATTEMPTS:
    'Tu as déjà demandé un code. Attends quelques minutes avant de redemander.',
  TOO_MANY_VERIFY_ATTEMPTS: 'Trop d’essais de code. Attends quelques minutes et réessaie.',
  TOO_MANY_RESEND_ATTEMPTS: 'Tu as déjà reçu plusieurs codes. Attends quelques minutes.',
  TOO_MANY_REQUESTS: 'Trop de tentatives. Attends quelques minutes et réessaie.',
  RATE_LIMIT_UNAVAILABLE: 'Le service est momentanément indisponible. Réessaie dans un instant.',
  RATE_LIMIT_BACKEND_UNAVAILABLE:
    'Le service est momentanément indisponible. Réessaie dans un instant.',
  // Kit: shop roles and validation
  ORG_ROLE_INSUFFICIENT: 'Seul le gérant de la boutique peut faire ça.',
  VALIDATION_FAILED: 'Certains champs ne sont pas valides. Vérifie-les et réessaie.',
};

function byStatus(status: number): string {
  if (status === 0) return NETWORK;
  if (status === 401) return 'Ta session a expiré. Connecte-toi à nouveau.';
  if (status === 403) return "Tu n'as pas accès à cette action.";
  if (status === 404) return "Cette page n'existe plus. Recharge la liste.";
  if (status === 429) return 'Trop de tentatives. Attends quelques minutes et réessaie.';
  if (status >= 500) return 'Le serveur ne répond pas pour le moment. Réessaie dans un instant.';
  return GENERIC;
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return MESSAGES[err.code] ?? byStatus(err.status);
  if (err instanceof TypeError) return NETWORK;
  return GENERIC;
}

/** A password form (Profil, Réglages): a wrong password there is the current one, not the login. */
export function passwordErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.code === 'INVALID_CREDENTIALS') {
    return 'Ton mot de passe actuel ne correspond pas.';
  }
  return errorMessage(err);
}

/** /api/upload answers { code, message } (not { error }); status 0 = network failure. */
export function uploadErrorMessage(status: number, code: string | null): string {
  switch (code) {
    case 'FILE_TOO_LARGE':
      return 'Cette photo est trop lourde : 10 Mo au plus.';
    case 'INVALID_MIME':
    case 'MAGIC_BYTE_MISMATCH':
    case 'HEIC_CONVERSION_FAILED':
      return 'Ce fichier ne passe pas. Choisis une photo JPG, PNG ou WebP.';
    case 'STORAGE_NOT_CONFIGURED':
      return "L'envoi de photos n'est pas encore activé sur cette installation.";
    case 'UPLOAD_MISSING_FILE':
      return 'Aucune photo reçue. Choisis-la à nouveau.';
    case 'UPLOAD_FAILED':
      return "La photo n'a pas pu être enregistrée. Réessaie.";
  }
  if (status === 0) return NETWORK;
  if (status === 401) return 'Ta session a expiré. Connecte-toi à nouveau.';
  return "La photo n'a pas pu être envoyée. Réessaie.";
}
