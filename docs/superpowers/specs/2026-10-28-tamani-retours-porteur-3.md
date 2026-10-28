# Tamani — Retours du porteur : la passe UX/UI (complément de conception)

Ce document complète [2026-10-24-tamani-design.md](2026-10-24-tamani-design.md), qui reste la référence, et les retours du [2026-10-25](2026-10-25-tamani-retours-porteur.md) et du [2026-10-28](2026-10-28-tamani-retours-porteur-2.md). Il consigne ce que le porteur a demandé le 2026-10-28, après avoir testé le lot 7 (« c'est bon pour le moment »), puis validé sur les maquettes (canvas « Tamani UX/UI v2 », cinq commentaires traités).

- `[décidé]` : choisi par le porteur, ou vu et validé sur la maquette.
- `[choix]` : proposé par moi, à corriger s'il le faut.

## 0. Ordre et périmètre [décidé]

- **Lot 7a « Passe UX/UI »**, sur la branche `plan/07a-design`, partie de `plan/07-commandes`. Ensuite le lot 7b (pays et monnaies), puis le lot 8.
- On garde le style « Cahier du marché » ; on l'améliore. L'app doit être épurée, aérée, accessible, **sans débordement** à 390 px comme à 1280 px, et simple à utiliser.
- L'effort porte sur l'**ordinateur**. Le téléphone garde sa barre du bas et ses écrans ; il gagne seulement le mode nuit et le pop-up retouché.

## 1. La coque sur ordinateur [décidé]

1. **Barre latérale repliable** : la couverture du cahier (encre, carreaux pâles), 248 px dépliée, 84 px repliée (icônes seules, leur nom en infobulle et pour les lecteurs d'écran). Un bouton en haut de la page la replie et la déplie. Le choix est gardé sur l'appareil [choix : `localStorage`, appliqué avant l'affichage pour éviter un saut].
2. **Barre du haut** (à partir de 1024 px), de gauche à droite :
   - le bouton de repli ;
   - la **recherche** (Ctrl K ou ⌘ K la met en main) ; ses résultats s'ouvrent dessous, rangés par **Campagnes, Produits, Clients** [choix : les clients remplacent les commandes de la maquette, car on retrouve une commande depuis la fiche du client ; 5 résultats par groupe ; à partir de 2 caractères] ;
   - le bouton **jour / nuit** ;
   - la **cloche** (celle d'aujourd'hui) ;
   - le **profil** : l'avatar et le prénom, qui ouvre `/app/profil`.
3. **Largeur** : l'accueil et les listes (campagnes, produits, clients, commandes) prennent toute la page (jusqu'à 1360 px) ; les fiches et les formulaires gardent leur colonne lisible [choix].

## 2. Le mode nuit [décidé, palette : choix]

- La charte disait « thème clair uniquement en v1 » : le porteur a demandé l'icône de changement de couleur. La charte passe à **deux thèmes**, le jour reste la référence.
- **« Carnet de nuit »** : papier bleu nuit, carreaux à peine visibles, l'encre devient de la craie. Jetons de nuit (même noms que le jour) : `bg #0C1430`, `surface #131F45`, `grid #18264B`, `ink #EEF1FA`, `inkSoft #C6CDE2`, `inkMuted #9EA8C4`, `primary #93B2FF`, `primaryInk #0C1430`, `success #5FD39A`, `warning #F4A867`, `danger #FF8F85`, `neutralVerdict #9EA8C4`. Le jaune, WhatsApp et leurs encres ne changent pas.
- Un jeton **`deep`** (couverture du cahier, `#10204A` le jour, `#070D24` la nuit) et son encre **`deepInk`** gardent la barre latérale et les cartes encre sombres dans les deux thèmes.
- Chaque paire texte / fond déclarée atteint 4,5:1 **dans les deux thèmes** (test).
- Le mode nuit ne touche que **l'espace grossiste** (`/app`). La page d'accueil, les pages de connexion et le pop-up des clients restent en jour [choix].
- Par défaut : jour. Le choix est gardé sur l'appareil, appliqué avant l'affichage [choix].

## 3. L'accueil du tableau de bord sur ordinateur [décidé]

- **Toute la page, peu de défilement**, deux colonnes :
  - à gauche, le contenu :
    - la salutation et la date, avec les boutons **alignés** sur la même ligne (Partager sur WhatsApp, Ajouter un produit, Créer une campagne) ;
    - la carte bleue **« Cette semaine » gardée comme avant** (commentaire du porteur) ;
    - la ligne surlignée **« Argent protégé ce mois-ci »** ;
    - **« Tes verdicts »** : une carte par campagne ouverte, avec le tampon, la jauge, le calcul écrit à la main et des boutons alignés en bas de carte. Le verdict est l'élément fort.
  - à droite, une colonne fixe pour agir :
    - « À faire maintenant » ;
    - « Depuis hier » (l'activité) ;
    - « À venir ».
- Sur téléphone, l'ordre d'aujourd'hui ne change pas.

## 4. Cartes ou liste [décidé]

- Les onglets qui montrent des cartes, **Campagnes et Produits**, ont un choix **« Cartes / Liste »**. Il est gardé sur l'appareil, par onglet [choix].
- **Cartes** : plus petites qu'aujourd'hui, avec la **photo** du produit en bandeau (commentaire du porteur), le statut, la disponibilité, la fin.
- **Liste** : une ligne par élément, une vignette de 44 px, les mêmes informations en colonnes sur ordinateur.

## 5. Le pop-up des clients [décidé]

1. **Le stock** : « Plus que 200 bouteilles » était mal dit. On écrit **« 200 bouteilles en stock »**, et la disponibilité **« Disponible maintenant »**, chacun avec un pictogramme dessiné pour Tamani (étal, cartons empilés), pas une icône générique.
2. **La fenêtre de fin**, une fenêtre propre, claire et simple, par-dessus le pop-up :
   - après un **Oui** : « C'est noté, {Prénom} ! », « Ta commande de {quantité} {unités} de {produit} est bien enregistrée. », « {Boutique} va te contacter sur WhatsApp pour la confirmer. », puis le rappel (quand, comment). Boutons : « Fermer », « Modifier ma réponse ».
   - après un **Non** : « Merci pour ton avis ! », « {Boutique} en tient compte pour ses prochains arrivages. ». Boutons : « Fermer », « En fait, ça m'intéresse » (qui reprend au choix acheteur).
3. **« Propulsé par Tamani »** est un vrai lien vers l'app (`APP_URL`, donc le domaine de production une fois en ligne), ouvert dans un nouvel onglet pour ne pas perdre la réponse.

## 6. La barre du téléphone sur la page d'accueil [décidé]

- Sur téléphone, plus de bouton « Se connecter » ni de bandeau blanc derrière le logo : le logo et le **menu** (bouton jaune) posés sur le papier. Quand la barre revient en remontant, elle prend un fond papier léger pour rester lisible [choix].
- Le menu **s'ouvre par le côté** (depuis la droite), sur un fond assombri ; les liens apparaissent l'un après l'autre ; en bas, **« Commencer gratuitement »** puis « Déjà un compte ? Se connecter ».
- Échap, le fond ou la croix le ferment ; le focus reste dans le menu tant qu'il est ouvert. Les animations s'arrêtent sous `prefers-reduced-motion`.
- Sur ordinateur, la barre ne change pas.

## 7. Ce qui ne change pas

- Les règles métier, les routes existantes et leurs codes d'erreur.
- La barre du bas du téléphone et ses cinq entrées.
- La règle du pop-up : pas de bibliothèque d'animation.
