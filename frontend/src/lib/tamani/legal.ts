// The legal pages (porteur, 2026-11-04): terms of use, privacy, security and
// the legal notice, in plain words like the rest of Tamani. They describe what
// the code does; change them when it changes. The company is being
// registered: the pages speak for « Tamani », in Cotonou.
import { LANDING_CONTACT_EMAIL } from './landing';

export const LEGAL_ENTITY = {
  name: 'Tamani',
  status: "projet en cours d'immatriculation",
  city: 'Cotonou',
  country: 'Bénin',
  email: LANDING_CONTACT_EMAIL,
} as const;

export const LEGAL_UPDATED = '4 novembre 2026';

export const LEGAL_SLUGS = ['cgu', 'confidentialite', 'securite', 'mentions-legales'] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];

export interface LegalSection {
  title: string;
  body: readonly string[];
}

export interface LegalPageContent {
  path: `/${LegalSlug}`;
  /** Short name for links. */
  label: string;
  title: string;
  description: string;
  sections: readonly LegalSection[];
}

const { email } = LEGAL_ENTITY;
const WHERE = `${LEGAL_ENTITY.city}, ${LEGAL_ENTITY.country}`;

export const LEGAL_PAGES: Record<LegalSlug, LegalPageContent> = {
  cgu: {
    path: '/cgu',
    label: 'CGU',
    title: "Conditions générales d'utilisation",
    description: 'Les règles pour utiliser Tamani : compte, essai, pass et engagements.',
    sections: [
      {
        title: 'Ce que fait Tamani',
        body: [
          "Tamani aide un vendeur (grossiste, importateur, détaillant) à demander à ses clients s'ils veulent acheter un produit, avant de le commander. Tu partages un lien, tes clients répondent en moins de 30 secondes, et Tamani te montre les réponses, une quantité conseillée et les commandes à suivre.",
          'En créant un compte, tu acceptes ces conditions. Si tu ne les acceptes pas, n’utilise pas Tamani.',
        ],
      },
      {
        title: 'Ton compte',
        body: [
          "Tu ouvres ton compte avec ton e-mail (un code t'est envoyé pour le confirmer) ou avec Google. Les informations que tu donnes doivent être vraies.",
          'Tu gardes ton mot de passe pour toi. Tout ce qui est fait depuis ton compte est sous ta responsabilité. Si tu penses que quelqu’un l’utilise sans toi, écris-nous tout de suite.',
          'Un compte a une boutique. Tu peux y inviter des membres : tu restes responsable de ce qu’ils font.',
        ],
      },
      {
        title: "L'essai et les pass",
        body: [
          "L'essai gratuit dure 3 jours ou 50 réponses, la première limite atteinte, pour une campagne.",
          'Ensuite, tu achètes un pass : une durée et un nombre de réponses, payés à l’avance. Les prix sont affichés sur la page des tarifs. Le paiement passe par SasPay (Mobile Money ou carte). Les frais du moyen de paiement sont à ta charge et sont affichés avant de payer.',
          'Pas de renouvellement automatique : rien n’est prélevé sans que tu le décides.',
          'À la fin d’un pass, tu gardes ses fonctions pendant 3 jours de grâce. Les nouvelles réponses au-delà de ton pass sont gardées en attente et s’ouvrent quand tu prends un pass.',
          'Si tu prends un nouveau pass avant la fin du pass en cours, tu gardes les réponses non utilisées. Une fois le pass terminé (grâce comprise), ses réponses non utilisées sont perdues.',
        ],
      },
      {
        title: 'Tes engagements',
        body: [
          'Tu proposes des produits autorisés et tu les décris honnêtement.',
          'Les numéros de tes clients servent seulement à leur parler de tes produits et de leurs commandes. Tu ne les revends pas, tu ne les donnes pas, et tu respectes un client qui ne veut pas être contacté.',
          'Tu n’utilises pas Tamani pour envoyer des messages en masse non désirés, tromper des personnes ou gêner le service.',
        ],
      },
      {
        title: 'Les conseils de Tamani',
        body: [
          "La quantité conseillée et le verdict sont calculés à partir des réponses reçues. C'est une aide, pas une promesse de vente. La décision d'acheter reste la tienne.",
        ],
      },
      {
        title: 'Le service',
        body: [
          'Nous faisons de notre mieux pour que Tamani marche tout le temps, mais une coupure reste possible (maintenance, panne d’un prestataire, réseau).',
          'En cas d’abus de ces règles, nous pouvons suspendre un compte, après t’avoir prévenu quand c’est possible.',
          'Tes produits, photos et textes restent à toi. Tu nous autorises à les afficher pour faire marcher le service. Le nom, le logo et les dessins de Tamani nous appartiennent.',
        ],
      },
      {
        title: 'Changements et droit applicable',
        body: [
          'Si ces conditions changent, nous te prévenons avant qu’elles s’appliquent.',
          `Ces conditions suivent le droit du ${LEGAL_ENTITY.country}. En cas de désaccord, nous cherchons d'abord une solution à l'amiable ; à défaut, les tribunaux de ${LEGAL_ENTITY.city} sont compétents.`,
          `Une question : ${email}.`,
        ],
      },
    ],
  },
  confidentialite: {
    path: '/confidentialite',
    label: 'Confidentialité',
    title: 'Politique de confidentialité',
    description: 'Les données que Tamani garde, pourquoi, combien de temps, et tes droits.',
    sections: [
      {
        title: 'Qui est responsable',
        body: [
          `${LEGAL_ENTITY.name} (${LEGAL_ENTITY.status}), ${WHERE}, est responsable des données de ton compte. Contact : ${email}.`,
          'Les réponses de tes clients appartiennent à ta boutique : tu décides de ce que tu en fais, et Tamani les garde pour toi.',
        ],
      },
      {
        title: 'Les données que nous gardons',
        body: [
          'Ton compte : ton prénom, ton e-mail, ton mot de passe (jamais en clair), ta boutique (nom, pays, numéro WhatsApp, logo, réglages), tes produits, campagnes et commandes.',
          'Les clients qui répondent : leur prénom, leur numéro WhatsApp, leur réponse (oui ou non, quantité, usage, échéance, livraison, quartier ou lieu) et la date. Un identifiant au hasard est gardé sur leur téléphone pour éviter les doublons, avec leur prénom et leur numéro pour remplir la prochaine réponse plus vite.',
          'Le paiement : SasPay traite ton paiement. Nous ne voyons ni ta carte ni ton code Mobile Money.',
        ],
      },
      {
        title: 'Pourquoi',
        body: [
          'Pour faire marcher Tamani : ouvrir ton compte, montrer les réponses, calculer les conseils, suivre les commandes, te prévenir à chaque réponse et gérer ton pass.',
          'Nous ne vendons aucune donnée et nous ne faisons pas de publicité ciblée.',
        ],
      },
      {
        title: 'Combien de temps',
        body: [
          'Ton compte et ta boutique : tant que tu utilises Tamani. Écris-nous pour les supprimer.',
          'Les données d’un client : tu peux les effacer à tout moment depuis sa fiche (« Supprimer les données de ce client »).',
          'Les e-mails envoyés : 30 jours. Les avis de paiement de SasPay : 90 jours, sans numéro ni nom du payeur.',
          'Nos journaux techniques ne contiennent ni numéro, ni prénom.',
        ],
      },
      {
        title: 'Avec qui',
        body: [
          'Seulement les prestataires qui font marcher Tamani, chacun pour sa tâche : Vercel (hébergement du site), Neon (base de données), Upstash (limites contre les abus), Cloudinary (photos et logos), Resend (e-mails), SasPay (paiement), Google (connexion avec Google, si tu la choisis), Sentry (suivi des erreurs) et le service de notifications de ton navigateur.',
          'Certains sont hors du Bénin, par exemple aux États-Unis. Nous leur confions le moins de données possible.',
        ],
      },
      {
        title: 'Cookies',
        body: [
          'Tamani n’utilise que les cookies nécessaires pour te garder connecté et protéger ton compte. Pas de cookie de publicité.',
        ],
      },
      {
        title: 'Tes droits',
        body: [
          `Tu peux demander à voir, corriger ou supprimer tes données, ou t'opposer à leur usage : écris à ${email}. Un client qui a répondu peut faire de même, auprès du vendeur ou de nous.`,
          'Tamani suit le Code du numérique du Bénin (loi n° 2017-20 du 20 avril 2018, modifiée). Tu peux aussi saisir l’APDP, l’Autorité de Protection des Données à caractère Personnel.',
        ],
      },
    ],
  },
  securite: {
    path: '/securite',
    label: 'Sécurité',
    title: 'Sécurité',
    description: 'Comment Tamani protège ton compte, tes clients et tes paiements.',
    sections: [
      {
        title: 'Ton compte',
        body: [
          'Toutes les pages passent par une connexion chiffrée (HTTPS).',
          'Ton mot de passe n’est jamais gardé en clair : il est brouillé avec une méthode faite pour ça.',
          'Un code envoyé par e-mail confirme chaque nouveau compte. Avec Google, seules les adresses vérifiées par Google sont acceptées.',
          'Les sessions sont courtes et renouvelées toutes seules ; les cookies de connexion sont protégés.',
          'Les essais répétés (connexion, inscription, réponses) sont limités pour bloquer les robots.',
        ],
      },
      {
        title: 'Tes clients',
        body: [
          'Chaque boutique ne voit que ses propres données.',
          'Sans pass, les numéros complets de tes clients ne quittent pas nos serveurs.',
          'Nos journaux ne contiennent ni numéro, ni prénom.',
        ],
      },
      {
        title: 'Tes paiements',
        body: [
          'Le paiement se fait sur la page de SasPay. Tamani ne voit ni ta carte ni ton code Mobile Money.',
          'Un pass ne s’ouvre qu’après avoir vérifié le paiement auprès de SasPay, une seule fois.',
        ],
      },
      {
        title: 'Signaler un problème',
        body: [
          `Tu as trouvé une faille ou un comportement anormal ? Écris à ${email}. Nous répondons vite et nous ne poursuivons pas une personne qui signale de bonne foi.`,
        ],
      },
    ],
  },
  'mentions-legales': {
    path: '/mentions-legales',
    label: 'Mentions légales',
    title: 'Mentions légales',
    description: 'Qui édite Tamani et qui l’héberge.',
    sections: [
      {
        title: 'Éditeur',
        body: [
          `${LEGAL_ENTITY.name}, ${LEGAL_ENTITY.status}.`,
          `Siège : ${WHERE}.`,
          `Contact : ${email}.`,
        ],
      },
      {
        title: 'Hébergement',
        body: [
          'Site : Vercel Inc., États-Unis (vercel.com).',
          'Base de données : Neon (neon.tech).',
        ],
      },
      {
        title: 'Propriété',
        body: [
          'Le nom Tamani, son logo, ses dessins et ses textes appartiennent à Tamani. Merci de ne pas les reprendre sans accord.',
        ],
      },
    ],
  },
};
