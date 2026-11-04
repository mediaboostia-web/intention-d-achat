// The popup's words for the stock and the end dialog (lot 7a, porteur's
// feedback): « Plus que 200 bouteilles » read as a warning and was
// misunderstood; the end of an answer is a clear, simple dialog.
import { pluralizeUnit } from './verdict-display';

/** "200 bouteilles en stock". */
export function stockLine(quantity: number, unitLabel: string): string {
  return `${quantity} ${pluralizeUnit(unitLabel, quantity)} en stock`;
}

/** « de Riz », « d'Huile »: French elides before a vowel or a mute h. */
function ofProduct(name: string): string {
  return /^[aeiouyhàâäéèêëîïôöùûü]/i.test(name) ? `d'${name}` : `de ${name}`;
}

export interface ThanksCopy {
  title: string;
  lines: string[];
}

export function thanksCopy(i: {
  interested: boolean;
  firstName: string | null;
  shopName: string;
  productName: string;
  unitLabel: string;
  quantity: number | null;
  /** The shop can see the number (porteur, 2026-11-04): only then is a call promised. */
  contactShared: boolean;
}): ThanksCopy {
  if (!i.interested) {
    return {
      title: 'Merci pour ton avis !',
      lines: [`${i.shopName} en tient compte pour ses prochains arrivages.`],
    };
  }
  const what =
    i.quantity === null
      ? ofProduct(i.productName)
      : `${i.quantity} ${pluralizeUnit(i.unitLabel, i.quantity)} ${ofProduct(i.productName)}`;
  const title = i.firstName ? `C'est noté, ${i.firstName} !` : "C'est noté !";
  if (!i.contactShared) {
    return {
      title,
      lines: [
        `Ta demande de ${what} est bien enregistrée.`,
        `Sans la case cochée, ${i.shopName} ne voit pas ton numéro et ne pourra pas te contacter.`,
      ],
    };
  }
  return {
    title,
    lines: [
      `Ta commande de ${what} est bien enregistrée.`,
      `${i.shopName} va te contacter sur WhatsApp pour la confirmer.`,
    ],
  };
}

/** Why the number is asked: a product in stock is booked, an arrival is announced. */
export function contactTitle(interested: boolean, availability: 'IN_STOCK' | 'INCOMING'): string {
  if (!interested) return 'Pour être prévenu des prochains arrivages';
  return availability === 'IN_STOCK'
    ? 'Pour réserver ta commande'
    : "Pour être prévenu à l'arrivée";
}

/** « Propulsé par Tamani » opens the app at its own address (APP_URL), the shop as referrer. */
export function poweredByHref(appUrl: string, shopSlug: string): string {
  return `${appUrl.replace(/\/+$/, '')}/?ref=${encodeURIComponent(shopSlug)}`;
}

/** No pass and the month's ceiling reached (spec §5.6): the product stays, nothing is asked. */
/** The box at the contact step (porteur, 2026-11-04): not required, never ticked for them. */
export function consentLabel(shopName: string): string {
  return `J'accepte que ${shopName} me contacte sur WhatsApp pour ce produit et ses prochains arrivages.`;
}

export function consentNote(shopName: string): string {
  return `Sans cette case, ta réponse compte quand même, mais ${shopName} ne voit pas ton numéro.`;
}

export const ANSWERS_CLOSED_TITLE = 'Réponses fermées pour ce mois';

export function answersClosedLine(shopName: string): string {
  return `${shopName} a reçu toutes les réponses possibles ce mois-ci. Reviens le mois prochain.`;
}
