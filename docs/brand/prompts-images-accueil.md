# Prompts ChatGPT : les images de la page d'accueil

Ces prompts produisent les 9 images de la page d'accueil, toutes dans le style « Cahier du marché » de Tamani. Cela donne des dessins au stylo bleu, une touche de jaune, aucun texte dans l'image et la même grossiste d'une image à l'autre.

La page qui les affiche est [2026-10-25-page-accueil-v3.html](mockups/2026-10-25-page-accueil-v3.html). Tant qu'une image manque, son cadre indique le fichier attendu et le numéro du prompt.

## Comment faire

1. Ouvre une **nouvelle conversation** dans ChatGPT, avec un modèle qui sait créer des images.
2. Colle le **prompt 0** : il crée la planche de référence (le style et le personnage). Recommence jusqu'à ce qu'elle te plaise, puis écris :
   « Parfait. Garde exactement ce style et ce personnage pour toutes les images que je vais te demander. »
3. Dans **la même conversation**, colle les prompts 1 à 9, un par un.
4. Télécharge chaque image en taille originale. Renomme-la **exactement** comme indiqué (par exemple `hero.png`), puis range-la dans le dossier `docs/brand/mockups/images/`.
5. Lance `pnpm landing:images` à la racine du projet. Il fait des 9 PNG des fichiers WebP légers (moins de 350 Ko chacun) dans `frontend/public/accueil/`, ceux que le site et la maquette affichent.
6. Rouvre la page dans ton navigateur : l'image prend sa place toute seule.

Les PNG d'origine restent sur ton ordinateur : ils pèsent plus de 2 Mo chacun et ne vont pas dans git. Seuls les WebP sont versionnés.

Si tu reprends plus tard dans une autre conversation, commence par **joindre la planche de référence** (l'image du prompt 0). Colle ensuite les blocs STYLE et PERSONNAGE ci-dessous, puis le prompt de l'image.

| N° | Fichier | Format | Où sur la page |
|---|---|---|---|
| 0 | (aucun) | Paysage 3:2 | Planche de référence, pas sur le site |
| 1 | `hero.png` | Carré 1:1 | En haut, à droite du titre |
| 2 | `video-affiche.png` | Paysage 3:2 | Affiche de la vidéo (facultatif) |
| 3 | `probleme.png` | Paysage 3:2 | « Tu as déjà commandé à l'aveugle » |
| 4 | `etape-1.png` | Carré 1:1 | Comment ça marche, étape 1 |
| 5 | `etape-2.png` | Carré 1:1 | Comment ça marche, étape 2 |
| 6 | `etape-3.png` | Carré 1:1 | Comment ça marche, étape 3 |
| 7 | `avant.png` | Paysage 3:2 | Avant / après, côté « Avant » |
| 8 | `apres.png` | Paysage 3:2 | Avant / après, côté « Avec Tamani » |
| 9 | `communaute.png` | Paysage 3:2 | Rejoindre la communauté |
| 10 | `menu-support.png` | Paysage 3:2 | Menu du téléphone, ligne « Écrire au support » |
| 11 | `menu-groupe.png` | Paysage 3:2 | Menu du téléphone, ligne « Rejoindre le groupe » |
| 12 | `connexion.png` | Portrait 2:3 | Page de connexion, colonne de gauche sur ordinateur |
| 13 | `inscription.png` | Portrait 2:3 | Page d'inscription, colonne de gauche sur ordinateur |

## Les deux blocs à réutiliser

Le prompt 0 les contient déjà. Ils te servent seulement si tu changes de conversation.

**STYLE TAMANI**

```text
STYLE TAMANI
- Technique : illustration dessinée à la main, comme au stylo bille et au feutre fin par un très bon dessinateur de carnet de croquis. Traits d'encre bleu nuit, sûrs et vivants, d'épaisseur légèrement variable. Ombres en fines hachures au stylo bleu. Quelques aplats de couleur posés comme au surligneur, qui débordent à peine du trait.
- Couleurs, et seulement celles-ci : bleu nuit #10204A pour les traits ; bleu stylo #1A4FBF pour les hachures et quelques aplats ; jaune enseigne #FFCC1F pour un ou deux éléments importants seulement ; bleu très pâle #DDE6F4 pour de petits aplats de fond. Pour la peau : des bruns chauds naturels en lavis léger, différents d'une personne à l'autre. Aucune autre couleur, aucun dégradé.
- Fond : blanc pur #FFFFFF, uni. Pas de texture de papier, pas de quadrillage, pas de cadre, pas de bordure. Le dessin se fond doucement dans le blanc vers les bords, comme une vignette dans un carnet.
- Aucun texte : pas de lettres, de chiffres, de logos ni de marques, nulle part (cartons, écrans, enseignes, vêtements).
- Écrans de téléphone : seulement des formes simples (bulles arrondies jaunes et blanches), rien de lisible.
- Personnes : Africaines et Africains de l'Ouest d'aujourd'hui (Sénégal, Côte d'Ivoire, Mali), dignes, chaleureux, bien habillés. Proportions réalistes, mains justes (cinq doigts), visages expressifs. Pas de caricature, pas de clichés de pauvreté.
- Lieux : commerce de gros moderne et vivant, avec étagères métalliques, cartons empilés, sacs de riz, bidons d'huile, ballots de pagnes, rideau métallique ouvert sur une rue animée.
- À éviter : 3D, rendu photo, aspect plastique ou brillant, style dessin animé à grands yeux, ombres grises, flou.
```

**PERSONNAGE : LA GROSSISTE**

```text
PERSONNAGE : LA GROSSISTE
Une grossiste d'une quarantaine d'années, peau brun foncé, visage rond et souriant, pommettes hautes. Foulard noué en turban, à motifs bleus et jaunes. Petites boucles d'oreilles dorées. Blouse en pagne wax bleu nuit et jaune, pantalon droit bleu uni, sandales. Allure sûre d'elle, chaleureuse et débrouillarde. Elle a souvent un téléphone à la main.
```

Pour un homme à la place, remplace ce bloc par celui-ci, puis remplace « la grossiste » par « le grossiste » dans les prompts :

```text
PERSONNAGE : LE GROSSISTE
Un grossiste d'une quarantaine d'années, peau brun foncé, crâne rasé de près, barbe courte et soignée. Chemise à manches courtes en pagne wax bleu nuit et jaune, pantalon bleu uni, montre simple, sandales en cuir. Allure sûre de lui, chaleureuse et débrouillarde. Il a souvent un téléphone à la main.
```

## Prompt 0 : la planche de référence

Elle ne va pas sur le site. Elle fixe le style et le visage du personnage pour toutes les images qui suivent.

```text
Crée une planche de référence pour les illustrations du site Tamani, une application qui aide les grossistes d'Afrique de l'Ouest à savoir combien commander en demandant d'abord à leurs clients sur WhatsApp.

Sur la planche, dessine LA GROSSISTE (décrite plus bas) trois fois :
1. debout, de face, souriante, les mains jointes devant elle ;
2. de trois quarts, elle regarde son téléphone et sourit ;
3. assise sur un carton, l'air soucieux, une main sur le front.
Autour d'elle, dessine dans le même style quelques objets du décor, bien séparés : un carton fermé, une pile de cartons, un sac de riz, un bidon d'huile, un ballot de pagnes, un téléphone vu de dos, une bulle de discussion jaune.

Format paysage 3:2 (1536 × 1024).

STYLE TAMANI
- Technique : illustration dessinée à la main, comme au stylo bille et au feutre fin par un très bon dessinateur de carnet de croquis. Traits d'encre bleu nuit, sûrs et vivants, d'épaisseur légèrement variable. Ombres en fines hachures au stylo bleu. Quelques aplats de couleur posés comme au surligneur, qui débordent à peine du trait.
- Couleurs, et seulement celles-ci : bleu nuit #10204A pour les traits ; bleu stylo #1A4FBF pour les hachures et quelques aplats ; jaune enseigne #FFCC1F pour un ou deux éléments importants seulement ; bleu très pâle #DDE6F4 pour de petits aplats de fond. Pour la peau : des bruns chauds naturels en lavis léger, différents d'une personne à l'autre. Aucune autre couleur, aucun dégradé.
- Fond : blanc pur #FFFFFF, uni. Pas de texture de papier, pas de quadrillage, pas de cadre, pas de bordure. Le dessin se fond doucement dans le blanc vers les bords, comme une vignette dans un carnet.
- Aucun texte : pas de lettres, de chiffres, de logos ni de marques, nulle part (cartons, écrans, enseignes, vêtements).
- Écrans de téléphone : seulement des formes simples (bulles arrondies jaunes et blanches), rien de lisible.
- Personnes : Africaines et Africains de l'Ouest d'aujourd'hui (Sénégal, Côte d'Ivoire, Mali), dignes, chaleureux, bien habillés. Proportions réalistes, mains justes (cinq doigts), visages expressifs. Pas de caricature, pas de clichés de pauvreté.
- Lieux : commerce de gros moderne et vivant, avec étagères métalliques, cartons empilés, sacs de riz, bidons d'huile, ballots de pagnes, rideau métallique ouvert sur une rue animée.
- À éviter : 3D, rendu photo, aspect plastique ou brillant, style dessin animé à grands yeux, ombres grises, flou.

PERSONNAGE : LA GROSSISTE
Une grossiste d'une quarantaine d'années, peau brun foncé, visage rond et souriant, pommettes hautes. Foulard noué en turban, à motifs bleus et jaunes. Petites boucles d'oreilles dorées. Blouse en pagne wax bleu nuit et jaune, pantalon droit bleu uni, sandales. Allure sûre d'elle, chaleureuse et débrouillarde. Elle a souvent un téléphone à la main.
```

## Prompt 1 : le hero (`hero.png`)

La première image que l'on voit. Elle doit dire en une seconde : « mes clients me répondent ».

```text
Même style et même personnage que la planche de référence.

Scène : la grossiste se tient debout devant l'entrée de son dépôt, le rideau métallique levé. Derrière elle, des cartons et des sacs bien rangés sur des étagères. Elle tient son téléphone d'une main, l'écran tourné vers elle (on ne voit pas l'écran), et sourit, confiante, comme quelqu'un qui vient de recevoir une bonne nouvelle. Une dizaine de petites bulles de discussion jaunes et blanches, de tailles différentes, sortent de son téléphone et flottent autour d'elle : ce sont les réponses de ses clients qui arrivent.

Cadrage : on la voit des genoux à la tête, elle occupe surtout la moitié droite de l'image. Laisse un espace blanc libre en bas à gauche, environ un quart de l'image : on y posera un tampon.

Format carré 1:1 (1024 × 1024). Fond blanc pur, le dessin se fond dans le blanc sur les bords. Aucun texte, aucun chiffre, aucun logo. Le jaune #FFCC1F seulement sur les bulles et son foulard.
```

## Prompt 2 : l'affiche de la vidéo (`video-affiche.png`, facultatif)

C'est la seule image sur fond sombre. Elle sera recadrée en 16:9, avec le bouton lecture jaune posé au centre.

```text
Même personnage que la planche de référence, mais en version « couverture de cahier » : dessin à l'encre blanche sur un fond bleu nuit uni #10204A, avec des hachures bleu #1A4FBF et quelques accents jaune #FFCC1F.

Scène : la grossiste se tient dans le tiers gauche de l'image et tend son téléphone vers l'avant. Des lignes en pointillés partent de son téléphone vers six petits personnages esquissés dans la moitié droite : une revendeuse derrière son étal, un jeune homme sur une moto, une mère de famille sur son canapé, un boutiquier derrière son comptoir, un tailleur à sa machine, une étudiante. Chacun tient son téléphone. Des petites bulles jaunes reviennent vers la grossiste.

Laisse le centre de l'image dégagé (on y posera un bouton lecture rond et jaune) et garde une bande vide en haut et en bas : l'image sera recadrée.

Format paysage 3:2 (1536 × 1024). Fond bleu nuit uni, sans texture, sans quadrillage. Aucun texte, aucun chiffre, aucun logo.
```

## Prompt 3 : le problème (`probleme.png`)

Le visiteur doit se reconnaître, pas se sentir jugé.

```text
Même style et même personnage que la planche de référence.

Scène : dans son dépôt, des piles de cartons montent jusqu'au plafond. Certains sont un peu poussiéreux, avec une toile d'araignée dans un coin : ils sont là depuis longtemps. Petites étiquettes de prix jaunes, vierges, collées sur les cartons. Au premier plan, la grossiste est assise sur un carton, son téléphone posé sur les genoux, une main sur le front. Elle a l'air soucieuse mais digne : elle réfléchit, elle ne pleure pas.

Cadrage : elle est dans le tiers gauche, les piles de cartons remplissent le reste de l'image.

Format paysage 3:2 (1536 × 1024). Fond blanc pur, le dessin se fond dans le blanc sur les bords. Aucun texte, aucun chiffre, aucun logo. Le jaune #FFCC1F seulement sur les étiquettes de prix.
```

## Prompt 4 : étape 1, ajouter le produit (`etape-1.png`)

```text
Même style et même personnage que la planche de référence.

Scène : gros plan. La grossiste photographie un carton ouvert avec son téléphone. Dans le carton, des marmites en inox. On voit le téléphone de dos, tenu à deux mains ; elle est concentrée et souriante. Posée sur le carton, une petite étiquette de prix jaune, vierge.

Cadrage simple et lisible, même en petit : le téléphone, ses mains et le carton au centre.

Format carré 1:1 (1024 × 1024). Fond blanc pur, le dessin se fond dans le blanc sur les bords. Aucun texte, aucun chiffre, aucun logo. Le jaune #FFCC1F seulement sur l'étiquette.
```

## Prompt 5 : étape 2, partager le lien (`etape-2.png`)

```text
Même style et même personnage que la planche de référence.

Scène : au centre, la grossiste envoie un message depuis son téléphone, vue de profil (l'écran n'est pas lisible). Autour d'elle, quatre petites scènes rondes comme des médaillons, reliées à elle par des lignes en pointillés bleus :
- en haut à gauche, une revendeuse derrière son étal au marché ;
- en haut à droite, un jeune homme assis sur sa moto ;
- en bas à gauche, une mère de famille sur son canapé ;
- en bas à droite, un boutiquier derrière son comptoir.
Chacun regarde son téléphone et répond. Une petite bulle jaune part de chaque médaillon vers la grossiste.

Cadrage : composition claire et symétrique, lisible même en petit.

Format carré 1:1 (1024 × 1024). Fond blanc pur, le dessin se fond dans le blanc sur les bords. Aucun texte, aucun chiffre, aucun logo. Le jaune #FFCC1F seulement sur les bulles.
```

## Prompt 6 : étape 3, commander juste (`etape-3.png`)

```text
Même style et même personnage que la planche de référence.

Scène : la grossiste, détendue et sûre d'elle, donne sa commande à son fournisseur, un homme en chemise qui note dans un carnet, devant un petit camion de livraison ouvert. Entre eux, une pile de cartons nette, de taille raisonnable, sur un diable. Elle sourit, son téléphone dans une main.

Cadrage : les deux personnages dans la moitié gauche et au centre. Laisse un espace blanc libre en bas à droite, environ un quart de l'image : on y posera un tampon.

Format carré 1:1 (1024 × 1024). Fond blanc pur, le dessin se fond dans le blanc sur les bords. Aucun texte, aucun chiffre, aucun logo, rien d'écrit sur le camion. Le jaune #FFCC1F seulement sur son foulard et sur la bâche du camion.
```

## Prompt 7 : avant (`avant.png`)

Les prompts 7 et 8 vont ensemble. Sur la page, une barre glisse entre les deux images : elles doivent donc avoir **exactement le même cadrage**. Fais le 7, puis le 8 juste après, dans la même conversation.

```text
Même style et même personnage que la planche de référence.

Scène, vue de face, en plan large, à hauteur d'yeux : l'intérieur du dépôt de la grossiste. Mur du fond avec trois grandes étagères métalliques ; à droite, la porte avec son rideau métallique levé, qui donne sur la rue. Le dépôt déborde : cartons entassés jusqu'au plafond, dans les allées, devant les étagères ; certains sont abîmés et poussiéreux. Petites étiquettes de prix jaunes, vierges, sur les cartons. Au centre, la grossiste, debout, bras croisés, l'air fatigué et inquiet. Dehors, la rue est vide.

Composition simple, symétrique et bien lisible : je vais te demander juste après une seconde version du même lieu.

Format paysage 3:2 (1536 × 1024). Fond blanc pur, le dessin se fond dans le blanc sur les bords. Aucun texte, aucun chiffre, aucun logo.
```

## Prompt 8 : avec Tamani (`apres.png`)

```text
Reprends exactement l'image précédente : même cadrage, même angle, même dépôt, mêmes étagères, même porte, même personnage à la même place, même style.

Change seulement ceci :
- le dépôt est bien rangé : quelques piles de cartons propres sur les étagères, et les allées sont dégagées ;
- la grossiste sourit, détendue, son téléphone à la main ;
- par la porte, on voit un livreur qui charge des cartons sur un tricycle de livraison, et deux clients contents qui attendent leur tour ;
- de petites bulles de discussion jaunes sortent de son téléphone.

Format identique : paysage 3:2 (1536 × 1024). Fond blanc pur, aucun texte, aucun chiffre, aucun logo.
```

Si le cadrage a bougé, joins l'image « avant » et écris : « Modifie cette image. Garde tout à la même place et change seulement : » puis colle la liste ci-dessus.

## Prompt 9 : la communauté (`communaute.png`)

```text
Même style que la planche de référence. La grossiste est là, avec d'autres personnes.

Scène : sous un auvent rayé bleu et jaune, au marché, six grossistes et importateurs discutent autour d'une petite table avec des verres de thé. Trois femmes et trois hommes de 25 à 60 ans, en tenues variées : boubou, pagne wax, chemise, polo ; une des femmes porte un voile. La grossiste montre son téléphone aux autres. Ils rient et échangent, l'ambiance est complice et chaleureuse, comme entre collègues qui s'entraident.

Cadrage : le groupe au centre, l'auvent en haut de l'image.

Format paysage 3:2 (1536 × 1024). Fond blanc pur, le dessin se fond dans le blanc sur les bords. Aucun texte, aucun chiffre, aucun logo. Le jaune #FFCC1F seulement sur l'auvent et sur le foulard de la grossiste.
```

Les prompts 10 à 13 (2026-10-29) se collent dans la même conversation que les autres. Le site les affichera dès qu'ils seront dans `docs/brand/mockups/images/` et branchés dans le code.

## Prompt 10 : le support, dans le menu du téléphone (`menu-support.png`)

```text
Même style que la planche de référence. La grossiste est là.

Scène : la grossiste, debout dans sa boutique, tient son téléphone et sourit, soulagée. Sur l'écran, une grande bulle jaune et une bulle blanche, comme une conversation WhatsApp. À côté d'elle, dessinée plus petite dans un cercle comme une vignette, une jeune femme souriante avec un casque-micro léger qui lui répond depuis son téléphone. Le message de l'image : quelqu'un de vrai t'aide tout de suite.

Cadrage : la grossiste à gauche, la vignette de la conseillère en haut à droite, beaucoup de blanc autour.

Format paysage 3:2 (1536 × 1024). Fond blanc pur, le dessin se fond dans le blanc sur les bords. Aucun texte, aucun chiffre, aucun logo. Le jaune #FFCC1F seulement sur la bulle de l'écran et le foulard de la grossiste.
```

## Prompt 11 : le groupe WhatsApp, dans le menu du téléphone (`menu-groupe.png`)

```text
Même style que la planche de référence. La grossiste est là, avec d'autres personnes.

Scène : quatre grossistes et importateurs, deux femmes et deux hommes de 25 à 55 ans, chacun dans sa boutique, dessinés en quatre petites vignettes rondes disposées en arc. La grossiste est dans la vignette du milieu, la plus grande. Chacun tient son téléphone. Entre les vignettes, des bulles de discussion jaunes et blanches relient les téléphones, comme un groupe qui s'entraide. Ambiance complice, sourires.

Cadrage : l'arc de vignettes au centre, les bulles entre elles, de la marge blanche partout.

Format paysage 3:2 (1536 × 1024). Fond blanc pur, le dessin se fond dans le blanc sur les bords. Aucun texte, aucun chiffre, aucun logo. Le jaune #FFCC1F seulement sur les bulles et le foulard de la grossiste.
```

## Prompt 12 : la page de connexion sur ordinateur (`connexion.png`)

```text
Même style que la planche de référence. La grossiste est là.

Scène : tôt le matin, la grossiste relève le rideau métallique de sa boutique d'une main. De l'autre, elle regarde son téléphone : plusieurs petites bulles jaunes en sortent et montent vers le haut de l'image, comme des réponses de clients arrivées pendant la nuit. Derrière elle, les étagères pleines de cartons et de sacs de riz. Elle sourit : ses clients ont déjà répondu. Le message de l'image : ta journée commence avec les réponses de tes clients.

Cadrage : la grossiste en pied, un peu à gauche du centre ; les bulles jaunes montent vers le coin en haut à droite ; garde un espace blanc calme en bas de l'image.

Format portrait 2:3 (1024 × 1536). Fond blanc pur, le dessin se fond dans le blanc sur les bords. Aucun texte, aucun chiffre, aucun logo. Le jaune #FFCC1F seulement sur les bulles et le foulard.
```

## Prompt 13 : la page d'inscription sur ordinateur (`inscription.png`)

```text
Même style que la planche de référence. La grossiste est là.

Scène : la grossiste est assise sur un carton dans sa boutique, son téléphone levé devant elle, l'air décidé. De son téléphone part un fil jaune qui se divise en plusieurs fils vers six petits téléphones tenus par des mains de clients différents, dessinés en cercle autour d'elle. Chaque petit téléphone renvoie une bulle blanche vers elle. À ses pieds, une pile de cartons bien rangée, ni trop haute ni trop basse. Le message de l'image : demande à ta communauté avant de commander, et commande juste.

Cadrage : la grossiste au centre, le cercle de téléphones autour d'elle, beaucoup de blanc autour.

Format portrait 2:3 (1024 × 1536). Fond blanc pur, le dessin se fond dans le blanc sur les bords. Aucun texte, aucun chiffre, aucun logo. Le jaune #FFCC1F seulement sur le fil qui part du téléphone et le foulard.
```

## Phrases pour corriger une image

Envoie-les à ChatGPT juste après une image qui ne va pas.

- Du texte est apparu : « Enlève tout le texte, les lettres et les chiffres de l'image, sans rien changer d'autre. »
- Le fond n'est pas blanc : « Mets un fond blanc pur, uni, sans texture, sans quadrillage et sans cadre. »
- Le personnage a changé : « Le personnage ne ressemble plus à la planche de référence. Reprends son visage, son foulard et sa blouse. »
- Les mains sont fausses : « Corrige les mains : cinq doigts, des gestes naturels. »
- Trop de couleurs : « Garde seulement le bleu nuit, le bleu, le jaune et le bleu pâle, plus les couleurs de peau. »
- Le dessin est trop lisse : « Fais des traits plus fins et plus vivants, comme au stylo bille, avec des hachures pour les ombres. »
- Le sujet est coupé : « Dézoome un peu : je veux voir toute la scène, avec de la marge blanche autour. »
- Un logo est apparu : « Enlève tous les logos et les marques. »

## Avant de garder une image

- Aucun texte, chiffre ni logo n'est visible.
- Le fond est blanc pur (sauf l'affiche de la vidéo).
- On reconnaît la grossiste d'une image à l'autre.
- Les mains et les visages sont justes.
- Le jaune n'est que sur un ou deux éléments.
- L'espace libre demandé est bien vide (hero en bas à gauche, étape 3 en bas à droite).
- Le format et le nom du fichier sont les bons.

Ces images serviront aussi sur le vrai site. Garde les originaux : au moment de construire la page, elles seront converties dans un format plus léger.
