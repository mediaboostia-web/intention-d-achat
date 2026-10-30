# Tamani — Document de conception

- **Date** : 2026-10-24
- **Statut** : brouillon, à valider par le porteur du projet
- **Repo cible** : https://github.com/mediaboostia-web/intention-d-achat (vide à ce jour)
- **Base technique** : starter izikit (Next.js 16 monolithe, déjà installé et vérifié en local)

Légende : ce qui est marqué **[décidé]** vient du porteur du projet. Ce qui est marqué **[choix]** est un choix de conception fait pendant la rédaction, à vérifier en lisant. Ce qui est marqué **[hypothèse]** est une supposition non confirmée.

---

## 1. Intention

Les grossistes africains (surtout les importateurs qui achètent en Chine) commandent **à l'aveugle**. Ils passent leurs commandes sans aucun signal de leur communauté WhatsApp, qui compte pourtant des milliers de personnes : revendeurs, acheteurs finaux et simples abonnés. Résultat : du stock qui dort au grenier, des échantillons achetés « pour voir », de l'argent immobilisé.

**Tamani** permet à un grossiste de **demander à sa communauté, avant d'acheter, qui veut quoi, combien, quand et où**. Il partage un lien sur WhatsApp. La personne qui clique voit un pop-up, répond en moins de 10 secondes, et le grossiste obtient un tableau de bord qui lui dit **quoi commander et en quelle quantité**.

Le nom vient du *tamani*, le tambour parlant du Mali qui servait à annoncer les nouvelles et à rassembler le village. En swahili, *tamani* veut aussi dire « désirer ». Slogan : **« Ta communauté parle. Tu sais quoi acheter. »**

### Le ressenti visé [décidé]
Ce qu'un grossiste doit dire à un autre grossiste : *« Whaou, depuis que j'utilise ce service je connais le statut de mes abonnés, je comprends leurs goûts, j'ai l'impression d'être plus en contact avec eux et je vois réellement ce qui fonctionne. »*
Les trois piliers de marque sont donc : **proximité** (être en contact), **clarté** (voir ce qui marche) et **émerveillement** (« whaou »).

## 2. Pour qui

| | |
|---|---|
| **Cible v1** [décidé] | Grossiste ou importateur (ustensiles de cuisine, cosmétiques, tissus, produits variés) qui vend au prix de gros et à l'unité, avec une communauté WhatsApp de plusieurs centaines à plusieurs milliers de membres. |
| **Répondants** | Les membres de cette communauté : **revendeurs** (achètent en quantité), **usagers / acheteurs finaux** (1 à 3 pièces), **simples abonnés**. Sur mobile, souvent avec un réseau lent, et ils ouvrent les liens depuis WhatsApp. |
| **Écartée pour l'instant** [décidé] | Les vendeurs de nourriture en ligne. Leur vrai besoin est la commande ferme du jour, pas l'intention. Ils pourront venir plus tard avec un modèle « menu du jour » sur le même moteur. |
| **Marché de départ** [décidé, 2026-10-27] | Toute l'Afrique francophone, interface en français. Chaque boutique paie et affiche ses prix dans la monnaie de son pays : FCFA UEMOA (XOF), FCFA CEMAC (XAF), franc guinéen, franc congolais… Le lot « Pays et monnaies » (feuille de route, lot 7b) l'apporte ; jusque-là, tout est en FCFA (XOF). |

## 3. Objectifs, non-objectifs, anti-objectifs

### Objectifs v1
1. Un grossiste crée ses **produits**, lance une **campagne** et la partage en moins de 3 minutes.
2. Un répondant donne son intention **en ~10 secondes la première fois, ~5 secondes ensuite**.
3. Le tableau de bord donne une **quantité à commander recommandée**, détaillée par type d'acheteur, quartier, échéance et source.
4. Le grossiste peut **recontacter** en un clic chaque personne intéressée (WhatsApp).
5. Il **transforme une intention en commande**, suit la livraison, tient un **carnet de clients** et voit leur **fiabilité** (ce qu'ils ont dit face à ce qu'ils ont acheté). Tamani **apprend** de ces commandes pour rendre l'estimation plus juste [décidé].
6. Un **freemium** encaissé par **SasPay** (mobile money et carte).

### Non-objectifs v1 (plus tard, ou jamais)
- **Encaisser en ligne pour le compte du grossiste.** Les commandes sont **enregistrées** dans Tamani, mais l'argent passe en cash ou en mobile money en dehors : le grossiste coche simplement « payé ». La précommande avec acompte en ligne arrivera en v2.
- Envoyer des messages WhatsApp **automatiques** : pas d'API WhatsApp Business en v1.
- Une application mobile native : le web mobile suffit.
- Le modèle « vendeurs de nourriture ».
- Les langues autres que le français, et les devises autres que XOF.
- Le code de vérification par SMS.
- Les équipes (plusieurs utilisateurs par boutique) : en v1.1 [choix].

### Anti-objectifs (ce qui serait un échec même si « ça marche »)
- Un pop-up **lent ou long** (> 10 s, beaucoup de JavaScript, saisies au clavier inutiles).
- **Faire fuiter les contacts** d'une communauté vers un autre grossiste ou un tiers.
- Une interface **froide de banquier** : Tamani doit être chaleureux et humain.
- Présenter une estimation comme une vérité : la quantité recommandée doit toujours montrer **sur quoi elle repose**.
- **Bloquer un répondant** parce que le grossiste a dépassé son quota.
- Copier l'identité de WhatsApp : le vert WhatsApp est réservé au bouton « Partager sur WhatsApp ».

## 4. Critères de succès [hypothèse, à confirmer]
- Temps médian de réponse dans le pop-up : ≤ 10 s à la première visite, ≤ 5 s ensuite.
- Au moins 60 % des personnes qui ouvrent le pop-up envoient une réponse complète.
- Pilote : 10 grossistes lancent au moins une campagne par semaine pendant 4 semaines.
- Au moins 3 grossistes payants deux mois après le lancement.

---

## 5. Le produit

### 5.1 Concepts

| Concept | Rôle |
|---|---|
| **Boutique** | L'espace d'un grossiste : nom, logo, numéro WhatsApp, pays, zones de livraison. Elle s'appuie sur le modèle `Organization` existant du kit. |
| **Produit** [décidé] | Fiche réutilisable : nom, photos, description, unité (pièce, carton, sac de 25 kg…), **prix unitaire**, **prix de gros** avec sa **quantité minimum**, options facultatives (par exemple une couleur) [choix]. |
| **Campagne** [décidé] | Un produit mis en test : **disponibilité** (déjà disponible, ou disponible dans N jours, avec raccourcis 10 et 30 jours), **quantité disponible**, date de fin, message de partage déjà rédigé, livraison proposée ou non. |
| **Lien de partage** [choix] | Chaque campagne a un lien par défaut, et le grossiste peut créer des **variantes par source** (« Groupe Revendeurs Dakar », « Statut WhatsApp »…) pour savoir d'où viennent les réponses. |
| **Répondant** | Une personne identifiée par son **numéro WhatsApp**, propre à chaque boutique : un même numéro chez deux grossistes, ce sont deux répondants distincts. |
| **Réponse** | Intéressé ou non, statut (pour moi / revendre), quantité, option choisie, échéance, livraison et quartier, raison du « non ». Une réponse par répondant et par campagne, modifiable tant que la campagne est ouverte. |
| **Client** | Le nom affiché dans l'interface pour un répondant. Le carnet de clients contient aussi les acheteurs saisis à la main, qui n'ont jamais répondu à une campagne. |
| **Commande** [décidé] | Un achat réel : produit, quantité, prix, livraison ou retrait, quartier, statut, « payé » oui/non. Elle naît d'une réponse « Oui » ou d'une saisie manuelle. Aucun paiement en ligne. |
| **Abonnement** | Le pass de la boutique (essai gratuit ou pass), prépayé pour une période ; sans pass, les nouvelles réponses attendent (§5.6). Dans les sections écrites avant le lot 8, « Gratuit » se lit « Sans pass » et « Pro » se lit « un pass ». |

### 5.2 Parcours du grossiste
1. Inscription **par adresse email** et mot de passe [décidé], puis vérification de l'email par code. La connexion par numéro de téléphone est écartée. « Continuer avec Google » reste proposé, puisqu'il repose aussi sur une adresse email et que le kit l'intègre déjà [choix].
2. Création de la boutique : nom, numéro WhatsApp, pays (Sénégal par défaut), logo, zones de livraison (liste de quartiers ou communes). En v1, **un compte possède une seule boutique** [choix]. Le modèle `Organization` permettra d'en avoir plusieurs plus tard.
3. Création d'un produit : photos (Cloudinary, déjà dans le kit), prix, unité, options.
4. Création d'une campagne : choix du produit, disponibilité, quantité disponible, date de fin, livraison oui/non, message de partage modifiable.
5. Partage : bouton **« Partager sur WhatsApp »** (`wa.me/?text=…`), bouton **« Copier le message »** et création de liens par source.
6. Suivi dans le tableau de bord (§5.4), puis relance des intéressés (§5.5).

**Message de partage par défaut** [choix] : modèle avec des variables `{produit}`, `{prix}`, `{disponibilité}` et `{lien}`. Exemple :
« 🔔 Nouveau : *Marmites inox 5 L* à 7 500 FCFA (gros : 6 000 FCFA dès 12). Arrivage dans 10 jours. Tu en veux ? Réponds en moins de 30 secondes 👉 tamani.app/c/k3P9xQa »

### 5.3 Le pop-up du répondant [décidé dans l'esprit, détails : choix]
Un lien partagé sur WhatsApp s'ouvre dans le navigateur du téléphone. Le « pop-up » est donc une **page web très légère** qui affiche le produit en fond (photo floutée) avec une **feuille qui monte du bas**. Aucun compte à créer.

**Les photos** [décidé, 2026-10-28 ; détails : choix] : au-dessus de la feuille, toutes les photos du produit (6 au plus) défilent du doigt, une par vue.
- Chaque photo est entière, jamais rognée, sur le papier quadrillé. Le fond flou garde la première.
- Des points sous la photo montrent où l'on est, et une touche sur un point y mène. Sur ordinateur, des flèches passent d'une photo à l'autre.
- Sur téléphone, la galerie prend environ 40 % de la hauteur de l'écran, et la feuille défile dans le reste. Sur ordinateur, la photo est grande.
- Le défilement est en CSS (`scroll-snap`), sans librairie d'animation. La première photo est servie en `w_600`, les suivantes se chargent à la demande.

En haut de la feuille, toujours visibles : le nom, le **prix** (le prix de gros s'affiche quand la personne choisit « Revendre »), la disponibilité, et un compteur facultatif du type « 128 personnes intéressées » (activé par défaut, désactivable par le grossiste). La **quantité en stock** n'est pas montrée aux répondants par défaut. Le grossiste peut l'afficher (« Plus que 200 pièces ») avec une option de campagne [choix].

Étapes, **une touche par étape**, et chaque réponse est **enregistrée immédiatement** :
1. **Ça t'intéresse ?** [Oui] [Non]
   - Si c'est non : raison facultative [Trop cher] [Pas besoin] [Déjà acheté] [Autre], puis on passe à l'étape 5.
2. **Tu achètes pour…** [Moi] [Revendre]
3. **Combien ?** Boutons de quantités proposées selon le statut (Moi : 1, 2, 3, 5, + ; Revendre : 6, 12, 24, 50, +). Le « + » ouvre un champ numérique. Si le produit a des options, on choisit l'option ici.
4. **Quand ?** Les choix dépendent de la disponibilité :
   - produit disponible : [Aujourd'hui / demain] [Cette semaine] [Ce mois-ci] ;
   - produit à venir : [Dès l'arrivée] [La semaine suivante] [Plus tard].

   Puis **Livraison ?** [Oui, livre-moi] [Je passe récupérer]. Cette question n'apparaît que si la campagne propose la livraison.
   - « Oui » montre les quartiers de la boutique, puis toujours **« Autre endroit »** [décidé, 2026-10-28], pour les personnes d'un autre quartier, d'une autre ville ou d'un autre pays.
   - « Autre endroit » ouvre un seul champ, « Où ? (quartier, ville ou pays) », de 2 à 80 caractères, puis « Continuer ». Le grossiste voit ensuite avec le client s'il livre.
   - Une boutique sans quartier demande directement « Où ? » après « Oui, livre-moi » [choix].
   - Le lieu tapé s'efface dès qu'un quartier est choisi ou que la personne passe récupérer.
5. **Prénom et numéro WhatsApp** (« Pour être prévenu à l'arrivée »). **Obligatoire** [décidé] pour qu'une réponse soit complète, oui comme non.
   - Le téléphone **mémorise** le prénom et le numéro (stockage local du navigateur). Aux campagnes suivantes, ils sont pré-remplis : « Tu réponds en tant que Awa · 77 •• •• 12 (pas toi ?) ». On ne les retape qu'en changeant de téléphone ou en effaçant les données du navigateur.
   - Après « pas toi ? », le formulaire propose **« C'est bien moi, Awa »** [décidé, 2026-10-28], et « Retour » ramène aussi Awa : une fausse touche ne fait rien perdre. La mémoire du téléphone n'est remplacée que lorsqu'un nouveau numéro est envoyé [choix].
   - Le numéro est vérifié sur son **format**, sans SMS.
   - Le champ porte un **choix du pays** [décidé, 2026-10-28], pour les clients à l'étranger. Par défaut, c'est le pays de la boutique ; la liste donne ensuite les autres pays de Tamani, puis tous les autres pays, nommés en français [choix]. Un numéro tapé avec « + » ou « 00 » l'emporte sur ce choix.
   - Le serveur vérifie le code pays reçu, puis lit le numéro dans ce pays. Un pop-up qui n'envoie pas de pays (ouvert avant cette version) prend celui de la boutique.
   - Une phrase de consentement s'affiche sous le champ : « Ton numéro est partagé uniquement avec *{Boutique}* pour te recontacter au sujet de ce produit. »
6. Écran de remerciement : « Merci Awa ! *{Boutique}* te préviendra. » Il affiche le récapitulatif, un bouton « Modifier ma réponse » et, sur le forfait Gratuit, la mention « Propulsé par Tamani ».

Une **réponse partielle** (la personne a quitté avant l'étape 5) est conservée comme « incomplète » : elle compte dans les statistiques d'abandon mais pas dans l'estimation [choix].

### 5.4 Le tableau de bord

#### 5.4.0 Au premier coup d'œil [structure validée sur maquette le 2026-10-24 ; style à refaire au lot 2]
Le grossiste ne lit pas de graphiques. Il voit **un verdict, un chiffre et ce qu'il doit faire maintenant**.

- **Verdict par campagne à venir** (`INCOMING`, produit pas encore acheté) [choix pour les seuils] : il répond à « combien commander ? ».
  - Quantité de référence : la quantité que le grossiste **prévoit de commander** (`plannedQuantity`), sinon le stock annoncé (`stockQuantity`).
  - Ratio = estimation réaliste / référence.
  - Si moins de **20 réponses complètes** : ⚪ « On attend (n/20) ».
  - Ratio ≥ 0,9 : 🟢 « Commande ~X ».
  - 0,4 ≤ ratio < 0,9 : 🟠 « Prudence ~X ».
  - Ratio < 0,4 : 🔴 « N'achète pas (ou très peu) ».
  - Sans quantité de référence : verdict neutre « Demande ~X ».
- **Campagne déjà en stock** (`IN_STOCK`) [décidé, 2026-10-28 ; détails : choix] : il n'y a rien à commander, et les intéressés veulent acheter maintenant. La question devient « mon stock va-t-il suffire ? ». Pas de verdict, et **jamais « On attend »** :
  - **« À servir maintenant »**, en haut de l'onglet Résultats dès la première réponse intéressée comptée : « 6 intéressés · 12 bouteilles », réparti par échéance (aujourd'hui ou demain, cette semaine, ce mois-ci), puis le bouton « Voir les intéressés ». Ce ne sont que des comptes : visible sur tous les forfaits, numéros masqués en Gratuit ;
  - **l'état du stock** compare l'estimation réaliste R (§5.4.1) au stock S (`stockQuantity`, jamais `plannedQuantity`). Si R ≤ S, le tampon vert « Stock suffisant » porte le stock (« 30 pièces en stock ») et dit « Il t'en restera environ S − R ». Si R > S, le tampon orange « Réassort ~X » dit « Rupture probable : prévois un réassort d'environ X », avec X = R − S, arrondi comme les quantités du verdict ;
  - sous 20 réponses comptées, l'état s'affiche quand même, avec « Estimation provisoire : N réponses sur 20 » ;
  - sans stock indiqué, pas d'état : une phrase invite à indiquer le stock dans la campagne pour savoir s'il suffira ;
  - l'état repose sur l'estimation, donc il suit les règles d'accès du verdict : fonction `estimate` du forfait, ou verdict offert (§5.6), qu'une campagne en stock peut recevoir comme une autre. Sans accès, une carte verrouillée « Ton stock va-t-il suffire ? » porte le badge Pro ;
  - la jauge de la demande dit « en stock S » au lieu de « prévu S ».
- **L'argent**, visible seulement si le produit a un **prix d'achat** (`costPrice`, facultatif), et comme le verdict, seulement à partir de 20 réponses comptées :
  - stock dormant évité = max(référence − réaliste, 0) × prix d'achat, pour une campagne à venir seulement : une marchandise en stock est déjà achetée ;
  - bénéfice attendu = Σ réaliste par statut × (prix de vente du statut − prix d'achat). En stock, la demande réaliste est plafonnée au stock [choix] ;
  - sur l'accueil, « Argent protégé ce mois-ci » = somme du stock dormant évité des campagnes à venir créées dans le mois.
- **Accueil de la boutique (« bulletin du jour »)** :
  - une ligne-verdict par campagne active. Celle d'une campagne en stock montre « N à servir » et l'état du stock (« Stock suffisant », « Réassort ~X », ou « À servir » sans stock ni accès) au lieu du mot du verdict [choix] ;
  - **Depuis hier** : réponses complètes des dernières 24 h, nouveaux revendeurs, meilleur groupe (le lien de source avec le plus de réponses sur 7 jours) ;
  - **À faire maintenant** : commandes à confirmer, livraisons confirmées groupées par quartier, campagnes arrivées avec des intéressés à prévenir.
- **Page campagne** [décidé, 2026-10-28 ; détails : choix] :
  - à côté du titre, l'état de la campagne (badge « En cours »…) ;
  - sous le titre, les **actions**, de vrais boutons dont le verbe dit ce qui se passe : « Le produit est arrivé » (bouton principal, pour une campagne à venir en cours ou terminée), « Terminer la campagne » (plus discret, avec une confirmation), « Lancer la campagne » (brouillon) et « Rouvrir la campagne » (terminée). Une campagne en stock n'a jamais « Le produit est arrivé » ;
  - puis une **barre d'onglets** en texte, avec un trait jaune sous l'onglet ouvert : Résultats, Intéressés, Partager, Modifier. Les quatre tiennent à largeurs égales sur un téléphone de 360 pixels.
- **En tête de l'onglet Résultats** : pour une campagne à venir, le verdict en grand, la fourchette et la base (« d'après 94 réponses · 68 % intéressés »), l'argent évité et le bénéfice, revendeurs face à usagers, la demande face à la référence, puis « Où et quand » et le signal prix. Pour une campagne en stock, « À servir maintenant » et l'état du stock prennent la place du verdict.

**Par campagne (détail) :**
- Ouvertures du lien, réponses complètes, réponses incomplètes, taux d'intérêt.
- **Demande annoncée** (somme des quantités) et **estimation réaliste** (§5.4.1), affichées face au **stock disponible** (par exemple « demande 340 / stock 200 → rupture probable »).
- Répartition par **statut** (revendeurs et usagers), **quartier** (puis « Retrait sur place » et « Autre endroit : N »), **échéance** (personnes et quantités), **option**, **source** (lien), et **raisons du non** (le signal prix « trop cher »).
- Liste des intéressés : prénom, numéro (bouton WhatsApp), statut, quantité, option, quartier ou lieu (« Livraison · Lomé »), échéance, date. Filtre oui ou non. « Télécharger pour Excel » ouvre la page Exporter (§5.5.4) sur cette campagne et ce filtre.

**Vue d'ensemble de la boutique :** campagnes en cours, comparaison des produits testés, meilleures sources, nombre total de répondants (la communauté identifiée).

#### 5.4.1 Quantité recommandée [choix, v1 volontairement simple]
- Estimation réaliste = Σ quantités des réponses « Oui » complètes × **coefficient de concrétisation** par statut. Valeurs par défaut : usagers 0,5 ; revendeurs 0,7. Le grossiste peut les modifier dans ses réglages.
- Affichage : « Demande annoncée : 340 · Estimation réaliste : ~210 (fourchette 170–250) » avec un lien « Comment c'est calculé ? ». La fourchette correspond au coefficient ± 0,1.
- Les réponses signalées comme suspectes (§6.5) sont exclues par défaut.
- **Coefficients appris** [choix] : dès que la boutique a assez de commandes réelles (§5.5.3), Tamani remplace les coefficients par défaut par ses vrais taux de concrétisation. L'écran l'indique : « d'après tes 3 dernières campagnes, 72 % des revendeurs achètent vraiment ».

### 5.5 Après la réponse : relancer les intéressés [choix]
Pas d'envoi WhatsApp automatique en v1, car l'API officielle de Meta est payante et soumise à validation.
- Un bouton **« Écrire sur WhatsApp »** par répondant, qui ouvre `wa.me/<numéro>?text=<message pré-rempli>`.
- Un bouton **« Copier les numéros des intéressés »** pour créer une liste de diffusion WhatsApp.
- Une action **« Le produit est arrivé »** sur une campagne à venir : elle prépare le message d'annonce et marque la campagne « arrivée ». Une campagne en stock ne l'a pas.
- Sur chaque réponse « Oui », un bouton **« Transformer en commande »** (§5.5.1).

### 5.5.1 Commandes [décidé, détails : choix]
- **Création** :
  - depuis une réponse « Oui », la commande est pré-remplie avec le produit, la quantité, le statut acheteur, la livraison et le quartier. **Une seule commande par réponse** : une seconde tentative répond `409 ORDER_ALREADY_EXISTS`, et une réponse « Non » ne se convertit pas (`409 RESPONSE_NOT_INTERESTED`). L'option choisie (taille, couleur) et un lieu tapé après « Autre endroit » passent dans la note de la commande (« Couleur : Rouge », « Lieu : X »), que chaque ligne de commande affiche, tournées comprises [choix, lot 7] ;
  - ou **à la main** depuis `/app/commandes`, avec le produit, le client (prénom et numéro) et la quantité. Le client est retrouvé par son numéro, ou ajouté au carnet s'il n'y est pas ; un prénom manquant est complété, jamais remplacé. Le numéro se lit avec l'indicatif de la boutique, sauf s'il commence par « + » ou « 00 » [choix, lot 7].
- **Prix figé au moment de la commande** : prix de gros si le client est revendeur et que la quantité atteint `wholesaleMinQty`, sinon prix unitaire. Le grossiste peut corriger le prix unitaire avant de confirmer ; ensuite le prix ne change plus. Une quantité corrigée garde le prix figé [choix, lot 7]. Total = prix × quantité, en entier FCFA.
- **Statuts** : `À confirmer` → `Confirmée` → `Livrée` (ou `Récupérée` si c'est un retrait), ou `Annulée` à tout moment avant la livraison. Livrée et annulée sont définitives ; un autre passage répond `409 INVALID_ORDER_TRANSITION`, et deux onglets qui changent la même commande en même temps n'écrivent qu'une fois. « Annuler » demande une seconde touche. Le statut « payé » oui/non est indépendant, avec la date du paiement.
- **Vues** :
  - liste filtrable par statut, campagne et produit ;
  - **« À livrer par quartier »** : les commandes confirmées à livrer, groupées par zone (« Sans quartier » à la fin), avec le total des pièces par produit, pour préparer les tournées. Un retrait n'y figure pas. Cette vue ignore les autres filtres ;
  - sur la page campagne, un onglet **Commandes** : commandes et quantités confirmées face au stock. Stock restant affiché = stock − quantités confirmées et livrées. C'est un affichage, pas une réservation bloquante : il peut passer sous zéro ;
  - sur l'accueil, dans « À faire maintenant » : les commandes à confirmer, puis les livraisons par quartier, avant les annonces d'arrivée.
- Bouton WhatsApp sur chaque commande. Pour une commande confirmée, le message est pré-rempli (« Ta commande de 3 marmites est confirmée… ») ; sinon la conversation s'ouvre vide [choix, lot 7].
- Un produit qui a des commandes ne se supprime pas : il est archivé [choix, lot 7].

### 5.5.2 Clients [décidé, détails : choix]
- **Le carnet est dynamique** [décidé] : dès qu'une personne termine sa réponse à une campagne, elle **s'ajoute automatiquement** aux clients (ou sa fiche est mise à jour). Chaque intérêt reste **relié à un produit précis, une campagne précise et une date**.
- **Une seule vue** dans `/app/clients`, une ligne par client. La vue « Intérêts » (une ligne par réponse) est abandonnée depuis le lot 5b : chaque réponse se lit sur la fiche du client et dans l'export des réponses (§5.5.4).
- **Filtres** [décidé, 2026-10-28 ; détails : choix], combinables entre eux et avec la recherche (prénom, ou numéro à partir du Pro), gardés dans l'adresse de la page :
  - **type** : revendeurs ou usagers ;
  - **réponse** : intéressé ou pas intéressé ;
  - **campagne** : une campagne de la boutique ;
  - **quartier** : un quartier, ou « Autre endroit » ;
  - **période** : ce mois-ci, le mois dernier, les 3 derniers mois, ou l'un des 12 derniers mois ;
  - **pays** : le pays du numéro ;
  - **a commandé** oui/non (lot 7) : au moins une commande qui n'est pas annulée.
- **Une même réponse** : un client correspond quand une même réponse comptée remplit ensemble tous les filtres de réponse (type, réponse, campagne, quartier, période). « Intéressé, campagne riz, octobre » veut dire une réponse qui est les trois à la fois, pas trois réponses. Le pays s'applique au numéro du client.
- **À l'écran** : un bouton « Filtrer » ouvre une feuille avec les filtres. Les filtres actifs s'affichent en pastilles sous la recherche, chacune avec sa croix, puis « Tout effacer ». Un bouton « Exporter » ouvre la page Exporter avec ces filtres.
- En Gratuit, les filtres marchent et les numéros restent masqués. Le pays se lit côté serveur sur l'indicatif, sans jamais envoyer le numéro ; il reste visible, puisqu'il n'en dit pas plus que l'indicatif [choix].
- Exemple d'usage : « tous les revendeurs de Médina intéressés par la campagne des marmites en octobre, qui n'ont pas encore commandé ».
- **Fiche client** : prénom, numéro (bouton WhatsApp), statut, quartier habituel, historique des réponses et des commandes, montant total acheté (commandes livrées ou récupérées), **note libre** du grossiste (1 000 caractères), et, à partir du Pro, la **fiabilité** (« a dit oui 5 fois, a acheté 4 fois · 80 % »).
- Un client entré par une commande à la main, sans réponse, est dans le carnet. Il compte dans « Tous » et dans aucun type [choix, lot 7].
- La suppression à la demande (§6.9), réservée aux administrateurs de la boutique, anonymise la fiche : le prénom, le numéro, la note du grossiste et les notes de ses commandes sont effacés, et un lieu tapé après « Autre endroit » devient « Autre endroit ». Les réponses et les commandes restent comptées, sans identité. La fiche disparaît des listes ; c'est définitif.

### 5.5.3 Apprentissage de la fiabilité [choix]
- **Fiabilité d'un client** = nombre de réponses « Oui » suivies d'une commande livrée ou récupérée, divisé par le nombre de réponses « Oui » sur des campagnes terminées (`CLOSED`, `ARRIVED`, ou `ACTIVE` dont la fin est passée). Les deux nombres ne comptent que les campagnes terminées. Elle s'affiche à partir de 2 réponses « Oui » terminées, à partir du Pro.
- **Une campagne n'apprend qu'une fois suivie en commandes** [choix, revue du lot 7] : au moins une commande faite depuis ses réponses, et aucune encore à confirmer ou confirmée. La fiabilité et le coefficient ne lisent que ces campagnes. Sans cette règle, une boutique qui note ses commandes ailleurs « apprendrait » que personne n'achète, et ses verdicts passeraient à STOP ; pendant les livraisons d'une campagne arrivée, les réponses pas encore converties pèseraient comme des refus.
- **Coefficient appris par statut** (usagers et revendeurs) = Σ quantités livrées ou récupérées / Σ quantités annoncées, calculé sur les réponses « Oui » des campagnes terminées de la boutique. Une réponse sans quantité n'y entre pas. Il ne s'applique qu'à partir de **20 réponses « Oui » réparties sur au moins 2 campagnes terminées, pour chaque statut séparément** [choix, lot 7]. En dessous, on garde le coefficient par défaut ou celui saisi dans les réglages. Le résultat est arrondi au centième, puis borné à [0,1 ; 1]. Il ne sert qu'à partir du Pro ; l'estimation dit alors « appris de tes commandes ».

### 5.5.4 Exporter [décidé, 2026-10-28 ; détails : choix]
Les fichiers servent aux relances : le grossiste voit ce qu'il exporte et choisit quoi exporter.
- **La page « Exporter »** (`/app/exporter`) s'ouvre depuis « Télécharger pour Excel » (onglet Intéressés, avec la campagne et le filtre déjà choisis) et depuis la page Clients (avec ses filtres). Ses choix restent dans l'adresse.
- **Quoi** : les **réponses** (intéressés, pas intéressés, ou toutes), une ligne par réponse ; ou les **clients**, une ligne par client.
- **Filtres** : pour les réponses, campagne (une ou toutes), période, quartier ou « Autre endroit », échéance, type et pays ; pour les clients, les filtres du carnet (§5.5.2).
- **Aperçu** : le nombre de lignes (« 142 lignes »), puis les 10 premières avec les colonnes du fichier, dans un tableau qui défile dans son cadre. Il se met à jour quand un filtre change. Sans aucune ligne : « Rien à exporter avec ces filtres. »
- **« Télécharger (142 lignes) »** donne un CSV lisible directement dans Excel : UTF-8 avec BOM, séparateur `;`, fins de ligne CRLF, et une apostrophe devant toute cellule qui commencerait une formule (`=`, `+`, `-`, `@`, tabulation, retour chariot), lieu tapé compris. 20 000 lignes au plus. Le nom du fichier dit quoi et quand : `tamani-interesses-riz-2026-10-28.csv`.
- **« Copier les numéros »** prend les mêmes filtres, pour les relances : chaque numéro une fois, 5 000 au plus.
- **Colonnes** :
  - réponses : date, produit, prénom, numéro WhatsApp, pays, intéressé, raison du non, achète pour, quantité, option, quand, livraison, quartier, lieu, source ;
  - clients : prénom, numéro WhatsApp, pays, achète pour, quartier le plus fréquent, nombre de réponses, nombre de « oui », date et produit de la dernière réponse.
- **Accès** : télécharger et copier demandent `respondentContacts` et `csvExport`. L'aperçu est ouvert à tous ; en Gratuit, ses numéros sont masqués et les deux boutons cèdent la place à « Passe au Pro pour télécharger ».

### 5.6 Forfaits prépayés [décidé : principe le 2026-10-27, grille du porteur le 2026-10-29]

**Principe du porteur (2026-10-27), comme le crédit téléphone :**
- on paie des **réponses**, jamais des campagnes ;
- tout est **prépayé** : avec Mobile Money, rien n'est prélevé tout seul ;
- le lien d'une campagne **ne s'arrête jamais** à cause d'un paiement.

Pourquoi (observations du porteur dans les communautés du Bénin, du Togo et du Gabon) :
- des grossistes ont 10 000 à 111 000 membres et publient 5 à 25 produits par jour. Avec 1 % de réponses, 111 000 membres et 20 produits font environ 22 000 réponses par jour : un forfait mensuel serait vide en quelques heures ;
- des importateurs ont des groupes de 190 à 600 personnes et un arrivage tous les un ou deux mois : ils ne paieront pas un mois entier ;
- des crédits comptés par campagne seraient réutilisés à vie en modifiant la même campagne ;
- le mot « crédit » est flou pour un grossiste ; « réponse » ne l'est pas.

**Grille du porteur (2026-10-29)** : « ne pas freiner l'achat, mais permettre à tous d'acheter ». Les prix sont en FCFA, le même chiffre en XOF et en XAF (les deux francs CFA sont à parité). Les noms ont été simplifiés le même jour, à la demande du porteur, sur le modèle des pass de crédit téléphone.

| | **Essai gratuit** | **Pass Semaine** | **Pass 2 Semaines** | **Pass Mois** | **Pass Mois Plus** | **Pass Mois Max** | **Pass Illimité** |
|---|---|---|---|---|---|---|---|
| Prix | 0 | 3 900 | 5 900 | 9 900 | 14 900 | 24 900 | sur devis |
| Durée | 3 jours | 7 jours | 14 jours | 30 jours | 30 jours | 30 jours | 30 jours |
| Réponses incluses | 50 | 150 | 350 | 1 000 | 2 500 | 5 000 | selon le devis |
| Campagnes en cours | 1 | Illimitées | Illimitées | Illimitées | Illimitées | Illimitées | Illimitées |
| Statistiques, commandes, carnet de clients | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Verdict et quantité recommandée | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Numéros des clients et boutons WhatsApp | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Fiabilité des clients et coefficients appris | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Liens par groupe (un lien par source) | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Export pour Excel | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mention « Propulsé par Tamani » | Oui | Non | Non | Non | Non | Non | Non |
| Membres d'équipe | 1 | 1 | 1 | 1 | 1 | 1 | à définir |

- **Essai gratuit** [décidé, 2026-10-29] : il démarre à la création de la boutique, pour 3 jours ou 50 réponses, la première limite atteinte. Il ouvre tout sauf les liens par groupe et l'export, et le pop-up garde la mention « Propulsé par Tamani » avec son lien.
- **Sans pass** [décidé, 2026-10-29] : il n'y a plus de Gratuit permanent. Après l'essai, ou après un pass et sa grâce, le lien continue de marcher, mais chaque nouvelle réponse est gardée **en attente** jusqu'à l'achat d'un pass. Les statistiques des réponses déjà ouvertes, les commandes et le carnet de clients restent accessibles, numéros masqués et boutons WhatsApp verrouillés (« Prends un pass pour contacter Awa »). Une seule campagne en cours [choix : la même limite que l'essai].
- **Plus de réponses** [décidé, 2026-10-29] : pas de recharges, les seuls prix sont les pass. Un grossiste qui manque de réponses prend un autre pass : il démarre tout de suite et garde les réponses non utilisées du pass en cours.
- **Pass 12 mois** : retiré au lancement (porteur, 2026-10-29).
- **Pass Illimité** : sur devis, par le support. Son prix couvre au moins 1,1 FCFA par réponse attendue, pour garder la marge de 70 % (par exemple 55 000 FCFA pour 50 000 réponses par mois). Il s'attribue à la main depuis l'admin (lot 9, `shop.plan_grant`).
- **Toutes les campagnes partagent les réponses du pass** : les campagnes sont illimitées, mais chaque réponse, quelle que soit sa campagne, compte dans le même total. Un **compteur** le montre partout, téléphone compris (demande du porteur, 2026-10-27) : réponses utilisées sur le total, date de fin du pass, détail par campagne, alerte à 80 % et à 100 %, bouton pour prendre un pass.
- **Période** : les réponses d'un pass se comptent de son début à la fin de sa grâce. Un pass acheté pendant un autre pass démarre tout de suite et garde les réponses non utilisées du pass en cours [décidé, 2026-10-29 : rien de ce qui est payé ne se perd].
- **Pas de renouvellement automatique** : rappel 3 jours avant la fin, puis 3 jours de grâce (le pass garde ses fonctions, avec un bandeau), puis « Sans pass ». Les campagnes continuent ; les numéros se masquent à nouveau.
- **Au-delà des réponses incluses, on ne perd jamais une réponse** [choix] : elle est enregistrée mais **en attente** (« 87 réponses en attente »). Elle s'ouvre dès que le grossiste prend un pass, les plus anciennes d'abord. Le répondant, lui, ne voit jamais de blocage.
- **Plafond sans pass** [décidé, 2026-10-27] : au-delà d'environ 1 000 réponses enregistrées dans le mois calendaire (en attente comprises), la fiche du produit reste visible mais affiche « Réponses fermées pour ce mois ». Elle ne demande plus ni quantité ni numéro. Tamani compte seulement les visites, et le grossiste voit combien de personnes ont voulu répondre. C'est honnête envers le répondant, et un grand groupe sans pass ne nous coûte pas d'argent (règle des 70 % de marge). Un pass payé n'atteint jamais ce plafond : un autre pass ajoute des réponses.
- **Marge** (vrais tarifs SasPay relevés le 2026-10-29 avec `GET /pricing/my-rates/`) : on compte 6 % d'encaissement (le pire réseau est à 5,7 %, au Congo ; 3,5 % au Bénin et au Cameroun), 4,5 % de retrait (le pire réseau relevé) et 0,25 FCFA de serveur par réponse (le double de l'estimation). Les offres gardent de 84,5 % (Mois Max) à 88,5 % (Semaine) avec la grille du 2026-10-29 au soir (Mois Plus 2 500 réponses, Mois Max 5 000). Le Mois Max reste au-dessus de 70 % tant qu'une réponse coûte moins de 0,97 FCFA. Depuis que le client paie les frais, l'encaissement ne coûte plus rien à Tamani : les 6 % restent comptés par prudence.
- **Ce qui coûte à chaque envoi** (WhatsApp officiel, IA, plus tard) se paiera de la même façon, prépayé, avec sa marge de 70 %.
- La mention « Propulsé par Tamani » renvoie vers la page d'accueil avec `?ref=<slug-boutique>` pour mesurer le bouche-à-oreille.
- **Verdict offert** [décidé, 2026-10-27] : sans pass, la première campagne qui atteint 20 réponses comptées reçoit son verdict complet, une fois pour toutes. Depuis l'essai (qui a le verdict), il ne joue que pour une boutique dont l'essai n'a pas atteint 20 réponses.
- **Page d'accueil** (porteur, 2026-10-29) : la grille se lit comme une rangée de cartes qu'on fait glisser sur téléphone (quatre visibles avec des flèches sur ordinateur). Chaque carte montre le nom, le prix, « durée · réponses », une ligne « pour qui » et « Choisir » ; le Pass Mois Max porte « Le meilleur prix par réponse » (5 FCFA la réponse, contre 6 pour le Mois Plus) ; le Pass Illimité a « Contacter le support ». Une ligne dessous : « Mobile Money ou carte · Pas de renouvellement automatique · Campagnes illimitées ».

### 5.7 Paiement : SasPay [décidé]
- SasPay est une API REST unique pour le mobile money et la carte, en Afrique de l'Ouest et du Centre. Elle propose une page de paiement hébergée (*checkout session*) et des webhooks signés.
- **Pas de prélèvement récurrent** côté SasPay : chaque pass se paie d'avance.
  - J-3 avant la fin d'un pass : rappel par email et notification dans l'app, avec un lien vers l'achat.
  - À la fin : **3 jours de grâce** avec un bandeau d'avertissement (porteur, 2026-10-27).
  - Ensuite : « Sans pass ». Les données sont conservées et les nouvelles réponses attendent.
- **Frais** [décidé, 2026-10-29, puis changé le soir même] : le client paie les frais de SasPay en plus du prix (`fee_charge_mode: ADD_ON`, par exemple 3 900 + 137 FCFA au Bénin). SasPay les affiche sur sa page avant le paiement.
- **Pays** [décidé, 2026-10-29] : le paiement s'ouvre d'abord dans la zone du franc CFA, dans les 10 pays où SasPay encaisse (relevé du 2026-10-29) : Sénégal, Côte d'Ivoire, Mali, Burkina Faso, Togo, Bénin, Niger, Cameroun, Gabon et Congo. Ailleurs (Guinée-Bissau, Tchad, Centrafrique, Guinée équatoriale, Guinée, RDC), l'achat affiche « Bientôt disponible ».
- Bictorys, prévu par défaut dans le kit, est **retiré** [choix].

### 5.8 Identité visuelle
- **Nom** [décidé] : Tamani. Le domaine `tamani.app` est libre au 2026-10-24 et sera acheté plus tard par le porteur du projet. `gettamani.com` est également libre.
- **Direction** [hypothèse, à produire avec le skill `ui-ux-pro-max`] : chaleureuse et humaine. Couleurs inspirées du bois et du cuir du tambour (ocre, terracotta) et de l'indigo des tissus d'Afrique de l'Ouest, avec un neutre crème. Logo : silhouette du *tamani* (tambour en sablier) qui se lit aussi comme une bulle de parole ou une onde sonore. Typographie de titres avec du caractère, et une police de texte très lisible sur petit écran.
- **Exigence du porteur du projet** [décidé] : la maquette du 2026-10-24 valide la **structure** du tableau de bord, **pas son style**. L'identité et les écrans doivent atteindre un niveau de design exceptionnel, sans rien de générique. On présentera plusieurs pistes sur maquettes avant de valider.
- **Outils** : le skill `ui-ux-pro-max` (déjà installé) produit le logo SVG, la palette, la typographie et les tokens. Le dépôt `claudedesignskills` (fourni par le porteur du projet) ne contient **pas** d'outil de design system ni de logo : uniquement de l'animation et de la 3D. On ne l'utilise que pour les animations du tableau de bord et de la page d'accueil (par exemple `motion-framer`), **jamais dans le pop-up**, où les animations restent en CSS pour respecter le budget de performance (§6.6).

---

## 6. Architecture technique (sur la base izikit)

### 6.1 Garder, retirer, ajouter

| Brique du kit | Décision | Pourquoi |
|---|---|---|
| Auth (email, code, JWT, CSRF), Google OAuth | **Garder** | Comptes des grossistes. |
| Multi-tenancy (`Organization`, `requireOrgRole`) | **Garder et activer** | Une organisation = une boutique. Les routes de la boutique utilisent `requireOrgRole`. |
| Uploads Cloudinary | **Garder** | Photos des produits, logo de la boutique. |
| Emails Resend, file d'emails, outbox, notifications | **Garder** | Rappels d'abonnement, emails transactionnels. |
| Upstash Redis (limitation de débit, verrous) | **Garder** | Indispensable pour protéger les routes publiques du pop-up. |
| Back-office admin et journal d'audit | **Garder et étendre** | Admin Tamani : boutiques, abonnements, paiements, attribution manuelle d'un forfait (journalisée). |
| Sentry, observabilité | **Garder** | |
| `Order` et la tâche `order-expiration` | **Garder** | `Order` enregistre les paiements d'abonnement SasPay. La tâche expire les paiements jamais finalisés. |
| Paiements Bictorys et webhook Bictorys | **Retirer** (procédure PRUNING.md) | Remplacés par SasPay. |
| Retraits (`Withdrawal`, PIN, routes, admin) | **Retirer** (PRUNING.md) | Aucun reversement d'argent en v1. |
| Interface `PaymentProvider`, `CircuitBreaker` | **Garder** | SasPay est branché derrière l'interface existante. |
| Gestionnaire de webhooks générique (protégé) | **Garder tel quel** | On ajoute seulement un fournisseur `webhook/saspay.ts` (signature, lecture du contenu, identifiants). |

**Procédure de retrait** : suivre les 9 étapes de [PRUNING.md](../../../PRUNING.md) pour `payments-bictorys`, `webhooks-bictorys` et `withdrawals`, y compris la mise à jour des tests de garde-fou. Ceux qui sont concernés : `claude-md-shape` (qui mentionne les retraits), `env-shape` (avertissement `WITHDRAWAL_BALANCE_CHECK`) et `vercel-json-shape` (liste exacte des tâches planifiées).

### 6.2 Modèle de données (Prisma), première version [choix, à affiner par le constructeur]
Tous les montants sont des **entiers en FCFA** (règle du kit). Les nouveaux modèles portent `organizationId`.

- `Organization` (existant) **+** `whatsappPhone`, `country` (ISO-2), `currency` (`XOF`), `logoUrl`, `coefConsumer` (défaut 0,5), `coefReseller` (défaut 0,7).
- `DeliveryZone` : `organizationId`, `name`, `sortOrder`.
- `Product` : `organizationId`, `name`, `description?`, `unitLabel`, `unitPrice`, `wholesalePrice?`, `wholesaleMinQty?`, `costPrice?` (prix d'achat, jamais montré aux répondants), `photos` (JSON, URLs Cloudinary), `optionLabel?` (par exemple « Couleur »), `options` (liste de chaînes), `archivedAt?`.
- `Campaign` : `organizationId`, `productId`, `title`, `availability` (`IN_STOCK` | `INCOMING`), `availableAt?`, `stockQuantity?`, `plannedQuantity?` (quantité que le grossiste prévoit de commander), `showStock` (défaut `false`), `endsAt?`, `deliveryEnabled`, `showLiveCounter`, `shareTemplate`, `status` (`DRAFT` | `ACTIVE` | `CLOSED` | `ARRIVED`), `closedAt?`. Le statut effectif se calcule à la lecture à partir de `endsAt`, sans tâche planifiée.
- `CampaignLink` : `campaignId`, `code` (court, unique, base62, 7 caractères), `label`, `isDefault`, `openCount`.
- `Respondent` (le « client » dans l'interface) : `organizationId`, `phoneE164?`, `firstName?`, `notes?`, `firstSeenAt`, `lastSeenAt`, `anonymizedAt?`. Unique sur (`organizationId`, `phoneE164`). Le pays d'un client n'a pas de champ : il se lit sur l'indicatif de `phoneE164`.
- `SaleOrder` (commande client, distincte du modèle `Order` du kit qui sert aux paiements d'abonnement) : `organizationId`, `respondentId`, `productId`, `campaignId?`, `responseId?` (unique : une commande par réponse), `buyerType`, `quantity`, `unitPrice` (prix figé), `totalAmount`, `fulfillment` (`DELIVERY` | `PICKUP`), `zoneId?`, `status` (`TO_CONFIRM` | `CONFIRMED` | `FULFILLED` | `CANCELLED`), `paid`, `paidAt?`, `notes?`, `confirmedAt?`, `fulfilledAt?`, `cancelledAt?`.
- `Response` : `campaignId`, `linkId?`, `respondentId?`, `deviceId`, `interested?`, `notInterestedReason?`, `buyerType?` (`CONSUMER` | `RESELLER`), `quantity?`, `option?`, `timing?`, `wantsDelivery?`, `zoneId?`, `deliveryPlace?`, `completedAt?`, `locked` (quota dépassé), `suspicious`. Unique sur (`campaignId`, `deviceId`) et sur (`campaignId`, `respondentId`).
  - `deliveryPlace` (lot 6b, migration `8c_delivery_place`) : le lieu tapé après « Autre endroit » (§5.3), de 2 à 80 caractères, sans espaces aux bouts ni caractère de contrôle. Il n'est gardé que pour une livraison sans quartier : il passe à `null` dès qu'un quartier est choisi ou que la personne passe récupérer, et il est refusé sur une campagne sans livraison.
- `Subscription` : `organizationId` (unique), `plan` (`FREE` | `PRO` | `BUSINESS`), `currentPeriodEnd?`, `graceUntil?`.
- `Order` (existant) : paiement d'abonnement, avec `metadata = { organizationId, plan, months }`, `provider = 'saspay'` et `providerChargeId` = identifiant SasPay.
- Les achats réels, qui servent à la fiabilité, sont les `SaleOrder` au statut `FULFILLED`. Aucun modèle supplémentaire.

Index à prévoir : `Response(campaignId, completedAt)`, `Response(campaignId, locked)`, et un comptage mensuel par boutique (jointure `Campaign.organizationId`, ou `organizationId` dénormalisé sur `Response` si le comptage est trop lent [à décider par le constructeur]).

### 6.3 Routes API (nouvelles)
Toutes respectent les invariants du kit : `export const runtime = 'nodejs'` et `withRequestContext`. Les routes de la boutique utilisent `requireAuth` ou `requireOrgRole` et `verifyCsrf`.

- **Boutique** : `POST /api/shops`, `GET|PATCH /api/shops/[orgId]`, zones (`/api/shops/[orgId]/zones`).
- **Produits** : CRUD sous `/api/shops/[orgId]/products`.
- **Campagnes** : CRUD sous `/api/shops/[orgId]/campaigns`, liens (`…/campaigns/[id]/links`), statistiques (`…/campaigns/[id]/stats`), répondants (`…/campaigns/[id]/responses`) et leurs numéros (`…/campaigns/[id]/responses/numbers`).
- **Export** (§5.5.4) : `GET /api/shops/[orgId]/exports/preview` (aperçu de 10 lignes, tous forfaits, numéros masqués sans `respondentContacts`), `…/exports/file` (le CSV) et `…/exports/numbers` (les numéros). La requête porte les choix de la page Exporter (`quoi=reponses|clients`, puis les filtres).
- **Commandes** : CRUD sous `/api/shops/[orgId]/orders` (filtres par statut, campagne, produit et zone ; vue « à livrer » groupée par zone), plus la conversion `POST …/campaigns/[id]/responses/[responseId]/order`.
- **Clients** : `GET /api/shops/[orgId]/clients`, avec les filtres du §5.5.2 dans l'adresse (type, réponse, campagne, quartier, période, pays, recherche ; « a commandé » au lot 7). Plus `GET|PATCH /api/shops/[orgId]/clients/[respondentId]` (fiche et note) et `DELETE` (anonymisation).
- **Compte** : `PATCH /api/account` (le nom affiché dans le Profil). Le mot de passe passe par les routes du kit.
- **Accueil** : `GET /api/shops/[orgId]/summary` (verdicts des campagnes actives, argent protégé du mois, « Depuis hier », « À faire maintenant »).
- **Facturation** : `POST /api/shops/[orgId]/billing/checkout` (crée l'`Order` et la session SasPay), `GET /api/shops/[orgId]/billing` (pass en cours, compteur, achats) et `GET /api/shops/[orgId]/billing/orders/[orderId]` (rapprochement au retour de paiement).
- **Webhook** : `POST /api/webhooks/saspay`.
- **Public (pop-up)** : `POST /api/public/views` (ouverture), `POST /api/public/responses` (création ou mise à jour, étape par étape, avec le lieu de livraison et le pays du numéro).
- **Tâches planifiées** : `GET /api/cron/subscription-renewals` (quotidienne : rappel J-3, début de grâce, fin du pass) et `GET /api/cron/billing-verify` (rapprochement des achats en attente).

### 6.4 Pages
- **Public** : `/` (accueil), `/tarifs`, `/c/[code]` (le pop-up), `/confidentialite`, `/cgu`.
- **Auth** : `/login`, `/signup`, `/verify-email`, `/forgot-password`, `/reset-password`, adaptées des exemples dans `examples/frontend-pages/`.
- **Grossiste** (`/app/*`, protégé par le `src/proxy.ts` du kit, ex-`middleware.ts`, via `AUTH_PROTECTED_PREFIXES=/app,/admin`) : `/app` (vue d'ensemble), `/app/produits`, `/app/campagnes`, `/app/campagnes/nouvelle`, `/app/campagnes/[id]` (statistiques, répondants, commandes, liens, partage), `/app/commandes` (liste et « à livrer par quartier »), `/app/clients`, `/app/clients/[id]` (fiche), `/app/exporter` (§5.5.4), `/app/abonnement`, `/app/reglages`, `/app/plus` (tout ce que la barre du bas n'a pas la place de montrer) et `/app/profil` (nom, e-mail, mot de passe, déconnexion, ouvert par l'avatar).
- **Admin Tamani** : `/admin/*` (boutiques, abonnements, paiements, utilisateurs, journal).
- **Mise en page** : utiliser des groupes de routes Next (`(public)`, `(app)`, `(admin)`). Les providers `AuthProvider` et `ToastProvider`, aujourd'hui dans la mise en page racine, descendent dans `(app)` et `(admin)`. Ainsi, le pop-up ne charge ni le JavaScript de session ni l'appel `/api/auth/me`.

### 6.5 Routes publiques du pop-up : sécurité
- **Pas de CSRF** sur `/api/public/*` [choix, exception justifiée] : le répondant n'a **aucun cookie d'authentification**, donc aucune autorité implicite à détourner. Le droit de modifier sa réponse passe par un **jeton signé** (identifiant de réponse et identifiant d'appareil) renvoyé par le serveur, stocké dans le `localStorage` et envoyé dans un en-tête. Cette exception doit être documentée dans `CLAUDE.md`.
- **Identifiant d'appareil** : UUID généré au premier passage et gardé dans le `localStorage`.
- **Limitation de débit** (Upstash) : par adresse IP et par campagne (par exemple 30 écritures / 10 min / IP), avec un champ piège invisible contre les robots.
- **Une réponse par numéro et par campagne**, et une par appareil et par campagne. Si un même appareil soumet plusieurs numéros sur une même campagne, ces réponses sont marquées `suspicious` et exclues de l'estimation par défaut.
- **Cloisonnement** : un répondant n'existe que dans la boutique qui l'a collecté. Aucune route ne permet à une boutique de lire les répondants d'une autre. Des tests doivent le prouver.

### 6.6 Pop-up : budget de performance [choix]
- Page rendue côté serveur, avec très peu de JavaScript côté client sur `/c/[code]` (objectif ≤ 60 Ko compressés), sans librairie d'animation (transitions CSS seulement).
- Images servies par Cloudinary avec `f_auto,q_auto,w_600`.
- Objectif d'affichage principal (LCP) < 2,5 s en 3G rapide.
- Compatible avec les navigateurs intégrés : WebView ou Chrome Custom Tabs sur Android, SFSafariViewController sur iOS.
- **Aperçu WhatsApp** : `generateMetadata` et `opengraph-image` par campagne (photo du produit, nom, prix). C'est ce qui donne envie de cliquer.
- Le compteur « X intéressés » se charge à l'ouverture et se met à jour après la réponse. Pas de temps réel en v1. Si on en veut plus tard, le kit recommande Ably.

### 6.7 Intégration SasPay
- Base `https://api.saspay.me/api/v1`, `Authorization: Bearer sk_test_…` en développement ou `sk_live_…` en production, **appels uniquement côté serveur**. SasPay ne propose pas de clé de test à ce compte (porteur, 2026-10-29) : on développe avec la clé live, les tests automatiques ne la lisent jamais, et un vrai paiement n'a lieu qu'avec l'accord du porteur.
- Nouvelles variables d'environnement : `SASPAY_API_KEY` et `SASPAY_WEBHOOK_SECRET`. On les ajoute à `.env.example` et au schéma `env.ts` comme fournisseur facultatif : si elles sont absentes, la facturation répond 503, sur le modèle des autres fournisseurs du kit.
- **Paiement** : session de checkout hébergée (`POST /checkout-sessions/` ; champs obligatoires : `amount`, `currency`, `customer_email`, `customer_name` ; on envoie aussi `country`, `return_url`, `metadata` et `fee_charge_mode: ADD_ON`). Les montants partent en **chaînes décimales** (`"9900.00"`), convertis depuis l'entier FCFA à la frontière. Les vraies réponses sont enveloppées (`{ success, data, code }`), contrairement aux exemples de l'OpenAPI (relevé du 2026-10-29). Une session expire au bout d'une heure par défaut. L'OpenAPI ne prévoit pas d'`Idempotency-Key` sur cette route : un double appel crée seulement une deuxième session non payée. On crée donc une session par `Order` et on réutilise son `checkout_url` enregistré.
- **Lien entre un paiement et notre `Order`** (lu dans l'OpenAPI, 2026-10-29) : le corps du webhook (`{ event, data: { id, reference, status, amount, … } }`) ne porte ni l'identifiant de la session ni nos métadonnées. Le webhook est donc un **signal** :
  1. le checkout crée un `Order` `PENDING` qui garde l'identifiant de la session (`providerChargeId`) et son `checkout_url` ;
  2. le webhook vérifié enregistre l'événement (`WebhookLog`, dédoublonnage) et réveille le rapprochement après sa réponse, jamais dans sa transaction (plafond de 2 s de Neon) ;
  3. le rapprochement lit `GET /checkout-sessions/{id}/status/`. Sur `PAID`, il vérifie `GET /payments/{transaction_id}/verify/` et n'active le pass que sur `SUCCESS`, une seule fois (`Order.activatedAt`), puis ouvre les réponses en attente ;
  4. le rapprochement est idempotent. Il tourne depuis la page de retour, depuis le signal du webhook et depuis la tâche planifiée `billing-verify`, le filet de sécurité : rien n'est perdu si l'un des trois manque.
- **Webhook** : on vérifie `X-Webhook-Signature`, un HMAC-SHA256 en hexadécimal de `${X-Webhook-Timestamp}.${corps brut}`. On rejette si l'horodatage s'écarte de plus de 300 s. Événements : `transaction.success` → `paid`, `transaction.failed` ou `transaction.cancelled` → `failed`. Le webhook se configure **uniquement depuis le tableau de bord SasPay**.
- **Erreurs** : `401` (clé refusée, sans nouvel essai), `403`, `404`, `409`, `422` et `429` (on espace les appels) ont chacun un comportement défini ; le `CircuitBreaker` du kit protège les appels.
- **CDF et GNF** : le paiement n'y est pas ouvert ; la conversion d'un montant CDF (deux décimales en ISO 4217) se décidera à leur ouverture.

### 6.8 Tâches planifiées et hébergement
- Une nouvelle tâche : `subscription-renewals` (quotidienne), plus les 6 tâches du kit. Il faut mettre à jour le garde-fou `vercel-json-shape`.
- ⚠️ **Le forfait gratuit de Vercel (Hobby) ne lance les tâches planifiées qu'une fois par jour.** Or le kit fait tourner l'outbox et la file d'emails chaque minute. Deux solutions : Vercel Pro (environ 20 $/mois), ou un planificateur externe gratuit qui appelle les routes avec `Authorization: Bearer ${CRON_SECRET}`. On tranchera au moment du déploiement.

### 6.9 Données personnelles
- Consentement affiché sous le champ du numéro (§5.3) et page `/confidentialite`. Le cadre de référence au Sénégal est la CDP (loi 2008-12).
- Un répondant peut demander la suppression de ses données : en v1, par une action d'un administrateur de la boutique (« Supprimer les données de ce client », lot 7, ce que §5.5.2 décrit) ou de l'admin. L'action est journalisée avec les seuls identifiants.
- Les numéros n'apparaissent jamais dans les journaux, grâce à la masquage des données personnelles déjà prévue dans le `logger` du kit.

---

## 7. Contraintes
- Les invariants du kit (CLAUDE.md) s'appliquent : `runtime = 'nodejs'`, montants entiers, outbox pour les effets de bord, journal d'audit pour toutes les actions d'admin, liste des fichiers protégés.
- Environnement serverless (Vercel et Neon) : pas de processus de longue durée, pas de WebSocket maison.
- Mobile d'abord, réseau lent, navigateurs intégrés à WhatsApp.
- Interface en français, montants en FCFA (XOF).
- La machine de développement est sous Windows (voir les pièges notés lors de l'installation : génération du client Prisma, fins de ligne, délai des tests).

## 8. Découpage en lots (ordre proposé)
1. **Fondations** : brancher le repo `intention-d-achat` en conservant l'historique git du kit. `origin` devient `intention-d-achat`, et le kit d'origine reste accessible sous le nom `upstream` pour récupérer ses futures corrections [choix]. Inclure les 3 corrections Windows des scripts déjà faites en local. Puis renommer en Tamani, retirer Bictorys et les retraits (PRUNING.md), mettre à jour CLAUDE.md et README, groupes de routes et mises en page.
2. **Identité** : logo, palette, typographie et tokens (skill `ui-ux-pro-max`), intégrés à Tailwind v4.
3. **Comptes et boutique** : pages d'auth, création de la boutique, zones, réglages.
4. **Produits** : liste, création, modification, photos.
5. **Campagnes et partage** : création, liens par source, message, partage WhatsApp, aperçu OpenGraph.
6. **Pop-up** : `/c/[code]`, routes publiques, mémoire de l'appareil, protections, budget de performance.
7. **Tableau de bord** : statistiques, quantité recommandée, liste des répondants, relance WhatsApp, export CSV, vue d'ensemble.
8. **Commandes et clients** : conversion d'une réponse en commande, commandes manuelles, statuts, vue « à livrer par quartier », carnet et fiche client, fiabilité, coefficients appris.
9. **Forfaits prépayés et SasPay** : essai gratuit, pass, réponses en attente et plafond sans pass, checkout, webhook, vérification, rappels, grâce, grille de la page d'accueil.
10. **Admin Tamani, page d'accueil, pages légales.**
11. **Mise en production** : Vercel, domaine, tâches planifiées, Sentry, compte SasPay en mode live.

Ensuite :
- **v1.1** : équipes, action « Produit arrivé » enrichie, comparateur de campagnes.
- **v2** : précommande avec acompte en ligne, API WhatsApp Business, autres langues (wolof, anglais), modèle « vendeurs de nourriture ».

## 9. Laissé au constructeur
- Le détail des noms de champs, des index et des migrations Prisma.
- La forme exacte des réponses JSON et des codes d'erreur (en suivant les conventions du kit : codes stables, `ApiError.code`).
- Le choix de la librairie de validation des numéros (par exemple `libphonenumber-js` en version minimale).
- La génération des codes courts et l'algorithme anti-collision.
- La mise en page précise des écrans, dans le cadre de l'identité visuelle produite au lot 2.
- La stratégie de tests (unitaires Vitest, conformes au kit), avec une obligation : tester le cloisonnement entre boutiques, les quotas et verrouillages, la signature du webhook SasPay et l'idempotence de l'activation.

## 10. Choix faits pendant la rédaction (à vérifier)
1. « Continuer avec Google » gardé en plus de l'inscription par email (l'email lui-même a été décidé par le porteur du projet).
2. Options produit (par exemple une couleur) en v1, avec un seul choix.
3. Liens de partage par source.
4. Réponses partielles conservées comme « incomplètes ».
5. Coefficients de concrétisation par défaut : usagers 0,5 et revendeurs 0,7, modifiables.
6. Réponses au-delà du quota verrouillées, jamais refusées.
7. Grâce de 3 jours, puis « Sans pass » (2026-10-27, 2026-10-29).
8. Pas de CSRF sur les routes publiques, remplacé par un jeton signé dans un en-tête.
9. Pas d'animation JavaScript dans le pop-up.
10. Équipes en v1.1.
11. Bictorys retiré.
12. Export CSV au format Excel français.
13. Stock caché aux répondants par défaut, affichable par campagne.
14. Une boutique par compte en v1.
15. Historique git du kit conservé, avec izikit en `upstream`.
16. Commandes et carnet de clients ouverts à tous (numéros masqués sans pass) ; fiabilité et coefficients appris pendant l'essai et avec un pass.
17. Prix figé à la commande (gros si revendeur et quantité ≥ minimum), modifiable avant confirmation.
18. Stock restant affiché sans réservation bloquante.
19. Seuil d'apprentissage : 20 réponses « Oui » sur au moins 2 campagnes terminées. Fiabilité d'un client affichée dès 2 réponses « Oui » terminées.
20. Une seule commande par réponse ; une commande manuelle crée le client s'il n'existe pas.

## 11. Risques
- **Écart entre intention et achat** : il est corrigé par les coefficients appris, mais **seulement si le grossiste enregistre ses commandes**. Si on n'y prend pas garde, il gérera ses ventes sur WhatsApp et Tamani n'apprendra rien. La conversion d'une réponse en commande doit donc tenir en **un geste**.
- **Les sondages WhatsApp natifs sont gratuits** : la différence doit rester visible (quantité, statut, regroupement de toutes les sources, quantité recommandée).
- **Faux numéros** sans vérification par SMS : limités par le contrôle de format, les répondants suspects et le fait que le répondant a intérêt à être prévenu.
- **Rattachement des paiements SasPay** : à confirmer dans la spécification OpenAPI (§6.7).
- **Coût d'hébergement** des tâches planifiées chaque minute (§6.8).
- **Disponibilité du nom de domaine** : `tamani.app` était libre le 2026-10-24, mais n'est pas réservé.
