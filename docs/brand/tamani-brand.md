# Charte Tamani : « Cahier du marché »

Validée par le porteur du projet le 2026-10-24. Les maquettes de référence sont à ouvrir dans un navigateur :
- `docs/brand/mockups/2026-10-24-trois-pistes.html` : les trois pistes de départ (Indigo, Marché, Cahier) ;
- `docs/brand/mockups/2026-10-24-fusion-cahier-du-marche.html` : les deux fusions. La fusion 1, « Cahier du marché », a été retenue, avec l'auvent du pop-up pris à la fusion 2.

La page `/styleguide`, en développement, montre ces mêmes écrans refaits avec les vrais composants.

## L'idée

Le grossiste tient déjà ses commandes dans un **cahier à petits carreaux**. Tamani est ce cahier, devenu intelligent :
- l'encre du stylo ;
- le calcul posé noir sur blanc ;
- un **tampon** qui tranche.

Le **marché** lui donne sa force :
- le bleu des cars rapides et le jaune des enseignes peintes ;
- de gros chiffres peints et des contours épais, lisibles en plein soleil.

Sur le pop-up, l'**auvent d'étal**, avec ses festons bleus et jaunes, signale qu'on est devant la boutique.

## Les trois piliers à l'écran

| Pilier | Comment il se voit |
|---|---|
| **Proximité** | L'objet familier : papier à carreaux, notes au stylo, date en haut de page. La question du pop-up est écrite à la main, comme un mot laissé par la boutique. Le tutoiement. |
| **Clarté** | Un verdict, un chiffre, une action. Le calcul est toujours visible (« 180 × 0,7 = 126 ») : une estimation ne se présente jamais comme une vérité. |
| **Émerveillement** | Un seul moment fort par écran : le tampon du verdict, le surligneur sur l'argent sauvé, ou le gros bouton « Oui ». |

## La voix

- On tutoie, en phrases courtes, avec des verbes d'action : « Commande environ 210 pièces. »
- On donne des chiffres plutôt que des adjectifs : « 64 personnes sont intéressées », et non « beaucoup d'intérêt ».
- On nomme les choses comme le grossiste : boutique, campagne, intéressés, revendeurs, usagers, livrer, quartier.
- Les erreurs disent ce qui s'est passé et quoi faire, sans s'excuser. Un écran vide invite à agir.
- Pas d'emoji dans l'interface. Ils sont permis dans les messages WhatsApp préparés pour le grossiste.

## Couleurs

La source testée est `frontend/src/lib/design/tokens.ts`. `globals.css` en est le miroir.

| Token | Hex | Rôle | Interdit |
|---|---|---|---|
| `bg` (papier) | `#FDFDF8` | Fond des pages | — |
| `surface` | `#FFFFFF` | Cartes, champs, bouton secondaire | — |
| `grid` (carreaux) | `#DDE6F4` | Lignes du papier à carreaux (18 px) | Jamais comme texte |
| `margin` (marge) | `#E2878A` | Ligne de marge, soulignés de titre | Jamais comme texte ni comme bouton |
| `ink` (encre) | `#10204A` | Texte principal, contours, ombre pressée | — |
| `ink-soft` | `#3E4660` | Texte secondaire | — |
| `ink-muted` (crayon) | `#596071` | Notes au crayon, légendes, `WAIT` | — |
| `primary` (stylo bleu) | `#1A4FBF` | Titres à la main, bouton principal, icône de l'app | — |
| `accent` (jaune enseigne) | `#FFCC1F` | Surligneur, onglet actif, symbole du logo, choix sélectionné | Jamais comme texte sur fond clair |
| `success` | `#1B7344` | Tampon « Commande » (`GO`) | — |
| `warning` | `#B8520A` | Tampon « Prudence » (`CAUTION`) | — |
| `danger` | `#B42318` | Tampon « N'achète pas » (`STOP`), « trop cher » entouré | — |
| `neutral-verdict` | `#596071` | Tampon « On attend » (`WAIT`), en pointillés | — |
| `whatsapp` / `whatsapp-ink` | `#25D366` / `#073B1F` | **Uniquement** le bouton « WhatsApp » | Rien d'autre (spec §3) |

Le verdict `NEUTRAL` (« Demande ») utilise `primary`.

Toutes les paires texte/fond déclarées dans `contrastPairs` ont un contraste d'au moins 4,5:1, vérifié par `contrast.test.ts`.

## Typographie

| Rôle | Police | Utilitaire | Usage |
|---|---|---|---|
| Texte | **Andika** 400 et 700 | `font-sans` | Tout le texte courant, les champs et les boutons. Elle a été dessinée par SIL pour l'alphabétisation : lettres très distinctes, et prise en charge des langues africaines. |
| À la main | **Kalam** 400 et 700 | `font-hand` | Titres de page et de section, notes dans la marge, question du pop-up. |
| Enseigne | **Bowlby One** | `font-sign` | Les chiffres qui comptent (tampon, argent, prix) et le mot du tampon. |

- **Échelle** : 12, 14, 16, 18, 21, 24, 32, 40, 48 et 60 px. Le texte courant fait 16 px, les notes 14 px au minimum, et le texte des champs **jamais moins de 16 px**, pour éviter le zoom automatique d'iOS.
- **Interdits** :
  - pas de Kalam pour un paragraphe ni pour un chiffre de tableau ;
  - pas de Bowlby pour du texte courant ;
  - pas de capitales pour des étiquettes : les capitales espacées sont réservées au mot du tampon.

## Mise en page

- **Le papier** (`bg-paper`) : carreaux de 18 px. Les lignes de tableau font 36 px, soit deux carreaux. Sur les pages longues, une ligne de marge de 1,5 px en `margin` se trouve à 31 px du bord.
- **Les contours** (`border-ink`) : 2,5 px en `ink` sur les cartes, les boutons et les champs. Les rayons : `case` 4 px, `control` 16 px, `card` 18 px, `sheet` 30 px.
- **Une seule audace par écran** :
  - l'ombre pressée `shadow-press` (`4px 4px 0` ink) ne va que sur le geste principal ;
  - le tampon ne sert qu'au verdict ;
  - le surligneur ne sert qu'à l'argent ;
  - l'auvent ne sert qu'au pop-up.
- **Le calcul est visible** : chaque estimation est accompagnée de sa table (`CalcTable`) ou du lien « Comment c'est calculé ? ».
- Le contenu est aligné à gauche. Seuls le tampon et les boutons sont centrés.

## Logo

- **Le symbole** est une bulle de parole jaune cerclée d'encre. Ses trois lignes de texte sont les **cordes du tamani**, pincées au milieu comme quand le batteur serre son tambour pour le faire parler.
- **Le mot-symbole** est « tamani » en minuscules, en Kalam Bold vectorisé, couleur `primary`.
- **Les fichiers** :
  - `frontend/public/brand/tamani-mark.svg` (symbole) et `tamani-logo.svg` (symbole et mot) ;
  - `frontend/src/app/icon.svg` (favicon) et `apple-icon.png` ;
  - `frontend/public/brand/og-default.png` (aperçu des liens partagés).
  - Les tracés sont dans `frontend/src/lib/design/logo-paths.ts`, et la façon de les refaire dans `docs/brand/sources/README.md`.
- **Zone de protection** : un quart de la hauteur du symbole tout autour. **Taille minimum** : 16 px pour le symbole, 96 px de large pour le logo complet.
- **À ne pas faire** :
  - changer les couleurs du symbole ;
  - le poser sur une photo sans fond ;
  - le déformer ;
  - lui ajouter une ombre ;
  - écrire « Tamani » dans une autre police à côté.

## Le verdict

Les règles et les phrases exactes sont dans `frontend/src/lib/tamani/verdict-display.ts` (seuils de la spec §5.4.0).

| Code | Tampon | Couleur | Exemple de phrase |
|---|---|---|---|
| `GO` | Commande ~X | `success` | « Commande environ 380 pièces. » |
| `CAUTION` | Prudence ~X | `warning` | « Commande environ 210 pièces, pas les 400 prévues. » + note « et pas 400 ! » |
| `STOP` | N'achète pas | `danger` | « N'achète pas, ou très peu : la demande réaliste est de 90 pièces pour 400 prévues. » |
| `WAIT` | On attend n/20 | `neutral-verdict`, pointillés | « Encore 11 réponses avant de te conseiller. » |
| `NEUTRAL` | Demande ~X | `primary` | « Ta communauté demande environ 210 pièces. » |

Les quantités affichées sont arrondies à la dizaine à partir de 30 (211 donne « ~210 »). La phrase de base reste exacte : « Entre 176 et 246 pièces, d'après 94 réponses dont 64 intéressés. »

## Accessibilité et mouvement

- Contraste ≥ 4,5:1, testé.
- Cible tactile ≥ 48 px, et 64 px pour les choix du pop-up.
- Focus visible : anneau `primary` de 3 px.
- Le pop-up anime **seulement en CSS**, sans `motion`, `framer-motion` ni `gsap` (garde-fou `no-motion-in-popup.test.ts`). Toute animation s'arrête sous `prefers-reduced-motion`.
- Deux thèmes depuis le lot 7a (demande du porteur, 2026-10-28) : le **jour** reste la référence ; le **« carnet de nuit »** (papier bleu nuit, carreaux à peine visibles, l'encre devient de la craie) n'existe que dans l'espace grossiste, au choix de chacun. La page d'accueil, la connexion et le pop-up des clients restent en jour. Les jetons de nuit sont `nightColors` dans `tokens.ts`, avec les mêmes paires de contraste testées.
