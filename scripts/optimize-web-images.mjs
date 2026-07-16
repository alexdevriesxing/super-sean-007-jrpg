import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const projectRoot = path.resolve('super_sean_007_full_project_wired');
const srcDir = path.join(projectRoot, 'assets', 'generated', 'battle_backgrounds');
const outDir = path.join(projectRoot, 'assets', 'web');

// Homepage gallery + hero sources: shrink multi-MB PNGs to fast WebP.
const images = [
  'zonnig_fantasiedorp_met_kastelen_en_brug',
  'zonnig_boerderijlandschap_met_houten_hek',
  'sfeervol_bloemenlandschap_met_fruitbomen',
  'magisch_landschap_met_kristallen_en_watervallen',
  'herfstlandschap_met_pompoenen_en_bladeren',
  'vrolijke_natuurlijke_strijdarena_met_riviertje',
  'betoverend_winterlandschap_met_kristallen',
  'magische_luchtlandschappen_met_kristallen_toppen'
];

await mkdir(outDir, { recursive: true });

for (const name of images) {
  const src = path.join(srcDir, `${name}.png`);
  const out = path.join(outDir, `${name}.webp`);
  const info = await sharp(src)
    .resize(1024, null, { withoutEnlargement: true })
    .webp({ quality: 78, effort: 6 })
    .toFile(out);
  console.log(`${name}.webp ${(info.size / 1024).toFixed(0)} kB`);
}
console.log(`Wrote ${images.length} optimized WebP images to assets/web/`);

// Title-screen key art: the raw PNG is ~2.8MB; serve a 1920-wide WebP instead
// (drawn on a 960x540 canvas, so 1920 keeps it crisp on retina displays).
const keyArtInfo = await sharp(path.join(projectRoot, 'assets', 'key-art-main.png'))
  .resize(1920, null, { withoutEnlargement: true })
  .webp({ quality: 80, effort: 6 })
  .toFile(path.join(projectRoot, 'assets', 'key-art-main.webp'));
console.log(`key-art-main.webp ${(keyArtInfo.size / 1024).toFixed(0)} kB`);
