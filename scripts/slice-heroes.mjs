/* Build the playable hero art from the generated character sheets.
   Replaces the flat placeholder strips/portraits in assets/characters/ with
   frames cut from assets/generated/spritesheets + ui_vfx sheets.

   Strips follow data/characters.json frameOrder:
   idle, idle2, walk1, walk2, run1, run2, attack, skill, hurt, victory
   (10 frames × 88px = 880×88, the layout game.js drawCharacterFrame expects). */
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const genRoot = 'super_sean_007_full_project_wired/assets/generated';
const outDir = 'super_sean_007_full_project_wired/assets/characters';
await mkdir(outDir, { recursive: true });

const FRAME = 88;          // strip cell size expected by the engine
const SPRITE_MAX = 80;     // sprite box inside a cell, leaves a small margin

// Flood-fill from the edges, clearing the sheets' light low-saturation background.
function keyOutBackground(data, w, h) {
  const idx = (x, y) => (y * w + x) * 4;
  const isBg = (x, y) => {
    const i = idx(x, y);
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const mn = Math.min(r, g, b), mx = Math.max(r, g, b);
    return mn > 198 && (mx - mn) < 42;
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

// Keep only the largest connected blob so a crop box can never drag in a
// sliver of the neighbouring frame.
function keepLargestComponent(data, w, h) {
  const label = new Int32Array(w * h).fill(-1);
  const opaque = i => data[i * 4 + 3] > 20;
  let best = -1, bestSize = 0;
  let comps = 0;
  for (let start = 0; start < w * h; start++) {
    if (label[start] !== -1 || !opaque(start)) continue;
    const id = comps++;
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

// Crop one box from a sheet, key/clean it and return a trimmed sprite buffer.
async function cutSprite(sheet, [x, y, w, h]) {
  const raw = await sharp(path.join(genRoot, sheet))
    .extract({ left: x, top: y, width: w, height: h })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  keyOutBackground(raw.data, raw.info.width, raw.info.height);
  keepLargestComponent(raw.data, raw.info.width, raw.info.height);
  return sharp(raw.data, { raw: { width: raw.info.width, height: raw.info.height, channels: 4 } })
    .png().trim({ threshold: 1 }).toBuffer();
}

// Compose 10 frames into an 880×88 strip. Sprites are bottom-anchored so the
// characters' feet stay planted while pose heights vary.
async function buildStrip(id, sheet, boxes) {
  const cells = [];
  for (let i = 0; i < boxes.length; i++) {
    const sprite = await cutSprite(sheet, boxes[i]);
    const fitted = await sharp(sprite)
      .resize(SPRITE_MAX, SPRITE_MAX, { fit: 'inside' })
      .toBuffer({ resolveWithObject: true });
    cells.push({
      input: fitted.data,
      left: i * FRAME + Math.round((FRAME - fitted.info.width) / 2),
      top: FRAME - 4 - fitted.info.height
    });
  }
  const out = path.join(outDir, `${id}_strip.png`);
  await sharp({ create: { width: FRAME * boxes.length, height: FRAME, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(cells).png({ palette: true, quality: 90 }).toFile(out);
  console.log('strip', id, `(${boxes.length} frames)`);
}

async function buildSquare(file, sheet, box, size) {
  const sprite = await cutSprite(sheet, box);
  await sharp(sprite)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ palette: true, quality: 90 }).toFile(path.join(outDir, file));
  console.log('sprite', file);
}

const FRIENDS = 'spritesheets/super_sean_friends_spritesheets.png';
const XELAR = 'ui_vfx/xelar_de_duistere_hoge_magir.png';

// Frame boxes per hero, in frameOrder:
// [idle, idle2, walk1, walk2, run1, run2, attack, skill, hurt, victory]
const HEROES = {
  sean: [
    [89, 41, 59, 82], [265, 42, 61, 81],
    [90, 126, 50, 66], [243, 128, 49, 64],
    [84, 194, 52, 60], [231, 195, 47, 59],
    [184, 257, 100, 61], [183, 323, 50, 65],
    [90, 394, 48, 60], [87, 456, 48, 65]
  ],
  dave: [
    [517, 43, 51, 80], [658, 43, 56, 80],
    [515, 129, 50, 63], [653, 130, 59, 62],
    [515, 196, 51, 58], [654, 196, 53, 58],
    [516, 258, 75, 60], [603, 260, 48, 58],
    [515, 396, 48, 58], [520, 458, 47, 63]
  ],
  petroman: [
    [884, 39, 62, 84], [1148, 41, 58, 82],
    [894, 126, 50, 66], [1038, 127, 51, 65],
    [892, 196, 51, 58], [1026, 196, 52, 58],
    [891, 256, 67, 62], [888, 323, 75, 65],
    [895, 395, 50, 61], [892, 457, 54, 64]
  ],
  haraku: [
    [87, 566, 50, 65], [249, 567, 52, 63],
    [89, 635, 51, 58], [239, 636, 48, 57],
    [87, 697, 48, 52], [229, 697, 48, 52],
    [83, 752, 48, 54], [89, 813, 56, 50],
    [79, 866, 47, 45], [78, 914, 45, 47]
  ],
  ruush: [
    [515, 563, 51, 68], [663, 563, 61, 68],
    [519, 632, 49, 61], [665, 632, 49, 61],
    [517, 694, 51, 55], [659, 694, 52, 55],
    [509, 751, 89, 55], [512, 810, 46, 53],
    [521, 864, 48, 47], [519, 912, 49, 48]
  ]
};

// Neutral face from the FACE EXPRESSIONS block, one row per hero.
const PORTRAITS = {
  sean: [847, 563, 56, 49],
  dave: [847, 626, 55, 49],
  petroman: [847, 686, 55, 59],
  haraku: [845, 758, 57, 65],
  ruush: [846, 836, 57, 61]
};

for (const [id, boxes] of Object.entries(HEROES)) {
  await buildStrip(id, FRIENDS, boxes);
  await buildSquare(`${id}_portrait.png`, FRIENDS, PORTRAITS[id], 160);
}

// Xelar the Dark Archmage — full-body idle for world/battle, head crop for dialogue.
await buildSquare('xelar_sprite.png', XELAR, [189, 99, 100, 98], 128);
await buildSquare('xelar_portrait.png', XELAR, [303, 99, 107, 71], 160);

// Base enemy kinds (world/battle fallback art for monsters without a custom sprite).
await buildSquare('enemy_slime.png', 'spritesheets/slijmen_kristallen_en_schatkisten.png', [92, 171, 77, 78], 128);
await buildSquare('enemy_crystal.png', 'spritesheets/slijmen_kristallen_en_schatkisten.png', [423, 188, 76, 61], 128);
await buildSquare('enemy_bat.png', 'spritesheets/vliegende_wezens_en_fae_spritesheet.png', [92, 177, 92, 81], 128);
await buildSquare('enemy_mushroom.png', 'spritesheets/bosdieren_en_wezentjes_spriteblad.png', [430, 184, 86, 86], 128);

console.log('done — hero art rebuilt from generated sheets');
