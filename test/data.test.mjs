/* Data-integrity tests: catch a bad edit to items/recipes/build/quests/maps
   before it ships. These run with `npm test` (node --test). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSSG } from './helpers.mjs';

const SSG = loadSSG([
  'js/data-items.js',
  'js/data-build.js',
  'js/data-quests.js',
  'js/data-maps.js'
]);

test('core data structures load', () => {
  assert.ok(SSG.ITEMS && Object.keys(SSG.ITEMS).length > 20, 'items present');
  assert.ok(Array.isArray(SSG.RECIPES) && SSG.RECIPES.length >= 15, 'recipes present');
  assert.ok(Array.isArray(SSG.BUILD_PIECES) && SSG.BUILD_PIECES.length >= 30, 'build pieces present');
  assert.ok(Array.isArray(SSG.MAIN_QUESTS) && SSG.MAIN_QUESTS.length >= 10, 'quests present');
  assert.equal(SSG.GEMS.length, 7, 'seven gems');
});

test('every recipe output and input references a real item', () => {
  for (const r of SSG.RECIPES) {
    assert.ok(SSG.ITEMS[r.out.item], `recipe ${r.id} output ${r.out.item} exists`);
    for (const [item] of r.ins) {
      assert.ok(SSG.ITEMS[item], `recipe ${r.id} input ${item} exists`);
    }
  }
});

test('every build piece has a renderable source, valid category, and real costs', () => {
  for (const p of SSG.BUILD_PIECES) {
    // Tile pieces have a sheet+tile index; billboard landmarks have a sprite name.
    const renderable = typeof p.tile === 'number' || (p.billboard && typeof p.sprite === 'string');
    assert.ok(renderable, `piece ${p.id} has a tile index or billboard sprite`);
    assert.ok(SSG.BUILD_CATEGORIES.includes(p.cat), `piece ${p.id} category valid`);
    for (const item of Object.keys(p.cost)) {
      assert.ok(SSG.ITEMS[item], `piece ${p.id} cost item ${item} exists`);
    }
  }
});

test('every landmark sprite is listed in the object manifest', async () => {
  const fs = await import('node:fs/promises');
  const manifest = JSON.parse(await fs.readFile('super_sean_007_full_project_wired/data/object-manifest.json', 'utf8'));
  const known = new Set(manifest.sprites);
  for (const p of SSG.BUILD_PIECES.filter(x => x.billboard)) {
    assert.ok(known.has(p.sprite), `landmark ${p.id} sprite ${p.sprite} in manifest`);
  }
});

test('blueprints only use real build piece ids', () => {
  const ids = new Set(SSG.BUILD_PIECES.map(p => p.id));
  for (const bp of SSG.BLUEPRINTS) {
    for (const row of bp.grid) {
      for (const cell of row) {
        if (cell) assert.ok(ids.has(cell), `blueprint ${bp.id} uses real piece ${cell}`);
      }
    }
  }
});

test('main quest chain is linked and rewards are valid', () => {
  for (const q of SSG.MAIN_QUESTS) {
    assert.ok(q.id && q.title && q.objective, `quest ${q.id} well-formed`);
    for (const item of Object.keys(q.onDone?.items || {})) {
      assert.ok(SSG.ITEMS[item], `quest ${q.id} reward item ${item} exists`);
    }
    if (q.onDone?.gem) assert.ok(SSG.GEMS.includes(q.onDone.gem), `quest ${q.id} gem valid`);
  }
});

test('maps build, are connected, and monster sprites resolve', () => {
  const maps = SSG.buildMaps();
  const regionIds = Object.keys(maps);
  assert.ok(regionIds.length >= 9, 'at least 9 regions');
  for (const id of regionIds) {
    const m = maps[id];
    assert.equal(m.tiles.length, m.h, `${id} tile rows match height`);
    assert.equal(m.tiles[0].length, m.w, `${id} tile cols match width`);
    for (const portal of m.portals) {
      assert.ok(maps[portal.target], `${id} portal targets real map ${portal.target}`);
    }
    for (const node of m.nodes || []) {
      assert.ok(SSG.NODE_TYPES[node.kind], `${id} node kind ${node.kind} exists`);
    }
  }
});

test('every unlock target in quests is a real map', () => {
  const maps = SSG.buildMaps();
  for (const q of SSG.MAIN_QUESTS) {
    if (q.onDone?.unlock) assert.ok(maps[q.onDone.unlock], `unlock ${q.onDone.unlock} is a real map`);
  }
});

test('every shop item is a real item', () => {
  for (const s of SSG.SHOP_STOCK) {
    assert.ok(SSG.ITEMS[s.item], `shop item ${s.item} exists`);
    assert.ok(typeof s.price === 'number' && s.price > 0, `shop item ${s.item} priced`);
  }
});

test('every monster drop is a real item and every map monster kind has a drop table', () => {
  for (const [mob, list] of Object.entries(SSG.MONSTER_DROPS)) {
    for (const [item, chance] of list) {
      assert.ok(SSG.ITEMS[item], `drop table ${mob} item ${item} exists`);
      assert.ok(chance > 0 && chance <= 1, `drop table ${mob} chance for ${item} in range`);
    }
  }
  const maps = SSG.buildMaps();
  for (const m of Object.values(maps)) {
    for (const mon of m.monsters) {
      if (mon.kind) assert.ok(SSG.MONSTER_DROPS[mon.kind], `monster ${mon.id} kind ${mon.kind} has a drop table`);
    }
  }
});

test('side quests reference real items', () => {
  for (const q of SSG.SIDE_QUESTS) {
    if (q.ask?.item) assert.ok(SSG.ITEMS[q.ask.item], `side quest ${q.id} ask ${q.ask.item} exists`);
    for (const item of Object.keys(q.reward?.items || {})) {
      assert.ok(SSG.ITEMS[item], `side quest ${q.id} reward ${item} exists`);
    }
  }
});

test('every locked portal is reachable via a quest unlock or a boss unlock chain', () => {
  const maps = SSG.buildMaps();
  const questUnlocks = new Set(SSG.MAIN_QUESTS.map(q => q.onDone?.unlock).filter(Boolean));
  const bossUnlocks = new Set();
  const bossIds = new Set();
  for (const m of Object.values(maps)) {
    for (const mon of m.monsters) {
      if (mon.unlocks) bossUnlocks.add(mon.unlocks);
      if (mon.boss) bossIds.add(mon.id);
    }
  }
  for (const m of Object.values(maps)) {
    for (const pt of m.portals) {
      if (!pt.locked) continue;
      assert.ok(questUnlocks.has(pt.locked) || bossUnlocks.has(pt.locked),
        `portal ${pt.id} lock '${pt.locked}' is unlocked by a quest or a boss`);
    }
    // A boss that gates on defeating another boss must name a real boss.
    for (const mon of m.monsters) {
      if (mon.requiresDefeated) assert.ok(bossIds.has(mon.requiresDefeated),
        `monster ${mon.id} requiresDefeated '${mon.requiresDefeated}' is a real boss`);
    }
  }
});

test('crops reference real seed items and ripe tiles', () => {
  for (const [key, crop] of Object.entries(SSG.CROPS)) {
    assert.ok(SSG.ITEMS[crop.seed], `crop ${key} seed exists`);
    assert.ok(crop.ripeTile && typeof crop.ripeTile.tile === 'number', `crop ${key} ripe tile`);
    assert.ok(crop.growMs > 0, `crop ${key} grows`);
  }
});

test('every item img and gem icon exists in the icon manifest', async () => {
  const fs = await import('node:fs/promises');
  const manifest = JSON.parse(await fs.readFile('super_sean_007_full_project_wired/data/icon-manifest.json', 'utf8'));
  const known = new Set(manifest.sprites);
  for (const [name, def] of Object.entries(SSG.ITEMS)) {
    if (def.img) assert.ok(known.has(def.img), `item ${name} img ${def.img} in icon manifest`);
  }
  for (const [gem, icon] of Object.entries(SSG.GEM_ICONS)) {
    assert.ok(known.has(icon), `gem ${gem} icon ${icon} in icon manifest`);
    assert.ok(SSG.GEMS.includes(gem), `gem icon key ${gem} is a real gem`);
  }
  for (const a of SSG.ACHIEVEMENTS) {
    assert.ok(known.has(a.badge), `achievement ${a.id} badge ${a.badge} in icon manifest`);
  }
});

test('every monster and NPC sprite reference exists in the mob manifest', async () => {
  const fs = await import('node:fs/promises');
  const manifest = JSON.parse(await fs.readFile('super_sean_007_full_project_wired/data/mob-manifest.json', 'utf8'));
  const known = new Set(manifest.sprites);
  const maps = SSG.buildMaps();
  for (const m of Object.values(maps)) {
    for (const mon of m.monsters) {
      if (mon.sprite) assert.ok(known.has(mon.sprite), `${m.id} monster ${mon.id} sprite ${mon.sprite} in manifest`);
    }
    for (const npc of m.npcs) {
      if (npc.sprite) assert.ok(known.has(npc.sprite), `${m.id} npc ${npc.id} sprite ${npc.sprite} in manifest`);
    }
  }
});
