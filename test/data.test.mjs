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

test('crops reference real seed items and ripe tiles', () => {
  for (const [key, crop] of Object.entries(SSG.CROPS)) {
    assert.ok(SSG.ITEMS[crop.seed], `crop ${key} seed exists`);
    assert.ok(crop.ripeTile && typeof crop.ripeTile.tile === 'number', `crop ${key} ripe tile`);
    assert.ok(crop.growMs > 0, `crop ${key} grows`);
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
