/* Save migration tests — the highest-risk logic: a bad edit here could wipe
   players' progress. Verifies old/partial/corrupt saves survive migration. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSSG } from './helpers.mjs';

const SSG = loadSSG([
  'js/data-items.js',
  'js/data-quests.js',
  'js/data-maps.js',
  'js/save-core.js'
]);

test('defaultState is complete and self-consistent', () => {
  const s = SSG.defaultState();
  assert.equal(s.version, SSG.SAVE_VERSION);
  assert.equal(s.hero.hp, s.hero.maxHp);
  assert.equal(s.party.join(','), 'sean');
  assert.equal(s.gems.length, 0);
  assert.ok(s.stats && s.homestead && s.equipment);
});

test('migrate handles null / garbage without throwing', () => {
  for (const bad of [null, undefined, 42, 'nope', [], {}]) {
    const s = SSG.migrateSave(bad);
    assert.equal(s.version, SSG.SAVE_VERSION);
    assert.ok(s.hero && s.player && s.quest);
  }
});

test('migrate preserves a real player save', () => {
  const raw = {
    version: 2, mapId: 'cave',
    hero: {level: 12, coins: 999, hp: 50},
    party: ['sean', 'dave', 'haraku'],
    gems: ['Meadow Gem', 'Cave Gem'],
    items: {'Wood': 40, 'Gear Blade': 1},
    homestead: {claimed: true, level: 3, tiles: {'5,5': 'woodwall'}},
    quest: {id: 'crystal_cave', progress: 0}
  };
  const s = SSG.migrateSave(raw);
  assert.equal(s.hero.level, 12);
  assert.equal(s.hero.coins, 999);
  assert.equal(s.party.join(','), 'sean,dave,haraku');
  assert.equal(s.gems.length, 2);
  assert.equal(s.items['Wood'], 40);
  assert.equal(s.homestead.claimed, true);
  assert.equal(s.homestead.tiles['5,5'], 'woodwall');
});

test('migrate fills in fields missing from an older save', () => {
  const old = {version: 1, hero: {level: 3}, mapId: 'meadow'};
  const s = SSG.migrateSave(old);
  // new fields exist with defaults
  assert.ok(s.stats && typeof s.stats.battlesWon === 'number');
  assert.equal(s.ngPlus, 0);
  assert.ok(Array.isArray(s.gems));
  // preserved old value merged over default hero
  assert.equal(s.hero.level, 3);
  assert.equal(s.hero.maxHp, 120); // default filled in
});

test('migrate repairs an unknown quest id to the start', () => {
  const s = SSG.migrateSave({quest: {id: 'does_not_exist', progress: 9}});
  assert.equal(s.quest.id, 'awakening');
});

test('migrate keeps a valid quest id and refreshes its title/objective', () => {
  const target = SSG.MAIN_QUESTS[3];
  const s = SSG.migrateSave({quest: {id: target.id, progress: 2}});
  assert.equal(s.quest.id, target.id);
  assert.equal(s.quest.title, target.title);
  assert.equal(s.quest.progress, 2);
});

test('migrate rejects a non-array party', () => {
  const s = SSG.migrateSave({party: 'sean'});
  assert.equal(s.party.join(','), 'sean');
});
