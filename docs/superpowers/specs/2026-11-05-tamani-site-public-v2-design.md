# Tamani — Site public v2 : textes, SEO, page Forfaits, connexion, accès admin par code

Date : 2026-11-05. Source : le message du porteur du 2026-11-05 (rédaction, SEO, sections, forfaits, connexion, admin, animations), ses deux captures (grille Cartilyzer, inscription AMU) et ses réponses du même jour.

## 1. Pourquoi

Le porteur veut que Tamani sorte en premier sur Google et dans les réponses des IA (ChatGPT, Perplexity, Gemini) quand un vendeur d'Afrique francophone cherche comment vendre sur WhatsApp, TikTok ou Facebook, tester un produit ou éviter le stock invendu. Il veut aussi une page qui convertit un débutant : chaque mot compris sans effort, chaque section qui répond à la précédente, aucun frein au paiement.

L'accueil du lot 9a a déjà la bonne structure. Ce chantier réécrit ses textes et son menu, sort les forfaits sur une page à part, refait la connexion et l'inscription, ajoute le SEO, le GEO (être cité par les IA) et les animations. Il protège enfin l'espace admin par un code envoyé par e-mail.

## 2. Découpage

Trois morceaux indépendants. Chacun a sa branche et sa PR.

| Lot | Contenu | Quand |
|---|---|---|
| **12 — Site public v2** | Accueil (textes, menu, sections), page `/forfaits`, connexion et inscription, SEO et GEO, animations | Maintenant, branche `plan/12-site-public` |
| **11c — Accès admin par code** | Code à 6 chiffres par e-mail à chaque entrée dans l'admin, sortie après 30 min sans activité, admin interdit aux moteurs | Après la fusion de la PR #18, qui touche les mêmes fichiers |
| **Blog** (plus tard) | Un article par question et par pays (liste au §8.6) | Lot à venir, demandé par le porteur |

La PR #18 (look violet du support-admin) attend les retouches du porteur. Elle ne se fusionne pas sans son accord.

## 3. Décisions du porteur (2026-11-05)

- Le ton est simple, clair et sans jargon, pour un débutant. Chaque mot est voulu, et chaque section répond à la précédente.
- Le menu utilise des mots simples : Comment ça marche, Fonctionnalités, Bénéfices, Forfaits, FAQ, Contact.
- On ne parle pas que de WhatsApp : TikTok (et ses lives) et Facebook sont aussi cités.
- Les sections, dans cet ordre :
  1. hero ;
  2. vidéo ;
  3. ce que Tamani t'aide à éviter ;
  4. un lien pour tous les clients ;
  5. 1 minute pour partager ;
  6. le résultat (avant / après) ;
  7. la communauté ;
  8. la FAQ.
- **Les forfaits vivent sur une page à part**, qu'on ouvre depuis le menu. La grille n'est plus sur l'accueil.
- **Rangement des forfaits** : un bouton « Courte durée / Au mois », comme le bouton « Mensuel / Annuel » de la capture Cartilyzer.
  - « Courte durée » montre l'essai gratuit, le Pass Semaine et le Pass 2 Semaines.
  - « Au mois » montre le Pass Mois, le Pass Mois Plus et le Pass Mois Max.
  - Le Pass Illimité « Parlons-en » reste toujours à droite.
  - Dessous, un tableau compare toutes les offres.
- **Contenu des cartes** :
  - la carte gratuite dit sa durée, son nombre de réponses, le verdict, son nombre de campagnes, et ce qu'elle n'a pas : l'export, un lien par canal, et le « Propulsé par Tamani » qu'elle affiche ;
  - les cartes payantes disent ce qui est inclus ;
  - les cartes restent courtes, dans un langage vendeur qui lève le frein au paiement.
- **Les campagnes ne sont jamais coupées.** Quand le pass se termine, les clients répondent toujours. Le vendeur ne voit leurs informations qu'en reprenant un pass. Cela correspond au comportement actuel : les nouvelles réponses sont gardées « en attente » et s'ouvrent au prochain pass.
- **Connexion et inscription** : on s'inspire de la capture AMU (grande image à gauche, formulaire à droite), en **couleurs claires de Tamani**, avec une image plus grande et plus visible.
- **Admin** : un **code par e-mail** à chaque entrée, une sortie automatique après 30 min sans activité, et une page interdite à Google et aux IA.
- Animations : des effets et des mini-interactions sur les boutons, des changements de couleur, des transitions et des textes animés. Elles servent la conversion.
- Le blog viendra plus tard.

## 4. Objectifs, non-objectifs, anti-objectifs

**Objectifs**

- En 3 secondes, le visiteur comprend ce que fait Tamani et pour qui.
- Tamani est trouvé sur ses mots clés (§8.1) et cité par les IA sur les questions qu'il résout.
- Plus de visiteurs passent de l'accueil à l'inscription, et de la page Forfaits au paiement.

**Non-objectifs**

- Le blog et ses articles (liste prête au §8.6).
- La vidéo elle-même : le porteur la fournira. En attendant, l'affiche reste.
- De nouvelles illustrations. On réutilise celles du lot 9a.
- Tout changement de prix ou de règle de pass. La grille reste celle de `PLANS`.

**Anti-objectifs** (ce qui serait un échec, même si tout marche)

- Une promesse que Tamani ne tient pas. Tamani ne trouve pas de grossistes et ne vend pas à la place du vendeur. Ces sujets iront dans le blog, jamais dans une promesse de l'accueil.
- Des chiffres, des avis ou des « clients satisfaits » inventés.
- Du jargon : « SaaS », « dashboard », « conversion », « funnel », « KPI », « intention d'achat » sans explication.
- Des animations qui gênent : clignotement en boucle, page qui saute (CLS), page lente au chargement, ou animation qui tourne malgré `prefers-reduced-motion`.
- Un mot clé répété à la chaîne : Google le pénalise, et le lecteur le sent.

## 5. Accueil — les textes, section par section

Le texte ci-dessous est le texte à mettre en ligne. Le tutoiement du lot 9a reste. Les montants passent par `formatMoney`. Les chiffres viennent de `PLANS` et de `EXAMPLE`, jamais écrits à la main.

### 5.1 Menu (barre flottante du lot 9a)

| Libellé | Va vers |
|---|---|
| Comment ça marche | `#comment-ca-marche` |
| Fonctionnalités | `#fonctionnalites` |
| Bénéfices | `#benefices` |
| Forfaits | `/forfaits` |
| FAQ | `#faq` |
| Contact | `#contact` (le pied de page) |

À droite : « Se connecter » et le bouton « Essayer gratuitement » (vers `/signup`). Sur téléphone, le tiroir garde ses deux cartes, Support et Groupe.

### 5.2 Hero

- **Étiquette** : Pour les grossistes, importateurs et vendeurs en ligne
- **Titre (H1)** : Commande seulement ce que tes clients vont acheter.
  - Variante si le porteur préfère : *Sache ce que tes clients veulent, avant d'acheter ton stock.*
- **Texte** : Partage un lien sur WhatsApp, TikTok ou Facebook. En moins de 30 secondes, tes clients disent ce qu'ils veulent et combien. Tamani te dit quoi commander, et à qui livrer.
- **Boutons** : « Essayer gratuitement » (principal, vers `/signup`) · « Voir comment ça marche » (vers `#comment-ca-marche`)
- **Sous les boutons** : 3 jours d'essai · sans carte bancaire · paiement par Mobile Money
- **Bande de logos** (le défilé du lot 9a) : Ton lien marche partout où sont tes clients.

### 5.3 Vidéo

- **Titre** : Regarde Tamani en action
- **Texte** : En 90 secondes, un grossiste crée un produit, partage le lien dans son groupe WhatsApp, puis voit arriver les réponses de ses clients avec la quantité à commander.
- Tant que `LANDING_VIDEO` est vide, l'affiche reste, comme aujourd'hui.

### 5.4 Ce que Tamani t'aide à éviter

- **Titre** : Tu reconnais ces situations ?
- **Texte** : Ce sont les galères que Tamani t'aide à éviter.

Cinq cartes :

1. **De l'argent qui dort dans ton stock**
   Tu commandes un carton entier, et une partie reste invendue pendant des semaines. C'est ton argent qui attend sur l'étagère.
2. **Trop de messages, pas assez de commandes**
   Tu postes tes produits et tout le monde t'écrit : le prix, la taille, la livraison… Tu réponds toute la journée, et les clients prêts à payer se perdent dans la foule.
3. **Le client ne sait pas ce qui reste**
   Il ne sait pas combien de pièces sont disponibles, ni ce qu'il peut vraiment commander. Alors il attend, ou il achète ailleurs.
4. **Commander gros sans savoir si ça va plaire**
   Avant une grosse commande, tu n'as aucun moyen simple de savoir si tes clients sont vraiment intéressés.
5. **Tu ne connais pas vraiment tes clients**
   Qui achète souvent ? Qui commande et ne vient jamais chercher ? Sans liste, impossible de le savoir.

**Pont vers la section suivante** : Et si un seul lien réglait tout ça ?

### 5.5 Fonctionnalités : un seul lien pour tous tes clients (`#fonctionnalites`)

- **Titre** : Un seul lien pour tous tes clients
- **Texte** : Un produit, un lien. Tu le partages partout où sont tes clients, et toutes les réponses arrivent au même endroit.
- **Orbite du lot 9a**, avec des légendes revues :
  - WhatsApp : groupes, statut et chaînes ;
  - TikTok : bio, vidéos et lives ;
  - Facebook : groupes, pages et lives ;
  - Instagram : bio, stories et messages ;
  - les autres réseaux ne changent pas.

Six points :

1. **Tes clients répondent en moins de 30 secondes**
   Ils touchent le lien, choisissent la quantité, et c'est fait. Pas d'application à installer, pas de compte à créer.
2. **Tu sais qui veut quoi, combien et où**
   Chaque réponse te donne le produit, la quantité, le quartier de livraison et le numéro. Le client accepte d'abord que tu le recontactes.
3. **Tu sais quel canal t'apporte des clients**
   Tu crées un lien par groupe ou par réseau, et tu vois enfin si tes clients viennent de WhatsApp, de TikTok ou de Facebook.
4. **Pas besoin de site web**
   Ton produit a sa page, prête à partager. Rien à construire, rien à payer en plus.
5. **Ton client voit ce qui est disponible**
   « Disponible maintenant » ou « bientôt », et, si tu veux, le nombre de pièces en stock.
6. **Tamani te dit combien commander**
   À partir des réponses, Tamani calcule une quantité réaliste et te donne un avis clair avant que tu commandes.

**Bouton** : « Essayer gratuitement »

### 5.6 Comment ça marche : 1 minute pour partager ton produit (`#comment-ca-marche`)

- **Titre** : 1 minute pour partager ton produit
- **Texte** : Pas de formation, pas de réglages compliqués. Trois étapes, et tes clients répondent.

1. **Crée ton produit**
   Une photo, un prix et les options (taille, couleur…). Dis s'il est déjà en stock ou s'il arrive bientôt.
2. **Partage le lien en un clic**
   Envoie-le dans tes groupes WhatsApp, ton statut, ton live TikTok ou ta page Facebook. Le message est déjà écrit.
3. **Reçois les réponses et prépare les commandes**
   Tu vois qui veut quoi, combien et où livrer. Tu transformes les réponses en commandes, en commençant par les clients que tu connais déjà.

**Bouton** : « Créer mon premier produit » (vers `/signup`)

### 5.7 Bénéfices : avant / après (`#benefices`)

- **Titre** : Tu vends comme avant. En mieux.
- **Texte** : Tamani ne change pas ta façon de travailler. Il t'évite de perdre ton temps et ton argent.

| Avant | Après |
|---|---|
| Des dizaines de messages pour des renseignements, et peu de ventes | Une liste de clients prêts à être livrés |
| Tu commandes ton stock sans savoir qui va payer | Tu testes un produit auprès de tes clients avant d'en commander un carton |
| Tu ne sais pas quel groupe ou quel réseau t'apporte des clients | Tu vois quels canaux t'apportent vraiment des clients |
| Tu ne sais pas quels produits vont partir | Tu sais quels produits partent, et lesquels attendre |
| De l'argent bloqué dans des invendus | Ton argent reste dans ta poche, pas dans ton stock |

Le curseur avant / après et l'exemple chiffré du lot 9a restent (`EXAMPLE` : 300 cartons commandés, 190 invendus, l'argent bloqué ; avec Tamani, 120). Les nombres comptent jusqu'à leur valeur quand la section arrive à l'écran.

### 5.8 Rejoindre la communauté

- **Titre** : Rejoins la communauté des vendeurs Tamani
- **Texte** : Un groupe WhatsApp de vendeurs qui partagent ce qui marche : des astuces pour vendre sur WhatsApp, TikTok et Facebook, les tutoriels Tamani, des idées pour faire grandir ton audience et des recommandations entre vendeurs.
- **Bouton** : « Rejoindre le groupe » (le lien `LANDING_LINKS.community`). En dessous : C'est gratuit.

### 5.9 FAQ (`#faq`)

- **Titre** : Tes questions, nos réponses

Chaque réponse commence par la réponse elle-même et tient en 40 à 60 mots : c'est la forme que Google et les IA reprennent. La FAQ reste la source du JSON-LD `FAQPage`.

1. **C'est quoi, Tamani ?**
   Tamani est un outil pour les grossistes et les vendeurs en ligne d'Afrique francophone. Tu partages un lien produit sur WhatsApp, TikTok ou Facebook, et tes clients disent en moins de 30 secondes ce qu'ils veulent acheter. Tamani te dit combien commander, et à qui livrer.
2. **Mes clients doivent-ils installer une application ?**
   Non. Le lien s'ouvre dans le navigateur du téléphone. Ton client choisit la quantité et son quartier, puis laisse son numéro s'il accepte que tu le recontactes. Il n'a ni compte à créer, ni application à télécharger.
3. **Où est-ce que je peux partager le lien ?**
   Partout où sont tes clients : groupes et statut WhatsApp, lives et bio TikTok, groupes et pages Facebook, Instagram, Telegram, Messenger, SMS, et même tes publicités. Avec un pass, tu crées un lien par groupe pour savoir lequel t'apporte des clients.
4. **Comment tester un produit avant de le commander en gros ?**
   Crée le produit dans Tamani en indiquant qu'il arrive bientôt, puis partage le lien. Les réponses te montrent combien de clients sont intéressés, et pour quelle quantité. Tu commandes ensuite la bonne quantité, pas un carton au hasard.
5. **Puis-je vendre un produit que je n'ai pas encore en stock ?**
   Oui. Indique que le produit arrive bientôt. Tes clients disent ce qu'ils veulent, tu commandes chez ton fournisseur ce qui est demandé, puis tu livres. C'est le principe de la précommande, sans site web.
6. **Comment Tamani calcule-t-il la quantité à commander ?** La réponse actuelle reste.
7. **Mes clients voient-ils les réponses des autres ?** La réponse actuelle reste.
8. **L'essai gratuit, comment ça marche ?**
   Tu as 3 jours et 50 réponses pour essayer, avec une campagne, sans carte bancaire. Tu vois les numéros de tes clients et l'avis sur la quantité à commander. Ensuite, tu choisis un pass si tu veux continuer.
   Ces chiffres sont lus dans `PLANS.TRIAL`.
9. **Que se passe-t-il quand mon pass se termine ?**
   Ton lien continue de marcher. Tes clients peuvent toujours répondre, et leurs réponses sont gardées. Pour voir les nouvelles réponses et les numéros, il suffit de reprendre un pass.
10. **Comment je paie ?** La réponse actuelle reste.
11. **Dans quels pays marche Tamani ?** La réponse donne la liste des pays ouverts, lue dans les pays du lot 7b (zone FCFA d'abord). Ceux marqués « bientôt » sont dits comme tels.

### 5.10 Bandeau final et pied de page (`#contact`)

- **Bandeau avant le pied de page** :
  - titre : Ton prochain stock, commande-le en sachant qui va l'acheter.
  - bouton : « Essayer gratuitement » ;
  - en dessous : 3 jours · 50 réponses · sans carte bancaire.
- **Pied de page** (`id="contact"`) :
  - « Une question ? Écris-nous sur WhatsApp » (`whatsappContact`) et l'e-mail `LANDING_CONTACT_EMAIL` ;
  - les liens : Forfaits, Comment ça marche, FAQ, Se connecter, Créer un compte, et les pages légales ;
  - les réseaux sociaux, dès que le porteur donne leurs liens ;
  - le grand logo du lot 9a.

## 6. Page Forfaits — `/forfaits`

Page statique, indexée. On l'ouvre depuis le menu et le pied de page. Elle reprend `offerCards`, `planFeatures`, `BEST_VALUE` et `PLANS`, sans rien recopier à la main.

La section `#tarifs` de l'accueil disparaît. Le menu, le pied de page et `StickyCta` (qui se cachait sur cette section) passent à `/forfaits`. Aucun autre lien du site ne visait `#tarifs`.

### 6.1 Haut de page

- **Titre (H1)** : Un forfait à la taille de ton activité
- **Texte** : Que tu postes un produit par mois ou dix par jour, choisis le pass qui suit ton rythme. Tu paies une seule fois, par Mobile Money, sans abonnement qui se renouvelle tout seul.
- **Bouton à deux positions** : « Courte durée » | « Au mois ». Il s'ouvre sur « Courte durée », pour montrer d'abord l'essai gratuit et le prix le plus bas. Le choix s'inscrit dans l'adresse (`?duree=mois`), pour qu'un lien partagé ouvre le bon onglet.

### 6.2 Les cartes

Une carte courte, inspirée de Cartilyzer, contient :

- le nom ;
- une phrase « pour qui » (`forWho`) ;
- le prix, en gros ;
- « N jours · N réponses » ;
- au plus quatre lignes « ✓ » ;
- la ligne « Et tout le reste est inclus » ;
- le bouton.

Le détail complet est dans le tableau dessous.

| Onglet | Cartes |
|---|---|
| Courte durée | Essai gratuit · Pass Semaine · Pass 2 Semaines · **Pass Illimité** |
| Au mois | Pass Mois · Pass Mois Plus · **Pass Mois Max** (bandeau « Le meilleur prix par réponse ») · **Pass Illimité** |

**L'essai gratuit** :

- 0 FCFA ;
- 3 jours · 50 réponses ;
- inclus (✓) : 1 campagne, l'avis sur la quantité à commander, les numéros de tes clients ;
- pas inclus, en grisé : un lien par groupe, l'export pour Excel, sans « Propulsé par Tamani » ;
- bouton : « Commencer gratuitement », vers `/signup`.

**Les pass** :

- inclus (✓) : campagnes illimitées, l'avis sur la quantité, un lien par groupe, l'export pour Excel ;
- bouton : « Choisir ce pass ». Il mène à `/signup`, ou à l'achat du pass dans l'espace boutique si le visiteur est déjà connecté. Le constructeur suit le parcours existant du lot 8.

**Le Pass Illimité** :

- prix « Parlons-en » ;
- phrase : Pour les grossistes qui postent tous les jours dans de grands groupes ;
- bouton : « Nous écrire sur WhatsApp ».

**Les rassurances**, en bande sous les cartes, comme dans la capture :

- Paiement Mobile Money ou carte ;
- Pas de renouvellement automatique ;
- Ton lien ne s'arrête jamais ;
- Réponses gardées après ton pass ;
- Essai sans carte bancaire.

### 6.3 Encadré « Et quand mon pass se termine ? »

Tes campagnes continuent. Tes clients peuvent toujours répondre, et leurs réponses sont gardées. Tu les retrouves, avec les numéros, dès que tu reprends un pass. Si tu prends un nouveau pass avant la fin du précédent, tes réponses non utilisées s'ajoutent au nouveau.

### 6.4 Le tableau qui compare tout

- **Colonnes** : les sept offres.
- **Lignes** :
  - le prix, la durée, les réponses incluses ;
  - les campagnes à la fois ;
  - chaque ligne de `planFeatures`.
- Sur téléphone, le tableau défile sur le côté dans son propre cadre. La première colonne reste fixe, et la page elle-même ne déborde jamais.

### 6.5 Questions sur les forfaits

Quatre questions, en `FAQPage` propre à la page :

- Comment je paie ?
- Le pass se renouvelle-t-il tout seul ? Non. Un rappel arrive 3 jours avant la fin, puis il reste 3 jours de grâce.
- Que se passe-t-il si j'utilise toutes mes réponses ? Les nouvelles réponses sont gardées en attente. Un nouveau pass démarre tout de suite et garde les réponses non utilisées.
- Puis-je changer de pass ?

Chaque réponse s'appuie sur les règles du lot 8 telles que le code les applique.

## 7. Connexion et inscription

S'applique à toutes les pages du groupe `(auth)` : connexion, inscription, code e-mail, mot de passe oublié, réinitialisation. On garde les couleurs claires de Tamani.

**Sur ordinateur (à partir de 1024 px)**, deux colonnes.

- **À gauche, une grande carte arrondie** d'environ 46 % de la largeur, sur toute la hauteur moins une marge :
  - le dessin du lot 9a (`inscription` ou `connexion`, en portrait) remplit la carte ;
  - en haut à gauche, le logo ;
  - en haut à droite, une pastille « ← Retour au site » ;
  - en bas, la phrase de la page (`COPY` de `auth-panel.tsx`), sur un léger dégradé qui la garde lisible.
- **À droite, le formulaire** centré :
  - le titre (« Créer un compte » / « Se connecter ») ;
  - juste dessous, le lien vers l'autre page (« Déjà inscrit ? Se connecter » / « Pas encore de compte ? Créer un compte ») ;
  - les champs, plus grands, au style de la capture ;
  - un œil pour montrer le mot de passe, s'il n'existe pas déjà ;
  - le bouton principal ;
  - « ou », puis Google si Google est configuré.

**Sur téléphone**, l'image est aussi visible : un bandeau arrondi d'environ 220 px en haut, avec le logo et la phrase, puis le formulaire.

Le comportement des formulaires ne change pas : CSRF, erreurs, codes. Seule la mise en page change.

## 8. SEO et visibilité dans les IA

### 8.1 Ce que la recherche a montré (2026-11-05)

- **Qui sort en premier.** Sur « vendre sur WhatsApp », « précommande / dropshipping en Afrique » ou « vendre sur TikTok live », la première page de Google est faite de blogs de prestataires. Kolonell et Beezy publient un article par question **et par ville** (« vendre sur WhatsApp à Cotonou 2026 », « précommande Lomé 2026 »).
  - Ce qui gagne, c'est un contenu précis, local et récent.
  - Une page d'accueil seule ne peut pas couvrir toutes ces questions : c'est le rôle du blog (§8.6).
- **Ce que les IA citent** (guides GEO 2026) :
  - une réponse donnée dès les premières lignes ;
  - des blocs question-réponse de 40 à 60 mots ;
  - des titres clairs ;
  - des faits précis et des pages tenues à jour ;
  - une base SEO saine : page indexée, adresse canonique, chargement rapide.
  - Google dit qu'aucun fichier spécial n'est requis pour ses réponses IA. Un `llms.txt` ne coûte presque rien, mais ne remplace pas le reste.
- **Bing alimente la recherche de ChatGPT.** Il faut inscrire le site dans Bing Webmaster Tools en plus de Google Search Console.

### 8.2 Les mots clés et leur page

| Page | Mots clés principaux | Mots clés secondaires |
|---|---|---|
| `/` | savoir quoi commander avant d'acheter son stock ; vendre sur WhatsApp, TikTok et Facebook ; tester un produit avant de commander ; précommande sans site web | stock invendu, grossiste, vendeur en ligne, groupe de vente WhatsApp, Afrique francophone, Bénin, Togo |
| `/forfaits` | prix Tamani, forfait, pass, essai gratuit | paiement Mobile Money, sans abonnement |
| Blog (plus tard) | toutes les questions du porteur (§8.6) | les variantes par pays et par ville |

**Où ils apparaissent** :

- dans le `<title>` et la description ;
- dans le H1 et les H2, de façon naturelle : le H2 des fonctionnalités dit « WhatsApp, TikTok et Facebook » dans son texte, celui des étapes dit « partager ton produit » ;
- dans la FAQ, dont les questions reprennent les recherches réelles (§5.9, questions 4 et 5) ;
- dans le texte alternatif des images, sans bourrage ;
- jamais plus d'une fois par paragraphe.

### 8.3 Balises

**Accueil** :

- `<title>` : Tamani : sache quoi commander avant d'acheter ton stock (55 signes).
- Description : Partage un lien produit sur WhatsApp, TikTok ou Facebook. Tes clients disent ce qu'ils veulent en 30 s, Tamani te dit quoi commander. Essai gratuit. (Au plus 160 signes, vérifié par un test.)

**`/forfaits`** :

- `<title>` : Forfaits Tamani : prix des pass et essai gratuit
- Description : Pass dès 3 900 FCFA, sans renouvellement automatique, payé par Mobile Money. Essai gratuit 3 jours, 50 réponses. Le prix le plus bas vient de `PLANS`, jamais écrit à la main.

**Les deux pages** :

- `lang="fr"` ;
- une adresse canonique propre à chaque page ;
- Open Graph et Twitter avec l'image `og-default`.

### 8.4 Données structurées (JSON-LD)

- `Organization` :
  - nom, logo, url ;
  - `contactPoint` WhatsApp ;
  - `sameAs` avec les réseaux, dès que leurs liens existent.
- `WebSite`.
- `SoftwareApplication` :
  - `applicationCategory: BusinessApplication`, `operatingSystem: Web` ;
  - `offers` : une `AggregateOffer` en XOF, de 0 au prix le plus haut de `PLANS`.
- `FAQPage` : sur l'accueil (§5.9) et sur `/forfaits` (§6.5), chacune avec ses propres questions.

### 8.5 Fichiers du site

- `sitemap.xml` : on ajoute `/forfaits` (priorité 0.9).
- `robots.txt` :
  - on interdit aussi `/support-admin` (aujourd'hui seul `/admin` l'est) ;
  - les robots de recherche des IA restent autorisés (OAI-SearchBot, PerplexityBot, Googlebot, Bingbot) ;
  - on n'ajoute aucun blocage.
- `/llms.txt` : un court texte qui dit ce qu'est Tamani, pour qui, et donne les liens de l'accueil, des forfaits et de la FAQ.
- Vitesse : l'image du hero est chargée en priorité, les animations n'utilisent que `transform` et `opacity`, et rien ne fait sauter la page.

### 8.6 Pour le blog (lot à venir) : les questions du porteur, une page chacune

Chaque article :

- répond à la question dès ses premières lignes ;
- se termine par un lien vers Tamani quand Tamani aide vraiment ;
- se décline par pays quand la recherche le justifie (Bénin, Togo, Côte d'Ivoire…).

| Question | Adresse proposée |
|---|---|
| E-commerce en Afrique | `/blog/e-commerce-en-afrique` |
| Vendre sur WhatsApp | `/blog/vendre-sur-whatsapp` |
| Créer un groupe de vente sur WhatsApp | `/blog/creer-un-groupe-de-vente-whatsapp` |
| Vendre sur TikTok (et en live) | `/blog/vendre-sur-tiktok-live` |
| Trouver des grossistes fiables en Afrique, au Bénin, au Togo | `/blog/grossistes-fiables-afrique`, `/blog/grossistes-fiables-benin`, `/blog/grossistes-fiables-togo` |
| Tester un produit gagnant | `/blog/tester-un-produit-gagnant` |
| Gérer ses stocks efficacement | `/blog/gerer-ses-stocks` |
| Trouver des clients pour ses produits | `/blog/trouver-des-clients` |
| Créer une campagne publicitaire sans site web | `/blog/publicite-sans-site-web` |
| Vendre sans montrer son visage | `/blog/vendre-sans-montrer-son-visage` |
| Recevoir ses commandes | `/blog/recevoir-ses-commandes` |
| Vendre sans produits en stock | `/blog/vendre-sans-stock-precommande` |
| Le dropshipping en Afrique | `/blog/dropshipping-en-afrique` |

### 8.7 Ce qui dépend du porteur

- **Un nom de domaine.** C'est le levier SEO le plus fort qui reste. Une adresse en `vercel.app` se classe mal et ne s'imprime pas sur une carte de visite. `tamani.app` n'est toujours pas acheté. Une fois le domaine branché :
  - on inscrit le site dans Google Search Console et Bing Webmaster Tools ;
  - on y envoie le sitemap.
- **Les liens Facebook, Instagram et TikTok de Tamani**, pour le pied de page et `sameAs`.
- **La vidéo.**

## 9. Animations et interactions

En CSS seulement, comme au lot 9a : pas de bibliothèque d'animation sur le site public, et le popup `/c/**` n'est pas touché. Tout s'arrête sous `prefers-reduced-motion`. On n'anime que `transform`, `opacity` et les couleurs. Chaque animation sert la lecture ou le clic.

**Boutons**

- Au survol, le bouton se soulève de 2 px, son ombre grandit et sa flèche glisse vers la droite.
- Au clic, il s'enfonce (`scale(.98)`).
- Le focus clavier est bien visible.
- Le bouton principal du hero reçoit un léger reflet qui passe une fois quand il entre à l'écran. Il fait ensuite un petit « tic » toutes les quelques secondes tant qu'on ne l'a pas touché. C'est la « vibration » demandée, discrète, jamais en continu.

**Textes**

- Les mots du titre du hero apparaissent un par un au chargement.
- Un trait de surligneur jaune se dessine sous les mots clés.
- Les nombres (30 secondes, l'exemple avant / après) comptent jusqu'à leur valeur à l'écran.

**Sections et éléments**

- **Sections** : elles montent en fondu en entrant à l'écran (`InView`).
- **Cartes des galères** : au survol, l'icône passe du gris à la couleur et la carte se soulève.
- **Étapes** : un trait relie les trois étapes et se dessine au défilement.
- **Avant / après** : le curseur fait un petit aller-retour d'invitation, une seule fois.
- **Orbite** : garde ses vibrations et son « +1 ».
- **Forfaits** : la pastille du bouton « Courte durée / Au mois » glisse, les cartes changent en fondu et les prix défilent comme un compteur.
- **FAQ** : chaque réponse s'ouvre en douceur et sa flèche tourne.
- **Menu** : garde son comportement (il se cache en descendant, revient en remontant). Un soulignement suit la section en cours.

**Conversion**

- Le bouton principal a une seule couleur sur tout le site.
- On le retrouve après le hero, les fonctionnalités, les étapes, l'avant / après et le bandeau final.
- Chaque bouton principal porte sa rassurance juste en dessous.

## 10. Lot 11c — accès admin par code

Ce lot touche l'espace `/support-admin` et ses routes `/api/admin/*`, pour les rôles ADMIN et SUPERADMIN.

### 10.1 Le parcours

1. La personne est connectée et ouvre `/support-admin`. Si elle n'a pas de passage admin valide, elle arrive sur « Vérification » : « Un code à 6 chiffres vient d'être envoyé à h•••••@gmail.com ».
2. Le code est valable 10 minutes, avec 5 essais. Au-delà, il faut un nouveau code.
3. « Renvoyer le code » devient possible au bout de 60 secondes. Les envois sont limités (par exemple 5 par heure et par compte).
4. Une fois le code juste, elle entre.
5. Après 30 minutes sans aucune page ni action admin, elle revient sur « Vérification ».
6. « Se déconnecter » ferme aussi le passage admin.

### 10.2 Les règles de sécurité

- **Le passage admin est un cookie à part** :
  - `httpOnly`, `Secure` en production, `SameSite=Strict` ;
  - il contient un jeton aléatoire, dont la base ne garde que l'empreinte ;
  - il est lié à l'utilisateur de la session, avec la date de dernière activité.
- **Chaque page admin et chaque route `/api/admin/*`** vérifient ce passage après le contrôle de rôle existant, puis repoussent la dernière activité.
  - Une page sans passage renvoie sur « Vérification ».
  - Une route sans passage répond 401 avec un code d'erreur dédié.
- **Le code ne passe jamais dans un log.** Il part par la file d'e-mails existante (Resend) et n'est gardé qu'en empreinte.
- **Aucun fichier protégé n'est modifié** (`auth.ts`, `require-admin.ts`, `middleware/index.ts`, `audit.ts`…). Le contrôle est une nouvelle fonction, appelée après eux.
- **Chaque entrée réussie est écrite au journal** avec `logAdminAction` : qui est entré, et quand.
- **L'admin n'est pas indexé** : `noindex` sur le layout, et `/support-admin` interdit dans `robots.txt` (§8.5).
- **Pas de porte de secours.** Si l'e-mail n'arrive pas, rien d'autre n'ouvre l'admin. C'est voulu. L'accès à la boîte e-mail du porteur devient donc la clé de l'admin.

## 11. Ce qui reste au constructeur

Les mises en page exactes, les durées et les courbes des animations, le découpage en composants et les tests appartiennent au constructeur. Il respecte :

- les règles du dépôt : jetons de couleur, `formatMoney`, un seul H1, `prefers-reduced-motion`, pas d'animation dans le popup ;
- les décisions du §3.

## 12. Mes choix à vérifier (pas des décisions du porteur)

- Le titre du hero : « Commande seulement ce que tes clients vont acheter. », avec une variante proposée.
- L'onglet ouvert par défaut sur `/forfaits` : « Courte durée », pour montrer l'essai et le prix le plus bas.
- Le bandeau « Le meilleur prix par réponse » sur le Pass Mois Max : c'est la règle du porteur du 2026-10-29. Je n'invente pas de badge « le plus choisi », faute de données.
- Pas de grille de prix sur l'accueil. Le lien « Forfaits » est dans le menu et le pied de page seulement.
- L'image de connexion et d'inscription est aussi montrée sur téléphone, en bandeau.
- La FAQ gagne trois questions (« C'est quoi Tamani ? », tester un produit, vendre sans stock) pour les recherches et les IA. Elle en gagne une quatrième, sur les pays.
- Le `llms.txt`.
- Au lot 11c :
  - code valable 10 min, 5 essais, renvoi après 60 s, 5 envois par heure ;
  - une ligne au journal pour chaque entrée admin.
