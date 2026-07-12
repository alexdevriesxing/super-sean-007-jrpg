/* Slice battle effect sprites from the two labelled VFX sheets.
   Each job names a region around one labelled cluster; we key out the light
   background and keep the LARGEST connected effect instance in that region. */
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const root = 'super_sean_007_full_project_wired/assets/generated/ui_vfx';
const outDir = 'super_sean_007_full_project_wired/assets/sliced/vfx2';
await mkdir(outDir, { recursive: true });

function keyOutBackground(data, w, h) {
  const isBg = p => {
    const r = data[p * 4], g = data[p * 4 + 1], b = data[p * 4 + 2];
    const mn = Math.min(r, g, b), mx = Math.max(r, g, b);
    return mn > 200 && (mx - mn) < 40;
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

// Largest connected opaque component (with jump tolerance to merge sparkle gaps).
function largestComponentBox(data, w, h, tol = 4) {
  const label = new Int32Array(w * h).fill(-1);
  const opaque = p => data[p * 4 + 3] > 20;
  let best = null;
  for (let start = 0; start < w * h; start++) {
    if (label[start] !== -1 || !opaque(start)) continue;
    const stack = [start];
    label[start] = start;
    let minX = w, maxX = 0, minY = h, maxY = 0, size = 0;
    while (stack.length) {
      const p = stack.pop(); size++;
      const x = p % w, y = (p / w) | 0;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      for (let dy = -tol; dy <= tol; dy++) for (let dx = -tol; dx <= tol; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const np = ny * w + nx;
        if (label[np] === -1 && opaque(np)) { label[np] = start; stack.push(np); }
      }
    }
    if (!best || size > best.size) best = { minX, minY, maxX, maxY, size };
  }
  return best;
}

async function sliceOne(sheet, baseW, region, name, size = 160) {
  const src = path.join(root, sheet);
  const meta = await sharp(src).metadata();
  const kx = meta.width / baseW, ky = meta.height / 1086;
  const box = {
    left: Math.max(0, Math.round(region[0] * kx)),
    top: Math.max(0, Math.round(region[1] * ky)),
    width: Math.min(meta.width, Math.round(region[2] * kx)),
    height: Math.min(meta.height, Math.round(region[3] * ky))
  };
  if (box.left + box.width > meta.width) box.width = meta.width - box.left;
  if (box.top + box.height > meta.height) box.height = meta.height - box.top;
  const raw = await sharp(src).extract(box).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  keyOutBackground(raw.data, raw.info.width, raw.info.height);
  const comp = largestComponentBox(raw.data, raw.info.width, raw.info.height);
  if (!comp) throw new Error('no component found');
  const pad = 3;
  const cx = Math.max(0, comp.minX - pad), cy = Math.max(0, comp.minY - pad);
  const cw = Math.min(raw.info.width - cx, comp.maxX - comp.minX + 1 + pad * 2);
  const ch = Math.min(raw.info.height - cy, comp.maxY - comp.minY + 1 + pad * 2);
  await sharp(raw.data, { raw: { width: raw.info.width, height: raw.info.height, channels: 4 } })
    .extract({ left: cx, top: cy, width: cw, height: ch })
    .png()
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFile(path.join(outDir, `${name}.png`));
  console.log('vfx', name);
}

const S1 = 'super_sean_007_vfx_sprite_sheet.png'; // base width 1435
const S2 = 'vfx_sprite_sheet_voor_heldenmagie.png'; // base width 1449

// [sheet, baseW, [x, y, w, h] region (rendered coords), name]
const JOBS = [
  [S1, 1435, [10, 125, 290, 120], 'vfx_slash'],
  [S1, 1435, [325, 130, 265, 125], 'vfx_crit'],
  [S1, 1435, [615, 125, 265, 135], 'vfx_stars'],
  [S1, 1435, [325, 285, 265, 125], 'vfx_ice'],
  [S1, 1435, [615, 285, 265, 125], 'vfx_fire'],
  [S1, 1435, [875, 285, 270, 125], 'vfx_poison'],
  [S1, 1435, [1165, 285, 270, 125], 'vfx_daze'],
  [S1, 1435, [5, 448, 295, 118], 'vfx_claw'],
  [S1, 1435, [5, 603, 295, 112], 'vfx_zap'],
  [S1, 1435, [615, 603, 265, 112], 'vfx_arrows'],
  [S1, 1435, [325, 743, 265, 122], 'vfx_explosion'],
  [S2, 1449, [8, 540, 345, 165], 'vfx_heal'],
  [S2, 1449, [378, 545, 235, 160], 'vfx_shield'],
  [S2, 1449, [1075, 325, 370, 190], 'vfx_spirit'],
  [S2, 1449, [1075, 548, 370, 82], 'vfx_teleport'],
  [S2, 1449, [1115, 80, 335, 205], 'vfx_water'],
  [S2, 1449, [385, 320, 335, 195], 'vfx_nature']
];

for (const [sheet, baseW, region, name] of JOBS) {
  try { await sliceOne(sheet, baseW, region, name); } catch (e) { console.error('FAILED', name, e.message); }
}
const names = JOBS.map(j => j[3]);
await writeFile(
  'super_sean_007_full_project_wired/data/vfx-manifest.json',
  JSON.stringify({ base: 'assets/sliced/vfx2/', sprites: names }, null, 2) + '\n'
);
console.log('done — wrote data/vfx-manifest.json with', names.length, 'effects');
