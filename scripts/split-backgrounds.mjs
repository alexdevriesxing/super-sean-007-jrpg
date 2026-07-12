/* Build the full battle-background library as lean 960x540 WebP files:
   - converts the 10 originally wired full-frame backgrounds from PNG,
   - splits the three 2x2 grid sheets into quarters,
   - crops the six labelled boss arenas out of the 3x2 arena sheet
     (skipping each cell's top banner strip).
   Output: assets/battle/<name>.webp */
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const srcRoot = 'super_sean_007_full_project_wired/assets/generated/battle_backgrounds';
const outDir = 'super_sean_007_full_project_wired/assets/battle';
await mkdir(outDir, { recursive: true });

const W = 960, H = 540;

async function writeOut(name, pipeline) {
  await pipeline.resize(W, H, { fit: 'cover' }).webp({ quality: 80 }).toFile(path.join(outDir, `${name}.webp`));
  console.log('bg', name);
}

// Full-frame conversions (the originally wired backgrounds).
const FULL = [
  ['village', 'zonnig_fantasiedorp_met_kastelen_en_brug.png'],
  ['meadow', 'sfeervol_bloemenlandschap_met_fruitbomen.png'],
  ['countryside', 'vrolijk_fantasielandschap_met_cottages.png'],
  ['farm', 'zonnig_boerderijlandschap_met_houten_hek.png'],
  ['mountain', 'magisch_landschap_met_kristallen_en_watervallen.png'],
  ['lake', 'fantasierijk_landschap_met_een_meer.png'],
  ['river', 'vrolijke_natuurlijke_strijdarena_met_riviertje.png'],
  ['sky', 'magische_luchtlandschappen_met_kristallen_toppen.png'],
  ['winter', 'betoverend_winterlandschap_met_kristallen.png'],
  ['autumn', 'herfstlandschap_met_pompoenen_en_bladeren.png']
];
for (const [name, file] of FULL) {
  await writeOut(name, sharp(path.join(srcRoot, file)));
}

// 2x2 grid sheets: [file, [TL, TR, BL, BR] names]
const GRIDS = [
  ['fantastische_landschappen_in_vier_scnes.png', ['lava', 'moonshrine', 'skyruins', 'darkcastle']],
  ['fantastische_rpg_achtergronden_in_vier_delen.png', ['glowswamp', 'beach', 'desertruins', 'lavacave']],
  ['vier_magische_landschappen_in_een_grid.png', ['festival', 'mushforest', 'crystalcave', 'windyplains']]
];
for (const [file, names] of GRIDS) {
  const src = path.join(srcRoot, file);
  const meta = await sharp(src).metadata();
  const cw = Math.floor(meta.width / 2), ch = Math.floor(meta.height / 2);
  const cells = [[0, 0], [cw, 0], [0, ch], [cw, ch]];
  for (let i = 0; i < 4; i++) {
    await writeOut(names[i], sharp(src).extract({ left: cells[i][0], top: cells[i][1], width: cw, height: ch }));
  }
}

// 3x2 arena sheet: crop each cell below its title banner.
const ARENAS = ['arena_mushroom', 'arena_crystal', 'arena_machine', 'arena_moon', 'arena_volcano', 'arena_xelar'];
{
  const src = path.join(srcRoot, 'fantasy_game_arenas_in_vibrant_designs.png');
  const meta = await sharp(src).metadata();
  const cw = Math.floor(meta.width / 3), ch = Math.floor(meta.height / 2);
  const banner = Math.round(ch * 0.12); // skip the baked-in label strip
  for (let i = 0; i < 6; i++) {
    const cx = (i % 3) * cw, cy = Math.floor(i / 3) * ch;
    await writeOut(ARENAS[i], sharp(src).extract({ left: cx, top: cy + banner, width: cw, height: ch - banner }));
  }
}

console.log('done — wrote', FULL.length + 12 + 6, 'battle backgrounds to assets/battle/');

// Boot loading-screen backdrop: crop the bright sky-ruins hero (bottom-left
// quarter) of the chibi loading sheet into a lean WebP the loader shows.
{
  const uiDir = 'super_sean_007_full_project_wired/assets/ui';
  await mkdir(uiDir, { recursive: true });
  const src = 'super_sean_007_full_project_wired/assets/generated/loading_event_screens/kleurrijke_rpg_laadschermen_met_chibi_helden.png';
  const meta = await sharp(src).metadata();
  const cw = Math.floor(meta.width / 2), ch = Math.floor(meta.height / 2);
  await sharp(src)
    .extract({ left: 0, top: ch, width: cw, height: ch })
    .resize(960, 540, { fit: 'cover' })
    .webp({ quality: 82 })
    .toFile(path.join(uiDir, 'loading-screen.webp'));
  console.log('bg loading-screen');
}
