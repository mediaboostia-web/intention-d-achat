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
  return {
    title: i.firstName ? `C'est noté, ${i.firstName} !` : "C'est noté !",
    lines: [
      `Ta commande de ${what} est bien enregistrée.`,
      `${i.shopName} va te contacter sur WhatsApp pour la confirmer.`,
    ],
  };
}

/** « Propulsé par Tamani » opens the app at its own address (APP_URL), the shop as referrer. */
export function poweredByHref(appUrl: string, shopSlug: string): string {
  return `${appUrl.replace(/\/+$/, '')}/?ref=${encodeURIComponent(shopSlug)}`;
}
