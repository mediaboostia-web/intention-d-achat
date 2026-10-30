// Turns the porteur's ChatGPT illustrations (docs/brand/mockups/images/*.png,
// prompts in docs/brand/prompts-images-accueil.md) into the light WebP files the
// home page serves from public/accueil/. next/image then resizes them per screen.
//
// Run from the repo root: `pnpm landing:images`.
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// sharp comes with Next (it powers next/image); it is not a direct dependency.
const requireFromNext = createRequire(createRequire(import.meta.url).resolve('next/package.json'));
const sharp = requireFromNext('sharp') as typeof import('sharp');

const FRONTEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.resolve(FRONTEND, '../docs/brand/mockups/images');
const TARGET = path.resolve(FRONTEND, 'public/accueil');
const NAMES = [
  'hero',
  'video-affiche',
  'probleme',
  'etape-1',
  'etape-2',
  'etape-3',
  'avant',
  'apres',
  'communaute',
  'menu-support',
  'menu-groupe',
  'connexion',
  'inscription',
] as const;
const MAX_WIDTH = 1600;
const QUALITY = 78;

async function main() {
  const missing = NAMES.filter((n) => !existsSync(path.join(SOURCE, `${n}.png`)));
  if (missing.length > 0) {
    console.error(`Missing in ${SOURCE}: ${missing.map((n) => `${n}.png`).join(', ')}`);
    process.exit(1);
  }
  mkdirSync(TARGET, { recursive: true });
  for (const name of NAMES) {
    const out = path.join(TARGET, `${name}.webp`);
    const info = await sharp(path.join(SOURCE, `${name}.png`))
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: QUALITY, effort: 6 })
      .toFile(out);
    console.log(
      `${name}.webp ${info.width}x${info.height} ${Math.round(statSync(out).size / 1024)} KB`,
    );
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
