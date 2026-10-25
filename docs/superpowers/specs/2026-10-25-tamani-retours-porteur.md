# Tamani — Retours du porteur après le lot 4 (complément de conception)

Complète [2026-10-24-tamani-design.md](2026-10-24-tamani-design.md), qui reste la référence. Ce document consigne ce que le porteur a demandé le 2026-10-25, après avoir testé l'espace grossiste avec le compte démo, et les choix qui en découlent. Les marques [décidé], [choix] et [hypothèse] ont le même sens que dans la spec.

## 1. Ce qui doit marcher en premier [décidé]

Le porteur, mot pour mot : le grossiste « crée une campagne, la partage et reçoit les notifications des réponses ; de base cela doit être opérationnel, et passer correctement sur son mobile, car la finalité sera de le convertir en application mobile plus tard ». Le lien posté sur un statut, dans un groupe ou sur un réseau social doit fonctionner, et **l'image du produit doit s'afficher**, « un peu comme NGL », sur un autre marché.

Validé sur maquette le 2026-10-25 (trois écrans de téléphone) :
1. **Le lien partagé** montre un aperçu avec la photo du produit, son nom, son prix et la boutique. Même aperçu partout : WhatsApp, Facebook, Telegram, X (balises Open Graph standard).
2. **Le client répond** dans le pop-up, sans compte ni application (spec §5.3, inchangée).
3. **Le grossiste est prévenu** sur son téléphone, même quand Tamani est fermé. La notification ne contient **ni le nom ni le numéro** du client.

Conséquence sur l'ordre des lots : le lot 5 (pop-up) passe maintenant, **avec les notifications en plus**. Les retouches de l'espace grossiste (§3) suivent. La **page d'accueil publique** vient ensuite, avant les lots 6 à 8 (§4).

## 2. Notifications des réponses [décidé, détails : choix]

- **Deux canaux** :
  - **dans l'app** : une cloche dans l'en-tête, avec le nombre de non-lues et la liste des réponses récentes. Elle s'appuie sur les `Notification` du kit et sur `createNotification` ;
  - **sur le téléphone** : notifications Web Push, standard VAPID.
- **Application web installable (PWA)** [décidé : « application mobile plus tard »] : manifeste, icônes, `display: standalone`, démarrage sur `/app`, et un service worker qui affiche les notifications.
  - Sur Android, les notifications marchent depuis Chrome.
  - Sur iPhone, il faut d'abord ajouter Tamani à l'écran d'accueil (iOS 16.4 ou plus). L'interface l'explique au moment de l'activation.
  - La conversion en application des stores (Capacitor ou équivalent) est **hors périmètre** de ce lot [choix].
- **Quand** : à chaque réponse **complète** (étape 5 validée), qu'elle soit « oui » ou « non » [choix : un « non, trop cher » est une information utile pour le prix]. Les réponses incomplètes ne notifient pas.
- **Texte** [choix] :
  - titre : « Nouvelle réponse · {titre de la campagne} » ;
  - corps, pour un oui : « Quelqu'un en veut {quantité} {unités} (pour son usage | pour revendre). {n} intéressés au total. » ;
  - corps, pour une réponse verrouillée (quota du mois atteint) : « Une nouvelle réponse t'attend. Ton forfait du mois est plein : passe à Pro pour la voir. » Son contenu reste caché, comme dans le tableau de bord ;
  - corps, pour un non : « Une personne n'est pas intéressée : {raison}. ».
  - Jamais de prénom ni de numéro : un téléphone se regarde par-dessus l'épaule.
- **Regroupement** [choix] : une notification par campagne, remplacée à chaque nouvelle réponse (`tag` = campagne), pour éviter 200 alertes empilées. Un clic ouvre la page de la campagne.
- **Activation** : une carte « Sois prévenu à chaque réponse » sur l'accueil `/app` et dans Réglages, avec le bouton « Activer les notifications ». Elle n'apparaît plus une fois les notifications activées, et dit pourquoi si le navigateur les refuse.
- **Destinataires** : tous les membres de la boutique qui ont activé les notifications. Un abonnement expiré (réponse 404 ou 410 du service push) est supprimé.
- **Envoi** [choix] : après la réponse, sans la retarder (`after()` de Next).
  - La notification dans l'app est écrite à coup sûr.
  - Un push perdu n'est pas rejoué : la cloche garde la trace.
  - On ne passe **pas** par l'outbox : il dépend d'une tâche planifiée chaque minute, que l'offre Hobby de Vercel ne permet pas.
- **Clés** : `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` et `VAPID_SUBJECT` (`mailto:`). Sans elles, le push est inerte, comme les autres fournisseurs facultatifs, et la cloche marche quand même.

## 3. Retouches de l'espace grossiste (lot 5b) [décidé, détails : choix]

Les demandes du porteur, dans l'ordre où il les a données, avec ce qu'on en fait :

1. **Types d'unité** (« pièce, carton, flacon, bouteille… ») : le champ Unité propose des puces avec les unités courantes et celles que la boutique a déjà utilisées. On peut en écrire une nouvelle, qui rejoint ensuite la liste [choix : aucune table en plus, la liste vient des produits].
2. **Date d'arrivée** : dans l'assistant, « Arrive bientôt » demande **seulement une date**. Les raccourcis « dans N jours » disparaissent, et le nombre de jours affiché (« Arrivage dans 10 jours ») est calculé depuis la date. La durée de la campagne garde ses choix [choix : le porteur ne parlait que de l'arrivée].
3. **Lien de campagne** : il ne marchait pas parce que le pop-up n'existait pas encore. Il est livré par le lot 5.
4. **Notifications sur le téléphone** : voir §2 (lot 5).
5. **Accueil** : avatar de l'utilisateur avec sa photo (le logo de la boutique, sinon ses initiales) et une **cloche de notifications** dans l'en-tête.
6. **Effets au survol** sur les boutons, en CSS seulement, coupés sous `prefers-reduced-motion`.
7. **Barre latérale** : changement de couleur au survol des onglets.
8. **Description de la boutique** dans Réglages. Le pop-up la montre si elle est remplie, et Réglages signale ce qui manque pour que la boutique soit complète [choix : description, logo, zones].
9. **Pages moins vides** : des éléments qui complètent l'interface sans changer de style. Les captures du porteur servent d'inspiration (bandeau d'accueil, raccourcis, liste récente, échéances), toujours en « Cahier du marché ».
10. **Disposition des Réglages** : une navigation par sections à gauche sur ordinateur (Boutique, Zones, Estimation, Notifications, Compte), un empilement sur mobile, et le bouton d'enregistrement en haut de section.
11. **Pages de connexion et d'inscription** : une mise en page en deux colonnes sur ordinateur, avec une illustration dans le style de la charte. Le bouton Google passe en haut. Sur mobile, la page reste simple.

### 3 bis. Ce que les maquettes ont fixé (2026-10-25, troisième version validée)

Le porteur a refusé deux premières versions : elles ressemblaient à un tableau de bord générique et ajoutaient trop d'éléments. Sa règle : **les gestes des applications de tous les jours** (WhatsApp, applications de mobile money), sans élément qui casse leur logique, dans le style « Cahier du marché ».

- **En-tête** : sur ordinateur, la cloche et l'avatar sont sur la ligne du titre de la page, sans bande vide au-dessus. Sur téléphone, la ligne du haut garde le symbole, le nom de la boutique, la cloche et l'avatar. L'avatar ouvre « Compte et forfait ».
- **Barre latérale** : la couverture du cahier, en encre (`ink`) à petits carreaux clairs. Le symbole et « tamani » en haut, puis une carte de la boutique (avatar, nom, forfait), les onglets avec leurs icônes (l'onglet ouvert en jaune, un léger éclaircissement au survol) et, en bas, les réponses du mois face au quota, avec « Passer au Pro » en Gratuit.
- **Accueil** :
  - une salutation « Bonjour, {prénom} », sinon « Bonjour, {boutique} » ;
  - **une seule carte bleue « Cette semaine »**, comme le solde d'une application de mobile money : le nombre de réponses en grand, « +n depuis hier », puis trois chiffres (intéressés, ouvertures, clients) qui ouvrent leur page ;
  - **quatre ronds** comme les raccourcis de WhatsApp (Campagne, Produit, Partager, Clients) sur téléphone, une rangée de boutons sur ordinateur ;
  - **« Activité »**, comme une liste de transactions : une icône ronde, ce qui s'est passé, à droite l'heure et la quantité en vert (oui) ou le mot « non » en rouge. Chaque ligne ouvre sa page : une réponse ouvre sa campagne, un nouveau client ouvre sa fiche ;
  - **« À venir »** : fins de campagne et arrivages, chacun ouvre sa campagne ;
  - une boutique sans campagne voit « Pour bien démarrer » à la place de la carte et des listes.
- **Filtres comme sur WhatsApp** : en haut de chaque liste, une barre « Rechercher » arrondie et une rangée de pastilles avec une icône et un nombre. Une pastille n'apparaît que si elle a quelque chose à montrer (« Tout » reste toujours). Sur téléphone, un grand bouton « + » en bas à droite fait l'action principale de la page.
- **Clients, avancé du lot 7** : la liste des personnes ressemble à la liste des appels de WhatsApp (initiales dans un rond, prénom, dernier intérêt avec une flèche verte ou rouge, bouton WhatsApp à droite). La fiche montre tous les intérêts de la personne. **Il n'y a plus de vue « Intérêts » séparée** : les intérêts d'un produit se lisent dans sa campagne (lot 6). Le bouton WhatsApp ouvre la discussion avec un message déjà écrit, que le grossiste relit et envoie lui-même. En Gratuit, le numéro est masqué et le bouton verrouillé : « Passe au Pro pour contacter Awa » (§5.6 de la conception).
- **Commandes** : la maquette (pastilles « À confirmer », « À livrer », « Livrées », « Non payées » ; « À livrer » range par quartier ; bouton WhatsApp avec un message selon le statut) guide le lot 7. Au lot 5b, la page garde son état vide.

## 4. Page d'accueil publique [décidé, à concevoir]

Elle est sortie du lot 9 et vient juste après le lot 5b. C'est « le point de contact de conversion ». Le porteur la veut « ultra unique » : le visiteur doit comprendre sans chercher le besoin, la solution et la transformation. Elle aura son propre passage de conception, avec maquettes.

## 5. Choix faits pendant la rédaction (à vérifier)

- Le push part après la réponse avec `after()`, sans outbox, pour ne pas dépendre de la fréquence des tâches planifiées.
- Les « non » notifient aussi, et une seule notification est gardée par campagne.
- La liste d'unités vient des produits de la boutique : aucune nouvelle table.
- La durée de campagne garde ses raccourcis : seule l'arrivée devient une date.
- La conversion en application des stores est repoussée après la PWA.
