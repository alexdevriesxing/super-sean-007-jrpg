/* Slice detailed building / landmark sprites out of the generated buildings sheet.
   Same technique as slice-mobs: flood-fill the light sheet background to
   transparency, keep the largest connected blob, trim, pad to a square canvas. */
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const root = 'super_sean_007_full_project_wired/assets/generated';
const outDir = 'super_sean_007_full_project_wired/assets/sliced/objects';
await mkdir(outDir, { recursive: true });

function keyOutBackground(data, w, h) {
  const idx = (x, y) => (y * w + x) * 4;
  const isBg = (x, y) => {
    const i = idx(x, y);
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const mn = Math.min(r, g, b), mx = Math.max(r, g, b);
    return mn > 200 && (mx - mn) < 40;
  };
  const stack = [];
  const seen = new Uint8Array(w * h);
  const push = (x, y) => { if (x >= 0 && y >= 0 && x < w && y < h && !seen[y * w + x]) { seen[y * w + x] = 1; stack.push(x, y); } };
  for (let x = 0; x < w; x += 4) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y += 4) { push(0, y); push(w - 1, y); }
  while (stack.length) {
    const y = stack.pop(), x = stack.pop();
    if (!isBg(x, y)) continue;
    data[idx(x, y) + 3] = 0;
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
  }
}

function keepLargestComponent(data, w, h) {
  const label = new Int32Array(w * h).fill(-1);
  const opaque = i => data[i * 4 + 3] > 20;
  let best = -1, bestSize = 0;
  for (let start = 0; start < w * h; start++) {
    if (label[start] !== -1 || !opaque(start)) continue;
    const id = start;
    const stack = [start];
    label[start] = id;
    let size = 0;
    while (stack.length) {
      const p = stack.pop(); size++;
      const x = p % w, y = (p / w) | 0;
      if (x > 0 && label[p - 1] === -1 && opaque(p - 1)) { label[p - 1] = id; stack.push(p - 1); }
      if (x < w - 1 && label[p + 1] === -1 && opaque(p + 1)) { label[p + 1] = id; stack.push(p + 1); }
      if (y > 0 && label[p - w] === -1 && opaque(p - w)) { label[p - w] = id; stack.push(p - w); }
      if (y < h - 1 && label[p + w] === -1 && opaque(p + w)) { label[p + w] = id; stack.push(p + w); }
    }
    if (size > bestSize) { bestSize = size; best = id; }
  }
  for (let p = 0; p < w * h; p++) if (label[p] !== -1 && label[p] !== best) data[p * 4 + 3] = 0;
}

async function sliceOne(sheet, box, name, size = 160) {
  const src = path.join(root, sheet);
  const raw = await sharp(src).extract({ left: box[0], top: box[1], width: box[2], height: box[3] })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  keyOutBackground(raw.data, raw.info.width, raw.info.height);
  keepLargestComponent(raw.data, raw.info.width, raw.info.height);
  await sharp(raw.data, { raw: { width: raw.info.width, height: raw.info.height, channels: 4 } })
    .png().trim({ threshold: 1 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFile(path.join(outDir, `${name}.png`));
  console.log('sliced', name);
}

const B = 'ui_vfx/gedetailleerde_rpg_bouwwerken_en_iconen.png';
// [sheet, [x,y,w,h], name]
const JOBS = [
  [B, [12, 36, 100, 112], 'obj_inn'],
  [B, [108, 36, 98, 112], 'obj_tavern'],
  [B, [206, 36, 100, 112], 'obj_bakery'],
  [B, [498, 36, 100, 112], 'obj_weaponshop'],
  [B, [206, 182, 100, 110], 'obj_fishshop'],
  [B, [588, 40, 98, 114], 'obj_cottage'],
  [B, [872, 40, 98, 114], 'obj_cottage_green'],
  [B, [12, 322, 100, 112], 'obj_blacksmith'],
  [B, [300, 322, 100, 112], 'obj_carpenter'],
  [B, [108, 442, 100, 116], 'obj_barn'],
  [B, [300, 442, 104, 116], 'obj_windmill'],
  [B, [588, 322, 100, 112], 'obj_guild'],
  [B, [872, 322, 96, 116], 'obj_watchtower'],
  [B, [870, 442, 100, 120], 'obj_castle_keep'],
  [B, [1332, 322, 104, 114], 'obj_church'],
  [B, [1330, 448, 106, 122], 'obj_wizardtower'],
  [B, [108, 588, 100, 116], 'obj_snowlodge'],
  [B, [206, 588, 104, 118], 'obj_treehouse'],
  [B, [300, 588, 106, 118], 'obj_mushroomhut'],
  [B, [1030, 590, 110, 116], 'obj_fountain'],
  [B, [1332, 590, 106, 120], 'obj_gazebo'],
  [B, [132, 928, 90, 100], 'obj_castle_gate'],
  [B, [928, 930, 98, 100], 'obj_well'],
  // Small decorative props (bottom prop rows) — names match the sliced content
  [B, [1382, 1024, 54, 62], 'deco_deadtree'],
  [B, [348, 1026, 50, 60], 'deco_crystalblue'],
  [B, [4, 1024, 58, 62], 'deco_statue'],
  [B, [426, 1026, 50, 58], 'deco_crystalpurple'],
  [B, [606, 1026, 56, 60], 'deco_campfire'],
  [B, [754, 1028, 52, 56], 'deco_tree'],
  [B, [1224, 1018, 58, 68], 'deco_rocks'],
  [B, [1040, 1016, 62, 70], 'deco_lamp'],
  [B, [868, 1016, 62, 70], 'deco_flowerpot'],
  [B, [1382, 932, 52, 60], 'deco_signpost'],
  [B, [1190, 996, 60, 54], 'deco_marketstall'],
  [B, [1340, 998, 56, 52], 'deco_bush'],
  // Props from the generated tileset packs (cozy collection, desert, ice, objects)
  ['tilesets/gezellige_rpg_game_tileset_collectie.png', [946, 725, 74, 53], 'deco_bench'],
  ['tilesets/gezellige_rpg_game_tileset_collectie.png', [774, 725, 75, 62], 'deco_cookpot'],
  ['tilesets/gezellige_rpg_game_tileset_collectie.png', [548, 725, 56, 66], 'deco_stonelantern'],
  ['tilesets/kleurrijke_desert_en_tropische_game_tileset.png', [13, 626, 101, 83], 'deco_tent'],
  ['tilesets/kleurrijke_desert_en_tropische_game_tileset.png', [93, 420, 70, 76], 'deco_palm'],
  ['tilesets/kleurrijke_desert_en_tropische_game_tileset.png', [941, 424, 57, 66], 'deco_cactus'],
  ['tilesets/ijs_en_kristalbiome_tileset.png', [762, 740, 83, 66], 'deco_icearch'],
  ['tilesets/ijs_en_kristalbiome_tileset.png', [858, 740, 51, 68], 'deco_froststatue'],
  ['tilesets/spellenobjecten_en_terrein_voor_rpg.png', [124, 570, 76, 96], 'deco_pedestal'],
  ['tilesets/spellenobjecten_en_terrein_voor_rpg.png', [1314, 462, 91, 92], 'deco_portal'],
  ['tilesets/spellenobjecten_en_terrein_voor_rpg.png', [644, 17, 67, 88], 'deco_barrel'],
  ['tilesets/spellenobjecten_en_terrein_voor_rpg.png', [1315, 17, 117, 90], 'deco_minecart']
];

for (const [sheet, box, name] of JOBS) {
  try { await sliceOne(sheet, box, name); } catch (e) { console.error('FAILED', name, e.message); }
}
const names = JOBS.map(j => j[2]);
await writeFile(
  'super_sean_007_full_project_wired/data/object-manifest.json',
  JSON.stringify({ base: 'assets/sliced/objects/', sprites: names }, null, 2) + '\n'
);
console.log('done — wrote data/object-manifest.json with', names.length, 'objects');
