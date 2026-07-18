import test from 'node:test';
import assert from 'node:assert/strict';
import {sanitizeSave} from '../functions/_lib/save-schema.js';
import {onRequestPut as savePut, onRequestGet as saveGet, onRequestDelete as saveDelete} from '../functions/api/save.js';
import {onRequestPost as partyPost, onRequestGet as partyGet} from '../functions/api/party.js';

class MemoryKV {
  constructor(entries = {}) { this.values = new Map(Object.entries(entries)); }
  async get(key) { return this.values.has(key) ? this.values.get(key) : null; }
  async put(key, value) { this.values.set(key, String(value)); }
  async delete(key) { this.values.delete(key); }
}

function request(pathname, options = {}) {
  const {headers = {}, ...rest} = options;
  return new Request(`https://supersean007.com${pathname}`, {
    ...rest,
    headers: {origin: 'https://supersean007.com', ...headers}
  });
}

function validSave(overrides = {}) {
  return {
    version: 2,
    scene: 'explore',
    mapId: 'village',
    player: {x: 100, y: 100, speed: 3.1, dir: 'down'},
    party: ['sean'],
    hero: {level: 2, hp: 100, maxHp: 120, mp: 20, maxMp: 32, attack: 15, defense: 8, coins: 40, friendship: 10},
    items: {'Wood': 4},
    equipment: {weapon: null, armor: null, charm: null},
    quest: {id: 'awakening', title: 'Quest', objective: 'Talk', progress: 0},
    homestead: {claimed: false, level: 1, tiles: {}, blueprintsBuilt: [], perksSeen: [], lastGiftAt: 0},
    stats: {}, gems: [], savedAt: Date.now(),
    ...overrides
  };
}

test('save schema strips unknown properties and clamps hostile values', () => {
  const clean = sanitizeSave(validSave({
    unknownSecret: 'drop me',
    mapId: 'hacker-map',
    hero: {level: 999999, hp: 999999999, maxHp: 25, coins: -5},
    party: ['sean', 'xelar', 'dave'],
    items: {'Wood': 1_000_000, '<script>': -9}
  }));
  assert.equal('unknownSecret' in clean, false);
  assert.equal(clean.mapId, 'village');
  assert.equal(clean.hero.level, 999);
  assert.equal(clean.hero.hp, 25);
  assert.equal(clean.hero.coins, 0);
  assert.deepEqual(clean.party, ['sean', 'dave']);
  assert.equal(clean.items.Wood, 9999);
  assert.equal(clean.items['<script>'], 0);
});

test('cloud save API stores only sanitized state and supports deletion', async () => {
  const store = new MemoryKV();
  const env = {SSG_SAVES: store};
  const id = 'abcdefghijklmnopqrstuvwx';
  const put = await savePut({
    request: request(`/api/save?id=${id}`, {
      method: 'PUT',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify(validSave({unknownSecret: 'removed', items: {Wood: 999999}}))
    }),
    env
  });
  assert.equal(put.status, 200);
  const stored = JSON.parse(await store.get(id));
  assert.equal('unknownSecret' in stored, false);
  assert.equal(stored.items.Wood, 9999);

  const get = await saveGet({request: request(`/api/save?id=${id}`), env});
  assert.equal(get.status, 200);
  assert.equal((await get.json()).hero.level, 2);

  const removed = await saveDelete({request: request(`/api/save?id=${id}`, {method: 'DELETE'}), env});
  assert.equal(removed.status, 200);
  assert.equal(await store.get(id), null);
});

test('force overwrite requires an explicit confirmation header', async () => {
  const id = 'abcdefghijklmnopqrstuvwx';
  const newer = validSave({savedAt: Date.now() + 60_000, hero: {...validSave().hero, level: 9}});
  const store = new MemoryKV({[id]: JSON.stringify(sanitizeSave(newer))});
  const env = {SSG_SAVES: store};
  const older = validSave({savedAt: Date.now(), hero: {...validSave().hero, level: 3}});

  const rejected = await savePut({
    request: request(`/api/save?id=${id}&force=1`, {method: 'PUT', headers: {'content-type': 'application/json'}, body: JSON.stringify(older)}), env
  });
  assert.equal(rejected.status, 409);

  const accepted = await savePut({
    request: request(`/api/save?id=${id}&force=1`, {
      method: 'PUT', headers: {'content-type': 'application/json', 'x-ssg-overwrite': 'confirm'}, body: JSON.stringify(older)
    }), env
  });
  assert.equal(accepted.status, 200);
  assert.equal(JSON.parse(await store.get(id)).hero.level, 3);
});

test('party signalling consumes offers and answers after reading', async () => {
  const store = new MemoryKV();
  const env = {SSG_SAVES: store};
  const code = 'ABC234';
  const host = await partyPost({request: request(`/api/party?code=${code}&action=host`, {method: 'POST', body: '{}'}), env});
  assert.equal(host.status, 200);

  const offer = await partyPost({
    request: request(`/api/party?code=${code}&action=offer`, {
      method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({sdp: 'v=0\r\nthis-is-a-test-offer', name: 'Friend'})
    }), env
  });
  assert.equal(offer.status, 200);
  const slot = (await offer.json()).slot;

  const firstRead = await partyGet({request: request(`/api/party?code=${code}&action=offers`), env});
  assert.ok((await firstRead.json()).offers[slot]);
  const secondRead = await partyGet({request: request(`/api/party?code=${code}&action=offers`), env});
  assert.deepEqual((await secondRead.json()).offers, {});

  await partyPost({
    request: request(`/api/party?code=${code}&action=answer&slot=${slot}`, {
      method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({sdp: 'v=0\r\nthis-is-a-test-answer', char: 'ruush'})
    }), env
  });
  const answer = await partyGet({request: request(`/api/party?code=${code}&action=answer&slot=${slot}`), env});
  assert.equal((await answer.json()).char, 'ruush');
  const missing = await partyGet({request: request(`/api/party?code=${code}&action=answer&slot=${slot}`), env});
  assert.equal(missing.status, 404);
});
