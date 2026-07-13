import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = path.resolve('super_sean_007_full_project_wired');
const distRoot = path.resolve('dist');
const errors = [];

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function expectFile(relativePath, base = projectRoot) {
  if (!(await exists(path.join(base, relativePath)))) {
    errors.push(`Missing ${path.relative(process.cwd(), path.join(base, relativePath))}`);
  }
}

async function readJson(relativePath) {
  try {
    return JSON.parse(await readFile(path.join(projectRoot, relativePath), 'utf8'));
  } catch (error) {
    errors.push(`Invalid JSON ${relativePath}: ${error.message}`);
    return null;
  }
}

await Promise.all([
  expectFile('index.html'),
  expectFile('game.js'),
  expectFile('js/data-items.js'),
  expectFile('js/data-build.js'),
  expectFile('js/data-quests.js'),
  expectFile('js/data-maps.js'),
  expectFile('js/systems.js'),
  expectFile('js/battle.js'),
  expectFile('js/render.js'),
  expectFile('js/coop.js'),
  expectFile('js/save-core.js'),
  expectFile('site.js'),
  expectFile('consent.js'),
  expectFile('ui-overlays.js'),
  expectFile('sw.js'),
  expectFile('stats.html'),
  expectFile('privacy.html'),
  expectFile('terms.html'),
  expectFile('assets/web/zonnig_fantasiedorp_met_kastelen_en_brug.webp'),
  expectFile('assets/ui/world_map_art.webp'),
  expectFile('assets/ui/super_sean_logo.webp'),
  expectFile('data/mob-manifest.json'),
  expectFile('assets/sliced/mobs/boss_sorceress.png'),
  expectFile('assets/sliced/mobs/npc_elder_man.png'),
  expectFile('api/save.js', path.resolve('functions')),
  expectFile('api/party.js', path.resolve('functions')),
  expectFile('api/stat.js', path.resolve('functions')),
  expectFile('api/err.js', path.resolve('functions')),
  expectFile('wrangler.toml', path.resolve('.')),
  expectFile('styles.css'),
  expectFile('favicon.ico'),
  expectFile('data/asset-manifest.json'),
  expectFile('data/asset-wiring.json'),
  expectFile('data/audio-manifest.json'),
  expectFile('data/sliced-assets.json'),
  expectFile('robots.txt'),
  expectFile('sitemap.xml'),
  expectFile('site.webmanifest')
]);

const assetManifest = await readJson('data/asset-manifest.json');
if (Array.isArray(assetManifest)) {
  for (const asset of assetManifest) {
    await expectFile(asset.file);
  }
}

const audioManifest = await readJson('data/audio-manifest.json');
if (audioManifest) {
  for (const group of ['music', 'sfx']) {
    for (const asset of Object.values(audioManifest[group] || {})) {
      await expectFile(asset.file);
    }
  }
}

const slicedManifest = await readJson('data/sliced-assets.json');
if (slicedManifest?.frames) {
  for (const frame of slicedManifest.frames) {
    await expectFile(frame.file);
  }
}

const mobManifest = await readJson('data/mob-manifest.json');
if (mobManifest?.sprites) {
  for (const name of mobManifest.sprites) {
    await expectFile(`${mobManifest.base}${name}.png`);
  }
}

const objectManifest = await readJson('data/object-manifest.json');
if (objectManifest?.sprites) {
  for (const name of objectManifest.sprites) {
    await expectFile(`${objectManifest.base}${name}.png`);
  }
}

const wiring = await readJson('data/asset-wiring.json');
for (const file of Object.values(wiring?.battleBackgrounds || {})) {
  await expectFile(file);
}

const iconManifest = await readJson('data/icon-manifest.json');
if (iconManifest?.sprites) {
  for (const name of iconManifest.sprites) {
    await expectFile(`${iconManifest.base}${name}.png`);
  }
}

const vfxManifest = await readJson('data/vfx-manifest.json');
if (vfxManifest?.sprites) {
  for (const name of vfxManifest.sprites) {
    await expectFile(`${vfxManifest.base}${name}.png`);
  }
}

const uiManifest = await readJson('data/ui-manifest.json');
if (uiManifest?.sprites) {
  for (const name of uiManifest.sprites) {
    await expectFile(`${uiManifest.base}${name}.png`);
  }
}

await expectFile('index.html', distRoot);
await expectFile('js/systems.js', distRoot);
await expectFile('js/coop.js', distRoot);
await expectFile('js/save-core.js', distRoot);
await expectFile('consent.js', distRoot);
await expectFile('ui-overlays.js', distRoot);
await expectFile('sw.js', distRoot);
await expectFile('stats.html', distRoot);
await expectFile('privacy.html', distRoot);
await expectFile('assets/sliced/mobs/boss_sorceress.png', distRoot);
await expectFile('assets/sliced/objects/obj_tavern.png', distRoot);
await expectFile('data/object-manifest.json', distRoot);
await expectFile('data/icon-manifest.json', distRoot);
await expectFile('assets/sliced/icons/icon_sword.png', distRoot);
await expectFile('assets/audio/music/title-theme.wav', distRoot);
await expectFile('assets/audio/music/boss-loop.wav', distRoot);
await expectFile('assets/sliced/characters/sean/frame_00.png', distRoot);

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('Validation passed: JSON, generated audio, sliced graphics, dist output, and manifest paths are present.');
