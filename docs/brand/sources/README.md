# Sources des fichiers de marque

Les fichiers de marque sont générés une fois, puis commités. Ce dossier garde ce qu'il faut pour les refaire.

| Fichier livré | Source | Comment le refaire |
|---|---|---|
| `frontend/public/brand/tamani-mark.svg`, `tamani-logo.svg`, `frontend/src/app/icon.svg` | `frontend/src/lib/design/logo-paths.ts` | Recopier `MARK_PATH`, `CORDS_PATH` et `WORDMARK_PATH`, avec les couleurs `accent`, `ink` et `primary` de `tokens.ts`. |
| `frontend/src/app/apple-icon.png` (180×180) | `apple-icon.html` | Rendu Chrome headless (voir plus bas). |
| `frontend/public/brand/og-default.png` (1200×630) | `og-default.html` | Rendu Chrome headless, avec une connexion pour charger les polices Google. |

Le test `frontend/src/lib/design/brand-assets.test.ts` vérifie la présence des fichiers, les dimensions des PNG et les couleurs des SVG.

## Rendre les PNG

Depuis la racine du repo, dans Git Bash :

```bash
C="/c/Program Files/Google/Chrome/Application/chrome.exe"
SRC="file:///$(pwd -W | sed 's/ /%20/g')/docs/brand/sources"
"$C" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --window-size=180,180 --virtual-time-budget=5000 \
  --screenshot="$(pwd -W)/frontend/src/app/apple-icon.png" "$SRC/apple-icon.html"
"$C" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --window-size=1200,630 --virtual-time-budget=10000 \
  --screenshot="$(pwd -W)/frontend/public/brand/og-default.png" "$SRC/og-default.html"
```

## Refaire le mot-symbole « tamani »

Le mot est composé en **Kalam Bold** (SIL Open Font License 1.1), puis vectorisé, pour que le logo ne dépende jamais d'une police installée.

1. Créer un environnement Python isolé, hors du repo : `python -m venv venv && venv/Scripts/pip install fonttools`.
2. Télécharger `https://github.com/google/fonts/raw/main/ofl/kalam/Kalam-Bold.ttf` dans un dossier à part.
3. Avec `fontTools`, enchaîner les glyphes de « tamani » :
   - placer chaque glyphe à l'avance (`advance`) du précédent, crénage `GPOS` compris (Kalam n'en définit pas pour ces lettres) ;
   - utiliser l'échelle `64 / unitsPerEm` ;
   - retourner l'axe Y en prenant l'`ascent` de `hhea` comme origine ;
   - dessiner avec `SVGPathPen` et `TransformPen`, et mesurer avec `BoundsPen`.
4. Arrondir les coordonnées à 0,1. Copier le chemin dans `WORDMARK_PATH` et la boîte dans `WORDMARK_VIEWBOX`.
