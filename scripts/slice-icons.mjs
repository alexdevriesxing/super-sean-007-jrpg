/* Slice item/UI icons out of the generated colorful UI elements sheet.
   Same background-keying as slice-objects, but keeps ALL opaque components
   inside the crop (icons have detached sparkles/highlights) instead of only
   the largest blob. Boxes were measured by connected-component detection. */
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const src = 'super_sean_007_full_project_wired/assets/generated/ui_vfx/kleurrijke_rpg_ui_elementensheet.png';
const outDir = 'super_sean_007_full_project_wired/assets/sliced/icons';
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
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (stack.length) {
    const y = stack.pop(), x = stack.pop();
    if (!isBg(x, y)) continue;
    data[idx(x, y) + 3] = 0;
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
  }
}

const PAD = 3, SIZE = 64;
async function sliceOne(box, name) {
  const left = Math.max(0, box[0] - PAD), top = Math.max(0, box[1] - PAD);
  const raw = await sharp(src).extract({ left, top, width: box[2] + PAD * 2, height: box[3] + PAD * 2 })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  keyOutBackground(raw.data, raw.info.width, raw.info.height);
  await sharp(raw.data, { raw: { width: raw.info.width, height: raw.info.height, channels: 4 } })
    .png().trim({ threshold: 1 })
    .resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFile(path.join(outDir, `${name}.png`));
  console.log('sliced', name);
}

// [x, y, w, h] boxes from component detection on the four top icon rows.
const JOBS = [
  // Row 1 — items & rewards
  [[573, 16, 33, 35], 'icon_sword'],
  [[615, 15, 31, 37], 'icon_shield'],
  [[653, 14, 32, 38], 'icon_wand'],
  [[688, 16, 35, 36], 'icon_book'],
  [[727, 15, 38, 38], 'icon_scroll'],
  [[769, 18, 37, 34], 'icon_chest'],
  [[811, 16, 32, 36], 'icon_gift'],
  [[851, 17, 32, 34], 'icon_star'],
  [[889, 16, 34, 35], 'icon_crown'],
  [[928, 16, 37, 37], 'icon_trophy'],
  [[969, 16, 38, 36], 'icon_medal'],
  // Row 2 — elements
  [[577, 67, 27, 37], 'icon_crystal'],
  [[615, 68, 28, 35], 'icon_fire'],
  [[653, 70, 31, 33], 'icon_wind'],
  [[695, 69, 26, 33], 'icon_water'],
  [[733, 69, 30, 34], 'icon_ice'],
  [[776, 69, 25, 34], 'icon_bolt'],
  [[812, 69, 32, 34], 'icon_light'],
  [[854, 71, 28, 31], 'icon_moon'],
  [[892, 70, 32, 32], 'icon_void'],
  [[933, 69, 31, 35], 'icon_herb'],
  // Row 3 — potions & food
  [[575, 121, 27, 34], 'icon_potion_red'],
  [[615, 121, 27, 34], 'icon_potion_blue'],
  [[655, 121, 27, 34], 'icon_potion_green'],
  [[695, 121, 27, 34], 'icon_potion_purple'],
  [[735, 121, 27, 34], 'icon_potion_yellow'],
  [[774, 121, 27, 34], 'icon_jar'],
  [[811, 121, 32, 34], 'icon_cake'],
  [[852, 122, 31, 33], 'icon_mushroom'],
  [[894, 124, 29, 30], 'icon_leaf'],
  [[931, 123, 39, 32], 'icon_meat'],
  [[975, 124, 31, 30], 'icon_bread'],
  // Row 4 — coins & gems
  [[575, 171, 27, 28], 'icon_coin_gold'],
  [[615, 171, 27, 28], 'icon_coin_silver'],
  [[655, 171, 27, 28], 'icon_coin_bronze'],
  [[697, 172, 24, 26], 'icon_gem_blue'],
  [[737, 171, 23, 28], 'icon_gem_green'],
  [[777, 171, 23, 28], 'icon_gem_purple'],
  [[816, 171, 23, 28], 'icon_gem_red'],
  [[856, 171, 22, 28], 'icon_gem_rainbow'],
  [[893, 172, 25, 26], 'icon_pearl'],
  [[931, 171, 28, 27], 'icon_star_gold']
];

for (const [box, name] of JOBS) {
  try { await sliceOne(box, name); } catch (e) { console.error('FAILED', name, e.message); }
}
const names = JOBS.map(j => j[1]);
await writeFile(
  'super_sean_007_full_project_wired/data/icon-manifest.json',
  JSON.stringify({ base: 'assets/sliced/icons/', sprites: names }, null, 2) + '\n'
);
console.log('done — wrote data/icon-manifest.json with', names.length, 'icons');
