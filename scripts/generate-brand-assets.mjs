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

console.log('Brand assets generated from real pack art.');
