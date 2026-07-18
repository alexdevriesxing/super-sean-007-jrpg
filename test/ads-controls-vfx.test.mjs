import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('super_sean_007_full_project_wired');
const read = relative => readFile(path.join(root, relative), 'utf8');

test('every public page loads an automatic Adsterra placement', async () => {
  const files = (await readdir(root)).filter(name => name.endsWith('.html') && name !== 'stats.html');
  for (const file of files) {
    const html = await read(file);
    assert.match(html, /data-adsterra-placement=/, `${file} has no ad placement`);
    assert.match(html, /<script src="ads\.js" defer><\/script>/, `${file} does not load ads.js`);
  }
});

test('Adsterra loader contains every supplied unit and uses dedicated responsive frames', async () => {
  const ads = await read('ads.js');
  for (const id of [
    '93eda8aa20c1ab61e0841c91645b40a1', 'ce88b3be674af35280aa2502234d5353',
    '3a031ce4ce53b5dd6030ac97fcf64f75', 'f999c41ff6862259f0c9d1d406dc29fb',
    '1c892303912adafbd9f9fd8e8a19462f', '48784386625737d309fc89aadd64bcde',
    '978406dc84c1b710ab8635624db3beb4', 'a4157228f205b7d03d165ecf28a4b3c8'
  ]) assert.ok(ads.includes(id), `missing Adsterra unit ${id}`);
  assert.match(ads, /AD_FRAME_PATH = '\/ad-frame'/);
  assert.match(ads, /loading = 'eager'/);
  assert.match(ads, /allow-scripts allow-same-origin/);
  assert.match(await read('_headers'), /frame-src 'self' data: blob: https:/);
});

test('ad frame serves known units and rejects arbitrary unit IDs', async () => {
  const {onRequestGet} = await import('../functions/ad-frame.js');
  const banner = await onRequestGet({request: new Request('https://super-sean-007-jrpg.pages.dev/ad-frame?unit=a4157228f205b7d03d165ecf28a4b3c8')});
  const html = await banner.text();
  assert.equal(banner.status, 200);
  assert.match(html, /a4157228f205b7d03d165ecf28a4b3c8\/invoke\.js/);
  assert.match(banner.headers.get('content-security-policy'), /'unsafe-eval'/);
  assert.match(banner.headers.get('content-security-policy'), /frame-ancestors 'self'/);
  assert.equal(banner.headers.get('x-frame-options'), null);

  const unknown = await onRequestGet({request: new Request('https://super-sean-007-jrpg.pages.dev/ad-frame?unit=unknown')});
  assert.equal(unknown.status, 400);
});

test('Snowball exposes complete eager game-page ad inventory and valid CSS artwork paths', async () => {
  const [html, styles] = await Promise.all([read('snowball.html'), read('snowball/snowball.css')]);
  for (const placement of [
    'top-banner-728x90', 'game-sidebar-native', 'game-sidebar-skyscraper',
    'below-game-responsive', 'content-native-responsive', 'footer-banner-responsive'
  ]) assert.match(html, new RegExp(`data-adsterra-placement="${placement}"`), `Snowball is missing ${placement}`);
  assert.doesNotMatch(styles, /url\(['"]?assets\//, 'Snowball CSS assets must resolve from the snowball/ stylesheet directory');
  assert.match(styles, /url\('\.\.\/assets\/snowball\/key-art\.webp'\)/);
});

test('packaged browser smoke runs through Cloudflare Pages Functions', async () => {
  const smoke = await readFile(path.resolve('scripts', 'browser-smoke.mjs'), 'utf8');
  assert.match(smoke, /node_modules\/wrangler\/bin\/wrangler\.js/);
  assert.match(smoke, /'pages', 'dev', 'dist'/);
  assert.match(smoke, /Page\.domContentEventFired/);
  assert.doesNotMatch(smoke, /Page\.loadEventFired/);
  assert.match(smoke, /expectedLocalTurn/);
  assert.doesNotMatch(smoke, /VITE_BIN/);
});

test('active games own scroll keys and battles expose projectile VFX', async () => {
  const [game, snowball, battle, render, styles] = await Promise.all([
    read('game.js'), read('snowball/snowball-game.js'), read('js/battle.js'), read('js/render.js'), read('styles.css')
  ]);
  assert.match(game, /function gameOwnsScrollKeys\(\)/);
  assert.match(game, /if \(scrollKey\) e\.preventDefault\(\)/);
  assert.match(snowball, /mode !== 'playing'/);
  assert.match(snowball, /if \(scrollKey\) e\.preventDefault\(\)/);
  assert.match(battle, /animate\('projectile'/);
  assert.match(battle, /visuals: \[\]/);
  assert.match(render, /function drawBattleVisuals\(/);
  assert.match(render, /ssg-reduce-motion/);
  assert.match(styles, /@media \(max-width:900px\)/);
});
