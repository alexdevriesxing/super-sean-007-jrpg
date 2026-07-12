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
  [[931, 171, 28, 27], 'icon_star_gold'],
  // Map markers (3 rows of 5)
  [[1251, 45, 27, 35], 'marker_alert'],
  [[1289, 46, 27, 34], 'marker_pin'],
  [[1326, 46, 27, 34], 'marker_quest'],
  [[1364, 46, 26, 34], 'marker_star'],
  [[1402, 44, 26, 36], 'marker_gem'],
  [[1250, 94, 26, 27], 'marker_home'],
  [[1289, 94, 27, 27], 'marker_shop'],
  [[1327, 95, 25, 26], 'marker_battle'],
  [[1363, 94, 29, 27], 'marker_camp'],
  [[1403, 94, 26, 28], 'marker_anchor'],
  [[1253, 135, 20, 25], 'marker_castle'],
  [[1293, 135, 18, 26], 'marker_lock'],
  [[1329, 135, 22, 26], 'marker_gate'],
  [[1366, 135, 23, 25], 'marker_tower'],
  [[1404, 135, 25, 26], 'marker_flag'],
  // Sean emotion faces (social emotes, 2 rows of 4)
  [[1218, 608, 49, 53], 'emote_1'],
  [[1273, 608, 49, 53], 'emote_2'],
  [[1327, 608, 49, 53], 'emote_3'],
  [[1381, 608, 49, 53], 'emote_4'],
  [[1218, 670, 49, 56], 'emote_5'],
  [[1273, 671, 48, 55], 'emote_6'],
  [[1327, 670, 49, 56], 'emote_7'],
  [[1381, 671, 49, 55], 'emote_8'],
  // Treasure chests, lock & key
  [[879, 790, 40, 34], 'chest_wood'],
  [[926, 791, 39, 33], 'chest_purple'],
  [[975, 788, 44, 37], 'chest_gold'],
  [[1030, 788, 46, 37], 'chest_gem'],
  [[1100, 787, 25, 36], 'icon_lock'],
  [[1141, 788, 26, 35], 'icon_key'],
  // Achievement badges & medals (2 rows of 6)
  [[21, 911, 28, 30], 'badge_1'],
  [[66, 911, 30, 30], 'badge_2'],
  [[115, 911, 26, 30], 'badge_3'],
  [[159, 910, 30, 32], 'badge_4'],
  [[205, 910, 31, 34], 'badge_5'],
  [[250, 910, 31, 35], 'badge_6'],
  [[20, 951, 29, 27], 'badge_7'],
  [[66, 950, 30, 28], 'badge_8'],
  [[113, 951, 30, 27], 'badge_9'],
  [[159, 951, 30, 27], 'badge_10'],
  [[206, 954, 28, 23], 'badge_11'],
  [[253, 952, 24, 26], 'badge_12'],
  // Friendship hearts
  [[1263, 1036, 29, 27], 'heart_full'],
  [[1298, 1036, 29, 26], 'heart_spark'],
  [[1334, 1038, 24, 23], 'heart_empty']
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
