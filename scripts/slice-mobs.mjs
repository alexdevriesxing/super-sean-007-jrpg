/* Slice individual creature/NPC sprites out of the generated reference sheets.
   These sheets have a light near-white background, so each crop is flood-filled
   from its corners to transparency, then trimmed and padded to a square canvas. */
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const root = 'super_sean_007_full_project_wired/assets/generated';
const outDir = 'super_sean_007_full_project_wired/assets/sliced/mobs';
await mkdir(outDir, { recursive: true });

// Flood-fill from the four corners, clearing background-like pixels to transparent.
function keyOutBackground(data, w, h) {
  const idx = (x, y) => (y * w + x) * 4;
  const isBg = (x, y) => {
    const i = idx(x, y);
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const mn = Math.min(r, g, b), mx = Math.max(r, g, b);
    return mn > 198 && (mx - mn) < 42; // light + low saturation = sheet background
  };
  const stack = [];
  const seen = new Uint8Array(w * h);
  const push = (x, y) => { if (x >= 0 && y >= 0 && x < w && y < h && !seen[y * w + x]) { seen[y * w + x] = 1; stack.push(x, y); } };
  push(0, 0); push(w - 1, 0); push(0, h - 1); push(w - 1, h - 1);
  // also seed along the top/bottom edges to catch header gaps
  for (let x = 0; x < w; x += 8) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y += 8) { push(0, y); push(w - 1, y); }
  while (stack.length) {
    const y = stack.pop(), x = stack.pop();
    if (!isBg(x, y)) continue;
    data[idx(x, y) + 3] = 0;
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
  }
  return data;
}

// Keep only the largest connected blob of opaque pixels; erase smaller fragments
// (partial neighbour sprites the crop box may have caught).
function keepLargestComponent(data, w, h) {
  const label = new Int32Array(w * h).fill(-1);
  const opaque = i => data[i * 4 + 3] > 20;
  let best = -1, bestSize = 0;
  const comps = [];
  for (let start = 0; start < w * h; start++) {
    if (label[start] !== -1 || !opaque(start)) continue;
    const id = comps.length;
    const stack = [start];
    label[start] = id;
    let size = 0;
    while (stack.length) {
      const p = stack.pop(); size++;
      const x = p % w, y = (p / w) | 0;
      const nb = [];
      if (x > 0) nb.push(p - 1);
      if (x < w - 1) nb.push(p + 1);
      if (y > 0) nb.push(p - w);
      if (y < h - 1) nb.push(p + w);
      for (const n of nb) if (label[n] === -1 && opaque(n)) { label[n] = id; stack.push(n); }
    }
    comps.push(size);
    if (size > bestSize) { bestSize = size; best = id; }
  }
  for (let p = 0; p < w * h; p++) if (label[p] !== -1 && label[p] !== best) data[p * 4 + 3] = 0;
}

async function sliceOne(sheet, box, name, size = 128) {
  const src = path.join(root, sheet);
  const raw = await sharp(src).extract({ left: box[0], top: box[1], width: box[2], height: box[3] })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  keyOutBackground(raw.data, raw.info.width, raw.info.height);
  keepLargestComponent(raw.data, raw.info.width, raw.info.height);
  const out = path.join(outDir, `${name}.png`);
  await sharp(raw.data, { raw: { width: raw.info.width, height: raw.info.height, channels: 4 } })
    .png()
    .trim({ threshold: 1 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFile(out);
  console.log('sliced', name);
}

const VILLAINS = 'spritesheets/vijanden_en_elitebazen_sprite_sheets.png';
const MONSTERS = 'spritesheets/monsters_en_magische_wezens_gids.png';
const NPCS = 'spritesheets/super_sean_npc_sprite_sheet.png';

// [sheet, [x,y,w,h], name]
const JOBS = [
  // Villains & Elite Bosses (idle row, 4 columns)
  [VILLAINS, [88, 150, 122, 118], 'boss_sorceress'],
  [VILLAINS, [430, 150, 122, 118], 'boss_cultleader'],
  [VILLAINS, [772, 150, 126, 118], 'boss_bonedragon'],
  [VILLAINS, [1108, 150, 128, 122], 'boss_gemreaper'],
  // Monsters & Magical Beasts (idle row, same template)
  [MONSTERS, [88, 150, 122, 120], 'mob_crystal_golem'],
  [MONSTERS, [430, 150, 126, 120], 'mob_moss_troll'],
  [MONSTERS, [772, 150, 132, 120], 'mob_cave_spider'],
  [MONSTERS, [1108, 150, 138, 122], 'mob_thunder_wyvern'],
  // Village Townsfolk NPCs (idle poses)
  [NPCS, [128, 225, 135, 175], 'npc_village_boy'],
  [NPCS, [476, 225, 140, 175], 'npc_village_girl'],
  [NPCS, [818, 210, 155, 190], 'npc_farmer'],
  [NPCS, [1162, 218, 145, 182], 'npc_baker'],
  [NPCS, [126, 572, 145, 182], 'npc_elder_man'],
  [NPCS, [478, 572, 145, 182], 'npc_elder_woman'],
  [NPCS, [822, 566, 145, 188], 'npc_innkeeper'],
  [NPCS, [1166, 582, 140, 172], 'npc_child'],

  // Cave & Swamp creatures (4-col template, idle row)
  ['spritesheets/cave_en_moeras_wezens_sprite_sheet.png', [88, 150, 130, 122], 'mob_cave_lizard'],
  ['spritesheets/cave_en_moeras_wezens_sprite_sheet.png', [430, 150, 130, 122], 'mob_bog_toad'],
  ['spritesheets/cave_en_moeras_wezens_sprite_sheet.png', [772, 150, 132, 122], 'mob_moss_crab'],
  ['spritesheets/cave_en_moeras_wezens_sprite_sheet.png', [1108, 150, 132, 122], 'mob_glow_wormling'],
  // Forest Beasts & Critters
  ['spritesheets/bosdieren_en_wezentjes_spriteblad.png', [88, 150, 132, 122], 'mob_thorn_boar'],
  ['spritesheets/bosdieren_en_wezentjes_spriteblad.png', [430, 150, 128, 122], 'mob_acorn_sprite'],
  ['spritesheets/bosdieren_en_wezentjes_spriteblad.png', [772, 150, 132, 122], 'mob_owlbear'],
  ['spritesheets/bosdieren_en_wezentjes_spriteblad.png', [1108, 150, 134, 122], 'mob_fox_spirit'],
  // Undead & Cursed creatures
  ['spritesheets/ondode_en_vervloekte_wezens_overzicht.png', [88, 150, 128, 122], 'mob_skeleton_pup'],
  ['spritesheets/ondode_en_vervloekte_wezens_overzicht.png', [430, 150, 126, 122], 'mob_ghost_wisp'],
  ['spritesheets/ondode_en_vervloekte_wezens_overzicht.png', [772, 150, 128, 122], 'mob_cursed_doll'],
  ['spritesheets/ondode_en_vervloekte_wezens_overzicht.png', [1108, 150, 140, 122], 'mob_bone_beetle'],
  // Flying Creatures & Fae (subtitle line pushes idle row down ~35px)
  ['spritesheets/vliegende_wezens_en_fae_spritesheet.png', [88, 186, 132, 120], 'mob_batling'],
  ['spritesheets/vliegende_wezens_en_fae_spritesheet.png', [430, 186, 132, 120], 'mob_fairy_moth'],
  ['spritesheets/vliegende_wezens_en_fae_spritesheet.png', [772, 186, 130, 120], 'mob_crow_imp'],
  ['spritesheets/vliegende_wezens_en_fae_spritesheet.png', [1108, 186, 140, 120], 'mob_griffin'],
  // Xelar Monster Soldiers (3-col layout, subtitle)
  ['spritesheets/xelar_monster_soldiers_sprite_sheet.png', [90, 156, 150, 122], 'mob_skull_knight'],
  ['spritesheets/xelar_monster_soldiers_sprite_sheet.png', [510, 156, 150, 122], 'mob_goblin_brute'],
  ['spritesheets/xelar_monster_soldiers_sprite_sheet.png', [946, 156, 190, 122], 'mob_lizard_guard'],

  // Xelar the Dark Archmage — final boss (staff-raised idle pose)
  ['ui_vfx/xelar_de_duistere_hoge_magir.png', [303, 99, 107, 98], 'boss_xelar'],
  // Demons & Dark Fiends (Frostpeak / postgame enemies, first idle column)
  ['ui_vfx/demons_en_duistere_wezens_sprite_sheet.png', [88, 143, 88, 88], 'mob_horned_imp'],
  ['ui_vfx/demons_en_duistere_wezens_sprite_sheet.png', [418, 140, 79, 93], 'mob_flame_demon'],
  ['ui_vfx/demons_en_duistere_wezens_sprite_sheet.png', [754, 145, 92, 88], 'mob_void_succubus'],
  ['ui_vfx/demons_en_duistere_wezens_sprite_sheet.png', [1089, 151, 93, 78], 'mob_hellhound'],
  // Aquatic & Shore creatures (Sunsand Isle enemies)
  ['spritesheets/aquatic_en_kustwezens_sprite_sheet.png', [426, 167, 80, 77], 'mob_shell_crab'],
  ['spritesheets/aquatic_en_kustwezens_sprite_sheet.png', [757, 170, 81, 73], 'mob_puffer_fishling'],
  ['spritesheets/aquatic_en_kustwezens_sprite_sheet.png', [1090, 160, 83, 90], 'mob_water_spirit'],
  // Slimes, Oozes & the Treasure Mimic
  ['spritesheets/slijmen_kristallen_en_schatkisten.png', [423, 170, 76, 79], 'mob_crystal_slime'],
  ['spritesheets/slijmen_kristallen_en_schatkisten.png', [789, 178, 79, 74], 'mob_marsh_ooze'],
  ['spritesheets/slijmen_kristallen_en_schatkisten.png', [1155, 183, 72, 64], 'mob_treasure_mimic'],
  // Friendly wildlife — ambient homestead animals (white-bodied bunny/goat
  // interiors get eaten by the light-bg flood-fill, so we use the strongly
  // outlined deerling + turtle + horned goat)
  ['ui_vfx/vriendelijke_dieren_en_rijdieren_ontwerpen.png', [426, 225, 75, 77], 'animal_deerling'],
  ['ui_vfx/vriendelijke_dieren_en_rijdieren_ontwerpen.png', [759, 225, 91, 74], 'animal_turtle'],
  ['ui_vfx/vriendelijke_dieren_en_rijdieren_ontwerpen.png', [1090, 225, 83, 77], 'animal_skygoat'],

  // Party allies — distinct battle sprites drawn beside Sean (friends sheet, 1536 wide)
  ['spritesheets/super_sean_friends_spritesheets.png', [517, 60, 51, 63], 'ally_dave'],
  ['spritesheets/super_sean_friends_spritesheets.png', [902, 60, 58, 63], 'ally_petroman'],
  ['spritesheets/super_sean_friends_spritesheets.png', [95, 635, 45, 55], 'ally_haraku'],
  ['spritesheets/super_sean_friends_spritesheets.png', [665, 632, 49, 58], 'ally_ruush'],
  // Dark Knights & Corrupted Guards (Xelar's realm elites)
  ['spritesheets/chibi_rpg_donkere_ridder_sprite_sheet.png', [104, 145, 58, 83], 'mob_black_knight'],
  ['spritesheets/chibi_rpg_donkere_ridder_sprite_sheet.png', [433, 145, 88, 83], 'mob_shadow_paladin'],
  ['spritesheets/chibi_rpg_donkere_ridder_sprite_sheet.png', [773, 145, 70, 83], 'mob_royal_guard'],
  ['spritesheets/chibi_rpg_donkere_ridder_sprite_sheet.png', [1121, 151, 91, 77], 'mob_doom_halberdier'],
  // Xelar's Minions
  ['spritesheets/minions_sprite_sheet_overzicht.png', [196, 175, 79, 71], 'mob_shadow_acolyte'],
  ['spritesheets/minions_sprite_sheet_overzicht.png', [566, 175, 94, 68], 'mob_bat_imp'],
  ['spritesheets/minions_sprite_sheet_overzicht.png', [1036, 186, 63, 58], 'mob_cursed_slime'],
  // Extra village NPCs (festival & village-life sheet)
  ['spritesheets/super_sean_npcs_karakterblad.png', [76, 185, 75, 123], 'npc_cook'],
  ['spritesheets/super_sean_npcs_karakterblad.png', [70, 425, 81, 125], 'npc_teacher'],
  ['spritesheets/super_sean_npcs_karakterblad.png', [70, 655, 81, 139], 'npc_musician']
];

for (const [sheet, box, name] of JOBS) {
  try { await sliceOne(sheet, box, name); } catch (e) { console.error('FAILED', name, e.message); }
}

// Write a manifest the game loads to preload these sprites.
const { writeFile } = await import('node:fs/promises');
const names = JOBS.map(j => j[2]);
await writeFile(
  'super_sean_007_full_project_wired/data/mob-manifest.json',
  JSON.stringify({ base: 'assets/sliced/mobs/', sprites: names }, null, 2) + '\n'
);
console.log('done — wrote data/mob-manifest.json with', names.length, 'sprites');
