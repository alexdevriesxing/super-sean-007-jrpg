import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {onRequestGet as statGet, onRequestPost as statPost} from '../functions/api/stat.js';
import {onRequestGet as errorGet, onRequestPost as errorPost} from '../functions/api/err.js';

const root = path.resolve('super_sean_007_full_project_wired');

class MemoryKV {
  constructor(entries = {}) { this.values = new Map(Object.entries(entries)); }
  async get(key) { return this.values.has(key) ? this.values.get(key) : null; }
  async put(key, value) { this.values.set(key, String(value)); }
}

function request(pathname, options = {}) {
  return new Request(`https://supersean007.com${pathname}`, options);
}

test('unknown routes are not rewritten to the homepage', async () => {
  const redirects = await readFile(path.join(root, '_redirects'), 'utf8');
  assert.doesNotMatch(redirects, /\/\*\s+\/index\.html\s+200/);
  assert.match(redirects, /\/index\.html\s+\/\s+301/);
});

test('mutable assets are not cached as immutable for a year', async () => {
  const headers = await readFile(path.join(root, '_headers'), 'utf8');
  assert.match(headers, /\/assets\/build\/\*/);
  assert.match(headers, /\/assets\/\*[\s\S]*?max-age=3600, must-revalidate/);
  assert.doesNotMatch(headers, /\/assets\/\*[\s\S]*?max-age=31536000, immutable/);
});

test('canonical facts drive machine files and final dist rendering', async () => {
  const facts = JSON.parse(await readFile(path.join(root, 'data/site-facts.json'), 'utf8'));
  const ai = JSON.parse(await readFile(path.join(root, 'ai-summary.json'), 'utf8'));
  const syncScript = await readFile(path.resolve('scripts/sync-site-facts.mjs'), 'utf8');
  assert.equal(facts.regionCount, 11);
  assert.equal(ai.world.region_count, facts.regionCount);
  assert.equal(ai.players.maximum, facts.playerMaximum);
  assert.equal(ai.software_version, facts.version);
  assert.ok(ai.world.regions.some(region => region.name === 'Frostpeak Reaches'));
  assert.ok(ai.world.regions.some(region => region.name === 'Sunsand Isle'));
  assert.match(ai.privacy, /sandboxed frames/);
  assert.match(syncScript, /process\.argv\.includes\('--dist'\)/);
  assert.match(syncScript, /uploaded to Cloudflare only when you voluntarily enable Cloud Sync/);
});

test('diagnostic reads reject missing admin authorization', async () => {
  const env = {ADMIN_TOKEN: 'secret', SSG_SAVES: new MemoryKV()};
  assert.equal((await statGet({request: request('/api/stat'), env})).status, 401);
  assert.equal((await errorGet({request: request('/api/err'), env})).status, 401);
});

test('authorized analytics reads work', async () => {
  const env = {
    ADMIN_TOKEN: 'secret',
    SSG_SAVES: new MemoryKV({'stat:all': JSON.stringify({totals: {pageview: 2}, days: {}})})
  };
  const response = await statGet({request: request('/api/stat', {headers: {authorization: 'Bearer secret'}}), env});
  assert.equal(response.status, 200);
  assert.equal((await response.json()).totals.pageview, 2);
});

test('cross-origin diagnostics writes are rejected', async () => {
  const env = {SSG_SAVES: new MemoryKV()};
  const response = await statPost({
    request: request('/api/stat', {
      method: 'POST',
      headers: {'content-type': 'application/json', origin: 'https://evil.example'},
      body: JSON.stringify({event: 'pageview'})
    }),
    env
  });
  assert.equal(response.status, 403);
});

test('error reports omit user-agent strings', async () => {
  const store = new MemoryKV();
  const env = {SSG_SAVES: store};
  const response = await errorPost({
    request: request('/api/err', {
      method: 'POST',
      headers: {'content-type': 'application/json', origin: 'https://supersean007.com', 'user-agent': 'Secret Browser'},
      body: JSON.stringify({msg: 'boom', url: '/game', line: 10})
    }),
    env
  });
  assert.equal(response.status, 200);
  const stored = JSON.parse(await store.get('stat:errors'));
  assert.equal(stored[0].msg, 'boom');
  assert.equal('ua' in stored[0], false);
});
