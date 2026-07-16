/* Rebuild the 8 in-game tilesets (512×256, 8×4 grid of 64px tiles) from the
   generated art packs, replacing the flat placeholder tiles while keeping the
   exact tile-index contract documented in js/data-build.js and used by
   js/data-maps.js (SOLID_TILES / NODE_TYPES / BUILD_PIECES stay valid).

   Two tile kinds:
   - texture: an inset crop of a ground swatch, cover-resized to 64×64
   - object:  a flood-fill-keyed sprite composited bottom-anchored on a ground
     texture, so decor/nodes sit on the terrain they appear on in-game. */
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const genRoot = 'super_sean_007_full_project_wired/assets/generated';
const outDir = 'super_sean_007_full_project_wired/assets/tilesets';
const TILE = 64;

const SHEETS = {
  cozy: 'tilesets/gezellige_rpg_game_tileset_collectie.png',
  ijs: 'tilesets/ijs_en_kristalbiome_tileset.png',
  desert: 'tilesets/kleurrijke_desert_en_tropische_game_tileset.png',
  kasteel: 'tilesets/kasteel_en_koninkrijk_pixel_art_tegelset.png',
  spellen: 'tilesets/spellenobjecten_en_terrein_voor_rpg.png',
  friends: 'spritesheets/super_sean_friends_spritesheets.png'
};

/* ---------- pixel helpers (same technique as slice-heroes/slice-mobs) ---------- */
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

const spriteCache = new Map();
async function cutObject(sheet, box) {
  const key = `${sheet}:${box.join(',')}`;
  if (spriteCache.has(key)) return spriteCache.get(key);
  const [x, y, w, h] = box;
  const raw = await sharp(path.join(genRoot, SHEETS[sheet]))
    .extract({ left: x, top: y, width: w, height: h })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  keyOutBackground(raw.data, raw.info.width, raw.info.height);
  const buf = await sharp(raw.data, { raw: { width: raw.info.width, height: raw.info.height, channels: 4 } })
    .png().trim({ threshold: 1 }).toBuffer();
  spriteCache.set(key, buf);
  return buf;
}

const textureCache = new Map();
async function cutTexture(sheet, box, mod) {
  const key = `${sheet}:${box.join(',')}:${JSON.stringify(mod || null)}`;
  if (textureCache.has(key)) return textureCache.get(key);
  const [x, y, w, h] = box;
  const inset = 6; // stay clear of the swatch's rounded edge
  let img = sharp(path.join(genRoot, SHEETS[sheet]))
    .extract({ left: x + inset, top: y + inset, width: w - inset * 2, height: h - inset * 2 })
    .resize(TILE, TILE, { fit: 'cover' });
  if (mod) img = img.modulate(mod);
  const buf = await img.ensureAlpha().png().toBuffer();
  textureCache.set(key, buf);
  return buf;
}

/* ---------- tile grammar ----------
   t(sheet, box, mod?)          ground texture tile
   o(sheet, box, opts?)         object on the tileset's default ground
     opts: {ground: tileSpec, scale: 0..1 of TILE (default .88), mod} */
const t = (sheet, box, mod) => ({ kind: 'texture', sheet, box, mod });
const o = (sheet, box, opts = {}) => ({ kind: 'object', sheet, box, ...opts });

/* ---------- shared source tiles (cozy collection sheet) ---------- */
const GRASS = t('cozy', [12, 11, 75, 75]);
const GRASS_SPRIG = t('cozy', [179, 10, 78, 76]);
const GRASS_FLOWERS = t('cozy', [601, 10, 75, 76]);
const GRASS_FLOWERS2 = t('cozy', [767, 10, 76, 77]);
const GRASS_DAISY = t('cozy', [935, 10, 76, 76]);
const GRASS_TULIP = t('cozy', [1103, 10, 78, 77]);
const SAND = t('cozy', [12, 95, 76, 77]);
const DIRT = t('cozy', [350, 95, 75, 76]);
const DIRT_STONES = t('cozy', [433, 95, 76, 76]);
const GRAVEL = t('cozy', [685, 95, 73, 76]);
const COBBLE = t('cozy', [768, 95, 74, 76]);
const COBBLE_MOSS = t('cozy', [852, 95, 73, 76]);
const PLANKS = t('cozy', [1020, 95, 74, 77]);
const PLANKS2 = t('cozy', [1105, 95, 74, 77]);
const WATER = t('cozy', [433, 181, 74, 76]);
const BRIDGE_H = t('cozy', [1023, 371, 73, 74]);
const BRIDGE_RAIL = t('cozy', [1111, 370, 82, 75]);
const SOIL = t('cozy', [13, 896, 64, 72]);

const CAVE_MOD = { brightness: 0.62, saturation: 0.72, hue: 215 };
const CAVE_FLOOR = t('cozy', [768, 95, 74, 76], CAVE_MOD);

/* ---------- the 8 tilesets ---------- */
const TILESETS = {
  birthday: {
    base: GRASS,
    tiles: {
      0: GRASS_FLOWERS,
      1: SAND,
      2: COBBLE,
      3: WATER,
      4: PLANKS2,
      5: o('cozy', [16, 647, 78, 45], { scale: 0.95 }),               // garden fence
      6: o('spellen', [855, 567, 77, 101], { ground: PLANKS2 }),      // cottage door
      7: t('kasteel', [1266, 892, 64, 32]),                           // red roof shingles
      8: o('cozy', [9, 451, 80, 103], { scale: 0.97 }),               // shade tree
      9: o('cozy', [1227, 476, 60, 67]),                              // berry hedge
      10: o('cozy', [1069, 900, 55, 68], { scale: 0.9 }),             // flowerbed mixed
      11: o('cozy', [1196, 900, 51, 68], { scale: 0.9 }),             // red flowerbed
      12: o('cozy', [1135, 898, 50, 70], { scale: 0.9 }),             // tulip bed
      13: o('cozy', [1258, 899, 49, 69], { scale: 0.9 }),             // blue flowerbed
      14: o('cozy', [243, 725, 54, 66]),                              // sign post
      15: GRASS_SPRIG,
      16: BRIDGE_H, 17: BRIDGE_RAIL, 18: PLANKS, 19: BRIDGE_H,
      20: o('cozy', [726, 1029, 53, 43], { scale: 0.8 }),             // chest
      21: o('cozy', [854, 564, 51, 59]),                              // crystal
      22: t('cozy', [14, 810, 56, 69]),                               // stone wall
      23: t('cozy', [83, 810, 60, 69]),                               // mossy wall
      24: t('cozy', [156, 809, 66, 70]),                              // pattern wall
      25: t('cozy', [235, 809, 63, 70]),                              // circle wall
      26: t('cozy', [311, 810, 62, 69]),                              // diamond wall
      27: GRASS, 28: GRASS_SPRIG, 29: GRASS_DAISY, 30: GRASS_TULIP, 31: GRASS_FLOWERS2
    }
  },
  meadow: {
    base: GRASS,
    tiles: {
      0: GRASS, 1: GRASS_SPRIG, 2: GRASS_FLOWERS2, 3: GRASS_DAISY,
      4: SOIL,
      5: WATER,
      6: o('cozy', [976, 649, 37, 43], { scale: 0.72 }),              // red mushroom
      7: o('cozy', [1085, 649, 38, 43], { scale: 0.72 }),             // amber mushroom
      8: o('cozy', [1031, 646, 37, 46], { scale: 0.72 }),             // blue mushroom
      9: o('cozy', [1138, 646, 36, 43], { scale: 0.72 }),             // purple mushroom
      10: o('cozy', [9, 451, 80, 103], { scale: 0.97 }),              // tree
      11: o('cozy', [1161, 478, 57, 65]),                             // flower bush
      12: o('cozy', [177, 573, 74, 52], { scale: 0.9 }),              // log
      13: o('cozy', [12, 568, 69, 57], { scale: 0.82 }),              // stump
      14: o('cozy', [1196, 900, 51, 68], { scale: 0.8 }),             // flower ring
      15: o('cozy', [441, 568, 50, 55], { scale: 0.7 }),              // sprout
      16: o('cozy', [710, 564, 52, 60], { scale: 0.85 }),             // boulder
      17: o('cozy', [81, 725, 49, 68]),                               // lamp post
      18: o('cozy', [530, 1033, 29, 36], { scale: 0.6 }),             // potion
      19: o('cozy', [726, 1029, 53, 43], { scale: 0.8 }),             // chest
      20: GRASS_SPRIG, 24: GRASS_DAISY, 28: GRASS_TULIP
    }
  },
  cave: {
    base: CAVE_FLOOR,
    tiles: {
      0: CAVE_FLOOR,
      1: t('cozy', [685, 95, 73, 76], CAVE_MOD),                      // gravel floor
      2: t('cozy', [852, 95, 73, 76], CAVE_MOD),                      // mossy floor
      3: o('cozy', [854, 564, 51, 59]),                               // crystal cluster
      4: t('cozy', [14, 810, 56, 69], { brightness: 0.7, saturation: 0.8, hue: 215 }), // rock wall
      5: o('cozy', [1332, 555, 85, 65], { scale: 0.95 }),             // ore boulder pile
      6: o('ijs', [1244, 180, 63, 47], { scale: 0.95 }),              // geode pool
      7: o('cozy', [1113, 725, 62, 58], { scale: 0.9 }),              // stalagmite stack
      8: o('cozy', [922, 565, 47, 58], { scale: 0.8 }),               // purple crystal
      9: o('cozy', [988, 561, 49, 61], { scale: 0.8 }),               // green crystal
      10: o('cozy', [1031, 646, 37, 46], { scale: 0.7 }),             // glow mushroom
      11: o('cozy', [639, 577, 49, 45], { scale: 0.8 })               // scattered rocks
    }
  },
  petro: {
    base: DIRT,
    tiles: {
      0: DIRT,
      1: DIRT_STONES,
      2: GRAVEL,
      3: o('spellen', [1007, 249, 78, 101], { scale: 0.9 }),          // furnace fire bowl
      4: o('spellen', [745, 474, 82, 84], { scale: 0.92 }),           // scrap machine cannon
      5: PLANKS,
      6: o('spellen', [327, 475, 85, 80], { scale: 0.92 }),           // gear / saw block
      7: o('spellen', [147, 474, 70, 76], { scale: 0.9 }),            // hazard spikes
      8: o('spellen', [557, 17, 71, 88], { scale: 0.85 }),            // oil barrel
      9: o('spellen', [726, 20, 74, 83], { scale: 0.85 }),            // supply crate
      10: o('spellen', [1315, 17, 117, 90], { scale: 0.95 }),         // mine cart
      11: o('cozy', [1332, 555, 85, 65], { scale: 0.9 })              // rubble pile
    }
  },
  ruushwood: {
    base: GRASS_SPRIG,
    tiles: {
      0: GRASS_SPRIG,
      1: GRASS_FLOWERS,
      2: o('cozy', [778, 459, 64, 79], { scale: 0.97 }),              // dense thicket
      3: o('friends', [692, 816, 96, 47], { scale: 0.85 }),           // wind arc (Ruush slash)
      4: o('cozy', [177, 573, 74, 52], { scale: 0.9 }),               // fallen log
      5: o('cozy', [13, 354, 74, 88], { scale: 0.97 }),               // great hill cliff
      6: t('ijs', [82, 8, 67, 68]),                                   // cloud bank
      7: o('cozy', [181, 452, 71, 102], { scale: 0.97 }),             // great pine
      8: o('cozy', [95, 452, 79, 102], { scale: 0.97 }),              // round tree
      9: o('cozy', [433, 451, 77, 102], { scale: 0.97 }),             // autumn tree
      10: o('cozy', [1227, 476, 60, 67]),                             // berry bush
      11: o('cozy', [976, 649, 37, 43], { scale: 0.7 })               // red mushroom
    }
  },
  moon: {
    base: t('ijs', [9, 8, 65, 68], { brightness: 0.82, saturation: 1.4, hue: 15 }),
    tiles: {
      0: t('ijs', [9, 8, 65, 68], { brightness: 0.82, saturation: 1.4, hue: 15 }),  // dusk snow
      1: t('ijs', [88, 563, 59, 61]),                                 // twilight tiles
      2: t('ijs', [303, 95, 64, 55]),                                 // ice floor
      3: o('ijs', [989, 336, 62, 71], { scale: 0.85 }),               // moon herb bush
      4: o('ijs', [15, 650, 50, 65], { scale: 0.85 }),                // dream tablet
      5: o('ijs', [1126, 342, 44, 64], { scale: 0.9 }),               // crystal sigil spire
      6: o('ijs', [1313, 180, 65, 49], { scale: 0.97 }),              // star pool
      7: t('ijs', [1212, 563, 56, 64]),                               // rune slab
      8: o('ijs', [775, 343, 58, 62], { scale: 0.85 }),               // ice crystals
      9: o('ijs', [844, 340, 56, 65], { scale: 0.85 }),               // frost bush
      10: t('ijs', [165, 563, 57, 61]),                               // ornate floor variant
      11: o('ijs', [923, 740, 51, 66], { scale: 0.9 })                // moon monument
    }
  },
  ruins: {
    base: t('desert', [13, 12, 69, 69]),
    tiles: {
      0: t('desert', [13, 12, 69, 69]),                               // sandstone
      1: t('desert', [404, 10, 73, 72]),                              // cracked earth
      2: COBBLE_MOSS,                                                 // moss floor
      3: o('desert', [1037, 631, 78, 77], { scale: 0.97 }),           // door slab arch
      4: o('desert', [938, 967, 84, 88], { scale: 0.95 }),            // sun dial idol
      5: GRAVEL,                                                      // moss path
      6: o('desert', [542, 630, 47, 73], { scale: 0.95 }),            // gold pillar
      7: o('desert', [964, 630, 63, 75], { scale: 0.95 }),            // broken block
      8: o('desert', [93, 420, 70, 76], { scale: 0.95 }),             // palm tree
      9: o('desert', [941, 424, 57, 66], { scale: 0.9 }),             // cactus
      10: o('spellen', [986, 22, 65, 76], { scale: 0.8 }),            // clay pot
      11: o('desert', [13, 882, 67, 70], { scale: 0.85 })             // hibiscus flowers
    }
  },
  tower: {
    base: t('kasteel', [10, 405, 64, 68], { brightness: 0.72, saturation: 0.85 }),
    tiles: {
      0: t('kasteel', [10, 405, 64, 68], { brightness: 0.72, saturation: 0.85 }),   // keep floor
      1: t('kasteel', [147, 405, 68, 68], { brightness: 0.78 }),                    // patterned floor
      2: t('kasteel', [654, 491, 60, 71]),                            // crimson carpet
      3: o('kasteel', [756, 317, 32, 78], { scale: 0.95 }),           // war banner
      4: o('kasteel', [838, 409, 44, 71], { scale: 0.95 }),           // dome statue
      5: o('spellen', [20, 570, 71, 96], { scale: 0.95 }),            // X sigil crystal
      6: t('kasteel', [105, 15, 70, 85]),                             // striped keep wall
      7: o('kasteel', [663, 15, 65, 115], { scale: 0.98 }),           // spire
      8: o('kasteel', [12, 311, 30, 77], { scale: 0.95 }),            // stone pillar
      9: o('kasteel', [792, 320, 34, 75], { scale: 0.9 }),            // war banner variant
      10: o('kasteel', [945, 410, 41, 71], { scale: 0.9 }),           // gargoyle statue
      11: t('kasteel', [728, 491, 73, 73])                            // royal blue carpet
    }
  }
};

const FILES = {
  birthday: 'birthday_village_tiles.png',
  meadow: 'mushroom_meadow_tiles.png',
  cave: 'crystal_cave_tiles.png',
  petro: 'petro_plains_tiles.png',
  ruushwood: 'ruushwood_tiles.png',
  moon: 'moon_shrine_tiles.png',
  ruins: 'ancient_ruins_tiles.png',
  tower: 'bald_moon_tower_tiles.png'
};

async function renderTile(spec, base) {
  if (spec.kind === 'texture') return cutTexture(spec.sheet, spec.box, spec.mod);
  const groundSpec = spec.ground || base;
  const ground = await cutTexture(groundSpec.sheet, groundSpec.box, groundSpec.mod);
  const sprite = await cutObject(spec.sheet, spec.box);
  const max = Math.round(TILE * (spec.scale ?? 0.88));
  const fitted = await sharp(sprite).resize(max, max, { fit: 'inside' }).toBuffer({ resolveWithObject: true });
  return sharp(ground).composite([{
    input: fitted.data,
    left: Math.round((TILE - fitted.info.width) / 2),
    top: TILE - 2 - fitted.info.height
  }]).png().toBuffer();
}

for (const [id, def] of Object.entries(TILESETS)) {
  const cells = [];
  for (let i = 0; i < 32; i++) {
    const spec = def.tiles[i] || def.base;
    const buf = await renderTile(spec, def.base);
    cells.push({ input: buf, left: (i % 8) * TILE, top: Math.floor(i / 8) * TILE });
  }
  const out = path.join(outDir, FILES[id]);
  await sharp({ create: { width: TILE * 8, height: TILE * 4, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(cells).png({ palette: true, quality: 90, compressionLevel: 9 }).toFile(out);
  console.log('tileset', id, '->', FILES[id]);
}
console.log('done — tilesets rebuilt from generated art');
