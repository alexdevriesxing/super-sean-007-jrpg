import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const projectRoot = path.resolve('super_sean_007_full_project_wired');
const keyArt = path.join(projectRoot, 'assets', 'generated', 'key_art', 'super_sean_legende_van_de_zeven_edelstenen.png');
const mapSheet = path.join(projectRoot, 'assets', 'generated', 'ui_vfx', 'gedetailleerde_rpg_wereldkaart_en_iconen.png');

async function cropFraction(src, fx0, fy0, fx1, fy1) {
  const meta = await sharp(src).metadata();
  const left = Math.round(meta.width * fx0);
  const top = Math.round(meta.height * fy0);
  return sharp(src).extract({
    left,
    top,
    width: Math.round(meta.width * (fx1 - fx0)),
    height: Math.round(meta.height * (fy1 - fy0))
  });
}

// 1) Painted logo lockup from the key art (crystal + SUPER SEAN 007 + banner + gems)
let img = await cropFraction(keyArt, 0.288, 0.19, 0.728, 0.512);
await img.resize(480).webp({quality: 88}).toFile(path.join(projectRoot, 'assets', 'ui', 'super_sean_logo.webp'));

// 2) Social/OG image: wide band of the key art with logo + heroes
img = await cropFraction(keyArt, 0, 0.13, 1, 0.655);
await img.resize(1200, 630, {fit: 'cover'}).jpeg({quality: 82}).toFile(path.join(projectRoot, 'assets', 'og-image.jpg'));

// 3) App icons: Sean's face from the key art
img = await cropFraction(keyArt, 0.40, 0.50, 0.55, 0.70);
await img.resize(512, 512, {fit: 'cover'}).png().toFile(path.join(projectRoot, 'assets', 'icon-512.png'));
img = await cropFraction(keyArt, 0.40, 0.50, 0.55, 0.70);
await img.resize(192, 192, {fit: 'cover'}).png().toFile(path.join(projectRoot, 'assets', 'icon-192.png'));

// 4) Painted parchment world map for the World section
img = await cropFraction(mapSheet, 0.014, 0.605, 0.366, 0.898);
await img.resize(1280).webp({quality: 80, effort: 6}).toFile(path.join(projectRoot, 'assets', 'ui', 'world_map_art.webp'));

// 5) Region preview strip for world.html: five real battle-background crops
//    (replaces the old collage of placeholder tilesets).
const REGIONS = [
  ['village', 'Birthday Village'],
  ['meadow', 'Mushroom Meadow'],
  ['crystalcave', 'Crystal Cave'],
  ['arena_machine', 'Petro Plains'],
  ['moonshrine', 'Moon Shrine']
];
const CARD = 224, GAP = 16, STRIP_W = REGIONS.length * CARD + (REGIONS.length - 1) * GAP;
const roundedMask = Buffer.from(
  `<svg width="${CARD}" height="${CARD}"><rect width="${CARD}" height="${CARD}" rx="16" fill="#fff"/></svg>`
);
const cards = [];
const labels = [];
for (let i = 0; i < REGIONS.length; i++) {
  const [bg, label] = REGIONS[i];
  const card = await sharp(path.join(projectRoot, 'assets', 'battle', `${bg}.webp`))
    .resize(CARD, CARD, {fit: 'cover'})
    .composite([{input: roundedMask, blend: 'dest-in'}])
    .png().toBuffer();
  const x = i * (CARD + GAP);
  cards.push({input: card, left: x, top: 0});
  labels.push(
    `<text x="${x + CARD / 2}" y="${CARD - 16}" text-anchor="middle" font-family="Nunito, Arial, sans-serif" ` +
    `font-size="21" font-weight="800" fill="#ffffff" stroke="#12365a" stroke-width="3.5" paint-order="stroke">${label}</text>`
  );
}
cards.push({
  input: Buffer.from(`<svg width="${STRIP_W}" height="${CARD}">${labels.join('')}</svg>`),
  left: 0, top: 0
});
await sharp({create: {width: STRIP_W, height: CARD, channels: 4, background: {r: 0, g: 0, b: 0, alpha: 0}}})
  .composite(cards)
  .webp({quality: 82, effort: 6})
  .toFile(path.join(projectRoot, 'assets', 'ui', 'region_preview_strip.webp'));

// 6) favicon.ico from the real Sean-face icon: an ICO container holding
//    PNG-compressed 48/32/16 entries (supported by every modern browser).
async function icoFromPng(sizes) {
  const source = path.join(projectRoot, 'assets', 'icon-192.png');
  const pngs = [];
  for (const size of sizes) {
    pngs.push({size, data: await sharp(source).resize(size, size).png().toBuffer()});
  }
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(pngs.length, 4);
  const entries = [];
  let offset = 6 + pngs.length * 16;
  for (const {size, data} of pngs) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size === 256 ? 0 : size, 0);
    entry.writeUInt8(size === 256 ? 0 : size, 1);
    entry.writeUInt16LE(1, 4); entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8); entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += data.length;
  }
  return Buffer.concat([header, ...entries, ...pngs.map(p => p.data)]);
}
const {writeFile} = await import('node:fs/promises');
await writeFile(path.join(projectRoot, 'favicon.ico'), await icoFromPng([48, 32, 16]));

console.log('Brand assets generated from real pack art.');
