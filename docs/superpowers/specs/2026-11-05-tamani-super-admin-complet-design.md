# Tamani : le super-admin complet (lot 13)

Date : 2026-11-05. Demande du porteur du 2026-11-05 (« Terminons la gestion du superadmin »). Le porteur a choisi de passer les questions (« Vas-y ») : les choix marqués **[choix de l'agent]** sont à vérifier à la lecture.

## 1. Pourquoi

Le support-admin du lot 11 sait lire les chiffres, attribuer ou arrêter un pass, créer un compte et changer un rôle. Le porteur veut piloter Tamani seul, sans passer par le code :
- voir qui s'inscrit et qui paie ;
- modifier un abonnement ;
- offrir des réductions ;
- relancer ses clients ;
- publier des articles ;
- gérer les informations de la plateforme et son équipe d'admins.

## 2. Ce que le porteur a demandé (ses mots)

- **Blog et articles** : gestion des articles de blog (CRUD). La page publique du blog viendra plus tard.
- **Abonnements** : attribution et modification des abonnements (CRUD).
- **Notifications** : les inscriptions et les paiements.
- **E-mail marketing** : relancer les clients pour les abonnements.
- **Paramètres** : informations complètes, et ajout d'admins (CRUD).
- **Codes promo** : gestion des codes promo.

## 3. Règles qui ne changent pas

- **Lire** demande le rôle `ADMIN`. **Écrire** (argent, pass, comptes, réglages, codes, envois, articles) demande `SUPERADMIN`, comme au lot 11.
- **Chaque écriture passe par `logAdminAction`**, donc par le journal.
- **Chaque route** déclare `runtime = 'nodejs'` et suit cet ordre : `withRequestContext` → `verifyCsrf` → rôle → `enforceAdminRateLimit` → zod → transaction → JSON (jamais 204).
- **Fichiers protégés :** aucun n'est modifié (`auth.ts`, `audit.ts`, les middlewares, `api.ts`…).
- **Données personnelles :** jamais de numéro de téléphone, de prénom ou d'e-mail dans un log.
- **Argent :** entiers en FCFA, affichés par `formatMoney`. Un pass ne s'ouvre que sur `verify` → `SUCCESS` (règles SasPay inchangées).
- **Marge :** chaque abonnement garde au moins 70 % de marge après les coûts des fournisseurs (règle du porteur du 2026-10-25). Les codes promo et les envois d'e-mails sont bornés pour la respecter.
- **Le nouveau look du lot 11b :**
  - violet `#5B3FD6` ;
  - barre latérale ;
  - cartes blanches sur fond clair.
  Les nouvelles pages s'y ajoutent, et le menu passe de 4 à 10 entrées.

## 4. Les six chantiers, dans l'ordre de construction [choix de l'agent]

| Ordre | Chantier | Pourquoi à cette place |
|---|---|---|
| 13a | Paramètres et admins, notifications | Le socle : qui administre, et ce qui se passe chaque jour. Ils ne touchent ni au paiement ni à l'inscription. |
| 13b | Abonnements, codes promo | Ils touchent à l'argent : ils viennent une fois le socle en place. |
| 13c | Relances par e-mail | Elles s'appuient sur les abonnements (qui relancer) et sur les réglages (l'expéditeur). |
| 13d | Blog | Il est indépendant et le plus long. Sa page publique reste cachée tant que le porteur ne l'ouvre pas. |

Une branche et une PR par chantier, chacune fusionnée avec l'accord du porteur. Le lot 11c (connexion admin par code e-mail) reste prévu après la fusion de la PR #18.

## 5. 13a — Paramètres et admins

### 5.1 Les informations de la plateforme

Une page « Paramètres » avec un formulaire, enregistré en base (une ligne de réglages, modèle `PlatformSetting`) :

| Champ | Utilisé par |
|---|---|
| Nom affiché (« Tamani ») | les e-mails, le pied de page |
| E-mail de contact | le pied de page, les données structurées |
| WhatsApp du support (lien `wa.me`) | le site, le tiroir du menu, la carte Illimité |
| Lien du groupe de la communauté | la section « Communauté » |
| Facebook, Instagram, TikTok | le pied de page, les données structurées (`sameAs`) |
| Vidéo de présentation (URL) et son affiche | la section vidéo de l'accueil |

- Un champ vide cache le bouton concerné, comme aujourd'hui (`null`).
- Les valeurs actuelles de `LANDING_LINKS` deviennent les valeurs par défaut quand la base est vide ou injoignable.
- Le site public reste statique. Après chaque enregistrement, il est régénéré pour `/`, `/forfaits` et `/llms.txt`.
- Le domaine (`APP_URL`) reste un réglage Vercel, pas un champ : le changer demande un nouveau déploiement. La page le montre, sans le rendre modifiable.

C'est ce qui permettra au porteur de mettre lui-même ses liens Facebook, Instagram et TikTok, et sa vidéo, sans attendre une mise à jour du code.

### 5.2 Les admins

Une section « Admins » dans les Paramètres :

- **La liste :** les comptes `ADMIN` et `SUPERADMIN`, avec le rôle et la date de création du compte. La base ne garde pas la dernière connexion, et l'ajouter toucherait à la connexion : ce n'est pas dans ce lot [choix de l'agent].
- **Ajouter un admin**, par e-mail :
  - si le compte existe, il est promu ;
  - sinon, il est créé déjà vérifié, avec un mot de passe temporaire affiché une seule fois (le chemin du lot 11).
  - Le rôle se choisit : Admin (lecture) ou Super-admin (tout).
- **Modifier :** changer le rôle.
- **Retirer :** le compte redevient un compte normal (`USER`), il n'est pas supprimé.
- **Le dernier super-admin** ne peut être ni retiré, ni rétrogradé (règle du kit, déjà en place).
- **Personne ne se retire soi-même**, pour ne pas se fermer la porte par erreur.

Toutes ces actions réutilisent les routes et les fonctions de rôle du lot 11, et passent par le journal.

## 6. 13a — Notifications

- **Un fil d'activité, calculé à partir des données** [choix de l'agent]. On ne branche rien sur l'inscription ni sur le paiement, qui restent intacts :
  - **inscription :** un compte qui vient de valider son e-mail ;
  - **nouvelle boutique :** une boutique créée ;
  - **paiement :** un pass payé et activé (montant, pass, moyen de paiement) ;
  - **paiement échoué :** un paiement échoué ou expiré, pour pouvoir aider la personne.
- **Une pastille dans le menu** compte ce qui est nouveau depuis la dernière visite de cet admin. Chaque admin a sa propre date de dernière visite (modèle `AdminFeedSeen`).
- **Des filtres :** tout, inscriptions, paiements.
- **Par page :** les 30 derniers jours, 50 lignes, avec « Voir plus ».
- **Ce qui s'affiche :** le prénom et le nom de la boutique, mais pas l'e-mail dans la liste. L'e-mail reste sur la fiche du compte, comme au lot 11.

Plus tard, si le porteur le demande : une notification sur son téléphone à chaque paiement.

## 7. 13b — Abonnements

Une section « Abonnements » :

- **La liste de toutes les boutiques avec leur pass :**
  - le pass ;
  - le début et la fin ;
  - les réponses utilisées sur les réponses incluses ;
  - un état : Essai, Actif, En grâce, Terminé, Sans pass.
- **Les filtres :** l'état, le pass, et « se termine dans 7 jours ».
- **Attribuer :** le formulaire du lot 11, déplacé ici et gardé sur la fiche boutique.
- **Modifier un pass en cours :**
  - repousser ou avancer la date de fin ;
  - changer le nombre de réponses incluses ;
  - changer de pass.
  Chaque modification demande un motif court, écrit au journal. Plus de réponses débloque les réponses en attente (le chemin du lot 8). Une fin avancée dans le passé arrête le pass.
- **Arrêter :** le bouton du lot 11.
- **L'historique de la boutique :** ses paiements et ses pass attribués à la main.

On ne supprime jamais l'historique d'un paiement.

## 8. 13b — Codes promo

- **Un code :**
  - un nom en majuscules (`LANCEMENT`), unique ;
  - une réduction en pourcentage ou en montant ;
  - les pass concernés ;
  - les dates de début et de fin (facultatives) ;
  - un nombre d'utilisations maximum (facultatif) ;
  - « une fois par boutique » (oui par défaut) ;
  - actif ou en pause.
- **La limite [choix de l'agent, pour la règle des 70 %] :** une réduction ne dépasse jamais 50 % du prix du pass. Pour offrir un pass entier, on l'attribue à la main.
- **Le prix minimum :** le montant après réduction reste au-dessus du minimum accepté par SasPay.
- **Pour le client :** un champ « Code promo » sur l'écran « Mon pass », avant de payer.
  - Le serveur vérifie le code et calcule le prix.
  - La session SasPay est créée avec ce prix. Le code et la réduction sont écrits dans la commande.
  - L'utilisation n'est comptée qu'à l'activation, sur `verify` → `SUCCESS`, une seule fois. Un paiement abandonné ne consomme donc pas le code.
- **Les erreurs :** un code faux, expiré, épuisé ou déjà utilisé par la boutique renvoie un message clair (`PROMO_INVALID`, `PROMO_EXPIRED`, `PROMO_EXHAUSTED`, `PROMO_ALREADY_USED`).
- **Dans l'admin :**
  - la liste des codes, avec leurs utilisations et le chiffre d'affaires qu'ils ont apporté ;
  - créer, modifier, mettre en pause, supprimer. Un code déjà utilisé ne se supprime pas, il se met en pause.
- **Le tableau de bord** compte les ventes avec code dans « Encaissé », au montant réellement payé.

## 9. 13c — Relances par e-mail

- **Des segments tout prêts :**
  - essai terminé sans pass ;
  - pass terminé depuis plus de 3 jours ;
  - inscrit sans boutique ;
  - boutique sans produit.
  Le rappel « J-3 avant la fin du pass » est déjà envoyé automatiquement (lot 8) : il n'est pas dans les relances, pour ne jamais écrire deux fois.
- **Écrire une relance :**
  - un objet et un texte simple, avec `{prénom}` et `{boutique}` ;
  - un bouton facultatif (« Reprendre un pass », « Créer ma boutique »), avec un code promo facultatif ;
  - un aperçu, puis un envoi test à soi-même.
- **L'envoi :**
  - il passe par la file d'e-mails existante (`EmailJob`, vidée chaque minute) ;
  - au plus 80 e-mails par jour [choix de l'agent], pour rester sous la limite gratuite de Resend (100 par jour). Le reste part le lendemain, et la page le dit.
- **Le désabonnement :**
  - chaque e-mail a un lien « Ne plus recevoir ces e-mails » (jeton signé) qui coche `marketingOptOut` sur le compte ;
  - un compte désabonné n'est jamais relancé ;
  - les e-mails de service (code de connexion, paiement) continuent.
- **Le suivi :** pour chaque relance, le nombre d'e-mails envoyés et de boutiques qui ont repris un pass dans les 7 jours.
- **Une même personne** n'est pas relancée plus d'une fois par semaine.

## 10. 13d — Blog

- **Un article :**
  - un titre ;
  - une adresse (slug), proposée depuis le titre et modifiable ;
  - un résumé ;
  - une image de couverture, envoyée sur Cloudinary par la route d'envoi existante ;
  - le texte en Markdown simple (titres, gras, listes, liens, images), avec un aperçu à côté ;
  - un titre et une description pour Google (facultatifs, remplis par défaut) ;
  - des mots-clés ;
  - un état : Brouillon ou Publié, avec la date de publication.
- **Dans l'admin :**
  - la liste des articles, avec une recherche et un filtre par état ;
  - créer, modifier, publier ou dépublier, supprimer (avec une confirmation dans la page).
- **La partie publique** [choix de l'agent] :
  - `/blog` (la liste) et `/blog/[slug]` (un article), statiques, régénérées à chaque publication ;
  - dans le sitemap ;
  - données structurées `BlogPosting`.
  - Tant que le porteur ne dit pas « on ouvre le blog », ces pages sont en `noindex` et ne figurent dans aucun menu. Elles restent visibles par lien direct, pour relire un article.
- **Les sujets :** les adresses proposées au lot 12 (spec du 2026-11-05, §8.6) sont reprises comme idées d'articles, avec un bouton « Créer cet article ».

## 11. Le menu du support-admin

1. Tableau de bord
2. Notifications (avec la pastille)
3. Boutiques
4. Abonnements
5. Codes promo
6. Relances e-mail
7. Blog
8. Utilisateurs
9. Journal
10. Paramètres

Sur téléphone, le menu garde le tiroir du lot 11b.

## 12. Hors du lot

- La connexion admin par code e-mail (lot 11c).
- Les notifications sur le téléphone du porteur.
- Un éditeur d'e-mails avec images.
- Des commentaires sous les articles.
- Le choix d'un nouveau fournisseur d'e-mails si le volume dépasse la formule gratuite. Ce sera proposé avec son prix, selon la règle des 70 %.

## 13. Mes choix, à vérifier

1. L'ordre de construction 13a → 13b → 13c → 13d.
2. Les notifications calculées à partir des données, sans toucher à l'inscription ni au paiement.
3. Les liens et la vidéo du site deviennent modifiables dans les Paramètres. Le domaine reste un réglage Vercel.
4. Un admin retiré redevient un compte normal, et personne ne se retire soi-même.
5. Une réduction de 50 % au plus. Pour un pass gratuit, on l'attribue à la main.
6. Le code promo n'est compté qu'au paiement réussi.
7. 80 relances par jour au plus, une par personne et par semaine, toujours avec un lien de désabonnement.
8. Le blog est construit en entier, mais il reste caché aux moteurs de recherche et aux menus jusqu'à ton feu vert.
