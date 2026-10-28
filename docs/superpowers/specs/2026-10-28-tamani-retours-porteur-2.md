# Tamani — Retours du porteur après le test du lot 6 (complément de conception)

Ce document complète [2026-10-24-tamani-design.md](2026-10-24-tamani-design.md), qui reste la référence, et le premier document de retours ([2026-10-25](2026-10-25-tamani-retours-porteur.md)). Il consigne ce que le porteur a demandé le 2026-10-28, après avoir testé le tableau de bord (lot 6) avec un compte de recette, sur une campagne réelle (« Livre de commerce 300 pages », en stock).

- `[décidé]` : choisi par le porteur.
- `[choix]` : proposé par moi, à corriger s'il le faut.

## 0. Ordre et périmètre [décidé]

- **Ordre** : d'abord le lot **6b « Retouches »** (ce document, sauf §10), puis le **lot 7** (commandes), puis le **travail UX/UI** de toute l'app.
- **Branche** : les retouches vont sur la branche du lot 6 (`plan/06-tableau-de-bord`). La PR attend la fin du lot 6b.
- Les filtres des clients (§5), prévus au lot 7, passent au lot 6b, **sauf** le filtre « a commandé », qui a besoin des commandes.

## 1. Produit déjà en stock : servir d'abord, puis l'état du stock [décidé, détails : choix]

Le constat du porteur : quand quelqu'un se dit intéressé par un produit déjà en boutique, pourquoi le verdict dit-il d'attendre ? Cette personne a donné un délai pour être servie.

Le verdict actuel répond à « combien commander ? ». Cette question a du sens pour un produit **à venir** (`INCOMING`), qui n'est pas encore acheté. Pour un produit **en stock** (`IN_STOCK`), il n'y a rien à commander. Les intéressés veulent acheter maintenant, et la vraie question est « mon stock va-t-il suffire ? ».

**Ce qui change, pour les campagnes `IN_STOCK` uniquement.** Les campagnes `INCOMING` gardent le verdict du lot 6 sans changement.

1. **« À servir maintenant »** :
   - en haut de l'onglet Résultats, dès la première réponse comptée intéressée ;
   - affiche « N intéressés · Q {unités} », réparti par échéance, la plus proche d'abord (aujourd'hui ou demain, cette semaine, ce mois-ci) ;
   - bouton « Voir les intéressés » ;
   - visible sur tous les forfaits : ce ne sont que des comptes. En Gratuit, les numéros restent masqués dans la liste.
2. **L'état du stock** compare la demande réaliste (même calcul et mêmes coefficients qu'au lot 6) au `stockQuantity` :
   - demande ≤ stock : le tampon dit **« Stock suffisant »** (vert), avec la phrase « Il t'en restera environ S − R {unités} » ;
   - demande > stock : le tampon dit **« Réassort ~X »** (orange), avec la phrase « Rupture probable : prévois un réassort d'environ X {unités} », où X = R − S, arrondi comme les quantités du lot 6 ;
   - sous 20 réponses comptées, l'état s'affiche quand même, avec la mention « Estimation provisoire : N réponses sur 20 » [choix]. **Jamais « On attend »** sur un produit en stock ;
   - sans `stockQuantity` : pas d'état du stock. Une phrase invite à indiquer le stock dans la campagne pour savoir s'il suffira.
3. **Accès** : l'état du stock utilise l'estimation, donc il suit les mêmes règles que le verdict du lot 6 :
   - fonction `estimate` du forfait, ou verdict offert ;
   - une campagne en stock peut recevoir le verdict offert en Gratuit, comme une autre ;
   - sans accès, une carte verrouillée « Ton stock va-t-il suffire ? » porte le badge Pro.
4. **La jauge** dit « en stock S » au lieu de « prévu S ». Le texte lu à voix haute dit de même.
5. **L'argent** [choix] : « invendus évités » n'a pas de sens pour une marchandise déjà achetée.
   - Une campagne en stock montre seulement le **bénéfice attendu** sur la demande réaliste, plafonnée au stock.
   - L'« Argent protégé » de l'accueil ne compte que les campagnes à venir.
6. **Le bouton « Produit arrivé »** n'apparaît plus sur une campagne en stock : il n'a pas de sens pour elle. Le serveur garde ses transitions.
7. **L'accueil** [choix] : la ligne d'une campagne en stock dans « Tes campagnes » montre « À servir : N » et l'état du stock, au lieu du mot du verdict.

## 2. Livraison ailleurs et clients d'autres pays [décidé, détails : choix]

Les communautés comptent des personnes qui vivent dans d'autres quartiers, d'autres villes ou à l'étranger.

**Le lieu de livraison**
- Quand la livraison est proposée, l'étape « Dans quel quartier ? » montre les quartiers de la boutique, puis **« Autre endroit »** [décidé : toujours proposé].
- « Autre endroit » ouvre un seul champ, « Où ? (quartier, ville ou pays) », de 2 à 80 caractères, puis « Continuer ». Le grossiste décide ensuite avec le client s'il livre.
- Une boutique sans quartier : « Oui, livre-moi » demande directement « Où ? » [choix]. Aujourd'hui, cette réponse part sans aucun lieu.

**Où le lieu est enregistré et affiché**
- Le lieu va dans un nouveau champ `Response.deliveryPlace` (texte, `null` dès qu'un quartier est choisi ou que la personne passe récupérer).
- La migration s'appelle `8c_delivery_place`, à cause du tri des migrations par ordre alphabétique.
- La route publique valide le texte : longueur, espaces retirés aux bouts, caractères de contrôle refusés.
- Résultats, « Où livrer » : les quartiers, « Retrait sur place », puis « Autre endroit : N ».
- Liste des intéressés : la ligne montre le lieu (« Livraison · Lomé »).
- Export : une colonne « Lieu ». La protection contre les formules s'y applique comme ailleurs.

**Le numéro d'une personne à l'étranger**
- Le champ du numéro gagne un **choix du pays**. Par défaut, c'est le pays de la boutique.
- La liste [choix] :
  - d'abord les pays de `SHOP_COUNTRIES` ;
  - ensuite tous les autres pays connus de libphonenumber, nommés en français (`Intl.DisplayNames`).
- Un numéro tapé avec « + » ou « 00 » l'emporte sur le choix.
- Le pop-up envoie le code pays (ISO à deux lettres). Le serveur le vérifie, puis appelle `normalizePhone` avec ce pays au lieu de celui de la boutique.
- Le pays d'un client se déduit de son numéro. Il sert au filtre « Pays » (§5) et à l'export (§6).

## 3. Pop-up : les photos et « C'est bien moi » [décidé, détails : choix]

**Les photos**
- Toutes les photos du produit (6 au plus) défilent du doigt, une par vue. La photo est entière, jamais rognée, sur le papier quadrillé.
- Des points sous la photo montrent où l'on est. Sur ordinateur, des flèches permettent de passer d'une photo à l'autre [choix].
- Taille : sur téléphone, environ 40 % de la hauteur de l'écran ; la feuille défile si besoin. Sur ordinateur, la photo est grande, et non plus une vignette de 60 pixels.
- Fabrication : défilement CSS (`scroll-snap`), sans bibliothèque d'animation (règle du pop-up). La première photo est servie en w_600 comme aujourd'hui, les suivantes se chargent au besoin (`loading="lazy"`).

**« C'est bien moi »**
- Après « pas toi ? », le formulaire montre un lien **« C'est bien moi, {Prénom} »**, qui ramène à la vue « Tu réponds en tant que… ».
- La mémoire du téléphone n'est remplacée que lorsqu'un nouveau numéro est envoyé [choix].

## 4. Page d'une campagne : les onglets et les actions [décidé, détails : choix]

Le constat du porteur : les cinq boutons sont mal disposés, et leur place ne dit pas leur rôle. Les onglets et les actions ont aujourd'hui le même aspect de bouton.

- **Les onglets** (Résultats, Intéressés, Partager, Modifier) deviennent une **barre d'onglets** :
  - du texte, avec un trait jaune sous l'onglet ouvert ;
  - les quatre visibles sur un téléphone de 360 pixels, à largeurs égales ;
  - ce ne sont plus des boutons. Aujourd'hui, « Modifier » est coupé sur téléphone.
- **Les actions** sont de vrais boutons, sous le titre, avec un verbe qui dit ce qui se passe :
  - **« Le produit est arrivé »** (bouton principal), seulement pour une campagne à venir, en cours ou terminée ;
  - **« Terminer la campagne »**, plus discret, avec la confirmation actuelle ;
  - « Lancer » (brouillon) et « Rouvrir » (terminée) gardent leur rôle, avec le même traitement.
- L'état de la campagne (badge « En cours »…) reste à côté du titre.
- L'encadré « Le produit est arrivé ? » de l'onglet Intéressés reste réservé aux campagnes à venir.

## 5. Filtres des clients [décidé, détails : choix]

Le porteur veut filtrer les clients selon tout ce qui les distingue et qui peut servir.

**Les filtres de `/app/clients`**, combinables entre eux et avec la recherche, et gardés dans l'adresse de la page :
- **Type** : revendeurs ou usagers (existe déjà) ;
- **Réponse** : intéressé ou pas intéressé ;
- **Campagne** : une campagne de la boutique ;
- **Quartier** : un quartier, ou « Autre endroit » ;
- **Période** : ce mois-ci, le mois dernier, les 3 derniers mois, ou un mois précis ;
- **Pays** : le pays du numéro.

**Comment ils s'appliquent**
- Un client correspond quand **une même réponse comptée** remplit tous les filtres de réponse ensemble [choix]. Par exemple, « intéressé, campagne riz, octobre » veut dire une réponse qui est les trois à la fois. Le pays s'applique au numéro du client.
- Sur téléphone, un bouton « Filtrer » ouvre une feuille avec les filtres. Les filtres actifs s'affichent en pastilles, chacune avec sa croix, plus un lien « Tout effacer ».
- En Gratuit, les filtres marchent et les numéros restent masqués. Le filtre Pays se lit côté serveur, sans jamais envoyer le numéro.
- Le filtre « a commandé / n'a pas commandé » arrive au lot 7.

## 6. Export avec aperçu et filtres [décidé, détails : choix]

Le porteur veut voir ce qu'il exporte et choisir quoi exporter (selon une date, un type de données, un filtre), car ces fichiers servent aux relances.

**Où le trouver** : une page **« Exporter »** (`/app/exporter`), ouverte depuis :
- « Télécharger pour Excel » (onglet Intéressés), avec la campagne et le filtre déjà choisis ;
- la page Clients, avec ses filtres déjà choisis.

**Les étapes, sur la même page**
1. **Quoi** :
   - les **réponses** : intéressés, pas intéressés, ou toutes ;
   - ou les **clients** : une ligne par client.
2. **Filtres** :
   - pour les réponses : campagne (une ou toutes), période, quartier ou lieu, échéance, type, pays ;
   - pour les clients : les filtres du §5.
3. **Aperçu** :
   - le nombre de lignes (« 142 lignes ») ;
   - les 10 premières lignes, avec les mêmes colonnes que le fichier ;
   - l'aperçu se met à jour quand un filtre change.

**Puis**
- **« Télécharger (142 lignes) »** donne un CSV aux règles du lot 6 : BOM UTF-8, `;`, CRLF, protection contre les formules, 20 000 lignes au plus.
- Le nom du fichier dit quoi et quand, par exemple `tamani-interesses-riz-2026-10-28.csv`.
- **« Copier les numéros »** utilise les mêmes filtres, pour les relances (5 000 numéros au plus) [choix].

**Colonnes** [choix]
- Réponses : date, produit, prénom, numéro, pays, intéressé, raison du non, type, quantité, option, échéance, livraison ou retrait, quartier, lieu, source.
- Clients : prénom, numéro, pays, type, quartier le plus fréquent, nombre de réponses, nombre de « oui », date et produit de la dernière réponse.

**Accès**
- Télécharger et copier demandent `respondentContacts` et `csvExport`, comme au lot 6.
- En Gratuit, l'aperçu s'affiche avec les numéros masqués, et un bouton « Passe au Pro pour télécharger » [choix].

## 7. Notifications : demandées d'office sur téléphone [décidé, détails : choix]

Le porteur veut que la notification soit activée par défaut sur mobile, sans carte sur l'accueil, et qu'elle reste dans les réglages.

- **Contrainte** : aucun site ne peut activer les notifications tout seul. Le téléphone exige que la personne touche « Autoriser » (règle de Google et d'Apple). « Par défaut » veut donc dire : **Tamani le demande tout seul, au bon moment, en un geste**.
- **Sur téléphone** (écran tactile et étroit), la première fois que l'espace grossiste s'ouvre alors que les notifications ne sont ni activées ni refusées, une petite feuille demande :
  - la question : « Être prévenu à chaque réponse ? » ;
  - « Oui, préviens-moi » demande alors l'autorisation du téléphone ;
  - « Plus tard » redemande une seule fois 7 jours après, puis plus jamais [choix].
- **Sur iPhone**, hors de l'écran d'accueil, la feuille explique d'abord comment ajouter Tamani à l'écran d'accueil, au même rythme.
- **La carte quitte l'accueil.** Elle reste dans Réglages (section Notifications), qu'on rejoint aussi depuis Plus.
- **Sur ordinateur**, pas de feuille automatique [choix] : le grossiste reçoit ses réponses sur son téléphone. Le réglage reste disponible.

## 8. Plus et Profil [décidé, détails : choix]

**L'icône en haut** (l'avatar, sur téléphone comme sur ordinateur) ouvre le **Profil** (`/app/profil`) :
- le logo de la boutique, ou les initiales ;
- le nom, modifiable. Le kit n'a pas de route pour le changer : il en faut une nouvelle, hors des fichiers protégés, avec `requireAuth` et `verifyCsrf` ;
- l'e-mail, en lecture seule ;
- « Changer le mot de passe » : route `PUT /api/auth/change-password` du kit. Un compte Google sans mot de passe voit « Créer un mot de passe » (`POST /api/auth/set-password`) ;
- « Se déconnecter ».

**Le bouton Plus** liste, avec une icône chacune, tout ce que la barre du bas n'a pas la place de montrer [choix] :
- Produits ;
- Forfait : le forfait en cours et sa date de fin ;
- Réglages de la boutique ;
- Notifications ;
- Profil ;
- Aide : le contact WhatsApp de Tamani, caché tant que le porteur ne l'a pas donné (`LANDING_LINKS`) ;
- Se déconnecter.

La section « Ton compte » de Plus passe dans Profil.

## 9. Unités [décidé]

« demi-douzaine » rejoint les unités proposées, juste après « douzaine ». Au pluriel : « demi-douzaines ».

## 10. Commandes : rappel du lot 7 (inchangé)

La réponse donnée au porteur le 2026-10-28, que le lot 7 construira (spec §5.5.1) :

- **Une intention** : « intéressé, 12 pièces, cette semaine ». La personne ne s'engage à rien.
- **Une commande** : un achat réel, conclu avec le client (le plus souvent sur WhatsApp). Elle porte le produit, la quantité, le prix figé, la livraison ou le retrait, le quartier, le statut et « payé ».
- **Elle se crée** :
  - en un geste avec « Transformer en commande » sur un intéressé, déjà remplie avec sa réponse : elle est **à confirmer** ;
  - ou à la main, pour un client qui commande par téléphone.
- **Elle avance** : à confirmer, puis confirmée, puis livrée ou récupérée, ou bien annulée. On coche « payé » à part.
- **Elle sert** :
  - à préparer les tournées avec « À livrer par quartier » ;
  - à suivre le stock restant et ce qui est payé ;
  - surtout, à apprendre qui achète vraiment (coefficients appris), ce qui rend le verdict plus juste.

## 11. Effets sur les autres documents

- **Feuille de route** :
  - une ligne « 6b · Retouches après le test du lot 6 » ;
  - le point 4 du lot 7 ne garde que le filtre `hasOrdered`, la note et l'anonymisation ;
  - le travail UX/UI est noté après le lot 7.
- **Spec** :
  - §5.3 (pop-up) : « Autre endroit », choix du pays, galerie de photos, « C'est bien moi » ;
  - §5.4 (tableau de bord) : le cas `IN_STOCK` ;
  - §5.5 (clients) : les filtres ;
  - §6 (données) : `Response.deliveryPlace`.
- **CLAUDE.md** : la section du lot 6 gagne les règles du cas en stock, du lieu de livraison, des filtres et de l'export.

## 12. Hors périmètre

- Le travail UX/UI d'ensemble (après le lot 7).
- Les commandes et le filtre « a commandé » (lot 7).
- Les monnaies par pays et les anciens numéros béninois à 8 chiffres (lot 7b).
- Le panneau des réponses du forfait (lot 8).
