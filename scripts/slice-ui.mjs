/* Slice the "Super Sean 007 — Extra Polish" UI sheet: battle transition cards
   (Battle Start / Victory / Level Up / Critical …) and battle status-effect
   icons. Same light-background flood-fill keying as the other slicers. Cards
   keep their natural portrait aspect; status icons are squared. */
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const src = 'super_sean_007_full_project_wired/assets/generated/ui_vfx/super_sean_007_game_ui_ontwerp.png';
const outDir = 'super_sean_007_full_project_wired/assets/sliced/ui';
await mkdir(outDir, { recursive: true });

function keyOutBackground(data, w, h) {
  const isBg = p => {
    const r = data[p * 4], g = data[p * 4 + 1], b = data[p * 4 + 2];
    const mn = Math.min(r, g, b), mx = Math.max(r, g, b);
    return mn > 205 && (mx - mn) < 34;
  };
  const seen = new Uint8Array(w * h);
  const stack = [];
  const push = p => { if (!seen[p]) { seen[p] = 1; stack.push(p); } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (stack.length) {
    const p = stack.pop();
    if (!isBg(p)) continue;
    data[p * 4 + 3] = 0;
    const x = p % w, y = (p / w) | 0;
    if (x > 0) push(p - 1); if (x < w - 1) push(p + 1);
    if (y > 0) push(p - w); if (y < h - 1) push(p + w);
  }
}

async function sliceOne(box, name, { square = false, size = 48, pad = 2 } = {}) {
  const left = Math.max(0, box[0] - pad), top = Math.max(0, box[1] - pad);
  const raw = await sharp(src).extract({ left, top, width: box[2] + pad * 2, height: box[3] + pad * 2 })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  keyOutBackground(raw.data, raw.info.width, raw.info.height);
  let pipe = sharp(raw.data, { raw: { width: raw.info.width, height: raw.info.height, channels: 4 } })
    .png().trim({ threshold: 2 });
  if (square) {
    pipe = pipe.resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } });
  } else {
    // Cards: preserve aspect, cap the height for a crisp popup.
    pipe = pipe.resize({ height: 220, fit: 'inside' });
  }
  await pipe.toFile(path.join(outDir, `${name}.png`));
  console.log('ui', name);
}

// Battle transition cards [x,y,w,h].
const CARDS = [
  [[28, 95, 110, 133], 'card_player_turn'],
  [[145, 95, 109, 133], 'card_enemy_turn'],
  [[261, 95, 108, 133], 'card_battle_start'],
  [[373, 95, 102, 133], 'card_victory'],
  [[28, 234, 111, 124], 'card_crit'],
  [[145, 234, 109, 124], 'card_levelup'],
  [[261, 234, 108, 124], 'card_newskill'],
  [[374, 234, 110, 124], 'card_item']
];
// Status effect icons [x,y,w,h].
const STATUS = [
  [[30, 1004, 27, 30], 'status_poison'],
  [[83, 1001, 27, 35], 'status_burn'],
  [[134, 1002, 34, 34], 'status_freeze'],
  [[194, 1003, 24, 33], 'status_paralyze'],
  [[248, 1006, 27, 29], 'status_sleep'],
  [[312, 1002, 31, 34], 'status_stun'],
  [[372, 1006, 27, 29], 'status_silence'],
  [[428, 1005, 27, 31], 'status_confuse'],
  [[485, 1007, 26, 29], 'status_weak'],
  [[534, 1005, 26, 30], 'status_strong'],
  [[584, 1004, 34, 32], 'status_regen'],
  [[643, 1003, 31, 34], 'status_shield'],
  [[700, 1005, 34, 29], 'status_barrier'],
  [[804, 1002, 30, 33], 'status_slow']
];

for (const [box, name] of CARDS) {
  try { await sliceOne(box, name); } catch (e) { console.error('FAILED', name, e.message); }
}
for (const [box, name] of STATUS) {
  try { await sliceOne(box, name, { square: true }); } catch (e) { console.error('FAILED', name, e.message); }
}
const names = [...CARDS, ...STATUS].map(j => j[1]);
await writeFile(
  'super_sean_007_full_project_wired/data/ui-manifest.json',
  JSON.stringify({ base: 'assets/sliced/ui/', sprites: names }, null, 2) + '\n'
);
console.log('done — wrote data/ui-manifest.json with', names.length, 'ui sprites');
