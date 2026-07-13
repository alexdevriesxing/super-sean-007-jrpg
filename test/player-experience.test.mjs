import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {loadSSG} from './helpers.mjs';
import {sanitizeSave} from '../functions/_lib/save-schema.js';

const root = path.resolve('super_sean_007_full_project_wired');
const SSG = loadSSG([
  'js/data-items.js',
  'js/data-quests.js',
  'js/data-maps.js',
  'js/save-core.js'
]);

test('postgame epilogue follows the campaign finale in order', () => {
  const ids = SSG.MAIN_QUESTS.map(quest => quest.id);
  const finale = ids.indexOf('xelar_final');
  assert.deepEqual(ids.slice(finale + 1), [
    'postgame_frostpeak',
    'frostpeak_queen',
    'sunsand_scout',
    'tide_sovereign',
    'postgame_legend'
  ]);
});

test('version 2 completed saves migrate into the correct epilogue stage', () => {
  const first = SSG.migrateSave({version: 2, quest: {id: 'postgame'}, defeatedBosses: {xelar_final: true}});
  assert.equal(first.quest.id, 'postgame_frostpeak');

  const sunsand = SSG.migrateSave({
    version: 2,
    quest: {id: 'postgame'},
    defeatedBosses: {xelar_final: true, fp_boss: true},
    unlocked: {sunsand: true}
  });
  assert.equal(sunsand.quest.id, 'sunsand_scout');

  const complete = SSG.migrateSave({
    version: 2,
    quest: {id: 'postgame'},
    defeatedBosses: {xelar_final: true, fp_boss: true, ss_boss: true}
  });
  assert.equal(complete.quest.id, 'postgame_legend');
});

test('cloud save sanitizer accepts version 3 epilogue quests', () => {
  const save = sanitizeSave({
    version: 3,
    mapId: 'frostpeak',
    party: ['sean'],
    hero: {},
    player: {},
    quest: {id: 'frostpeak_queen', title: 'Queen', objective: 'Win', progress: 0}
  });
  assert.equal(save.version, 3);
  assert.equal(save.quest.id, 'frostpeak_queen');
  assert.equal(save.mapId, 'frostpeak');
});

test('player preferences support key swapping and visual settings', async () => {
  const source = await readFile(path.join(root, 'player-preferences.js'), 'utf8');
  const stored = new Map();
  const classes = new Set();
  const listeners = new Map();
  const body = {
    classList: {
      toggle(name, force) { if (force) classes.add(name); else classes.delete(name); }
    }
  };
  const windowObject = {
    matchMedia: () => ({matches: false}),
    addEventListener(type, handler) { listeners.set(type, handler); },
    dispatchEvent() {},
    render_game_to_text: () => '{}'
  };
  const context = {
    window: windowObject,
    document: {
      documentElement: {style: {setProperty() {}}},
      body,
      querySelector: () => null
    },
    navigator: {getGamepads: () => []},
    localStorage: {
      getItem(key) { return stored.get(key) || null; },
      setItem(key, value) { stored.set(key, value); }
    },
    requestAnimationFrame: () => 0,
    CustomEvent: class CustomEvent { constructor(type, options) { this.type = type; this.detail = options?.detail; } },
    KeyboardEvent: class KeyboardEvent {},
    console
  };
  vm.runInNewContext(source, context, {filename: 'player-preferences.js'});
  const api = windowObject.SSGPlayerPreferences;
  assert.ok(api);
  assert.equal(api.get().keys.interact, 'KeyE');
  assert.equal(api.setBinding('interact', 'KeyI'), true);
  assert.equal(api.get().keys.interact, 'KeyI');
  assert.equal(api.get().keys.inventory, 'KeyE');
  api.update({highContrast: true, reduceMotion: true, textScale: 1.3});
  assert.equal(api.get().textScale, 1.3);
  assert.ok(classes.has('ssg-high-contrast'));
  assert.ok(classes.has('ssg-reduce-motion'));
  api.reset();
  assert.equal(api.get().keys.interact, 'KeyE');
});

test('production performance budget is explicit and includes critical gameplay files', async () => {
  const budget = JSON.parse(await readFile(path.join(root, 'data/performance-budget.json'), 'utf8'));
  assert.ok(budget.totalDistBytes > 0);
  assert.ok(budget.maxInitialCriticalBytes > 0);
  for (const file of ['game.js', 'js/save-core.js', 'player-preferences.js']) {
    assert.ok(budget.criticalPaths.includes(file), `${file} must be included in the initial-load budget`);
  }
});
