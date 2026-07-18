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

test('Adsterra loader contains every supplied unit and uses opaque responsive frames', async () => {
  const ads = await read('ads.js');
  for (const id of [
    '93eda8aa20c1ab61e0841c91645b40a1', 'ce88b3be674af35280aa2502234d5353',
    '3a031ce4ce53b5dd6030ac97fcf64f75', 'f999c41ff6862259f0c9d1d406dc29fb',
    '1c892303912adafbd9f9fd8e8a19462f', '48784386625737d309fc89aadd64bcde',
    '978406dc84c1b710ab8635624db3beb4', 'a4157228f205b7d03d165ecf28a4b3c8'
  ]) assert.ok(ads.includes(id), `missing Adsterra unit ${id}`);
  assert.match(ads, /data:text\/html/);
  assert.match(ads, /allow-scripts allow-popups allow-popups-to-escape-sandbox/);
  assert.doesNotMatch(ads, /allow-same-origin/);
  assert.match(await read('_headers'), /frame-src 'self' data: blob: https:/);
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

test('Cloudflare middleware redirects the apex domain to canonical www', async () => {
  const {onRequest} = await import('../functions/_middleware.js');
  let continued = false;
  const redirect = await onRequest({
    request:new Request('https://supersean007.com/guides.html?from=apex'),
    next:async () => { continued = true; return new Response('next'); }
  });
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.get('location'), 'https://www.supersean007.com/guides.html?from=apex');
  assert.equal(continued, false);

  const canonical = await onRequest({
    request:new Request('https://www.supersean007.com/'),
    next:async () => { continued = true; return new Response('next'); }
  });
  assert.equal(await canonical.text(), 'next');
  assert.equal(continued, true);
});
