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
  expectFile('site.js'),
  expectFile('assets/web/zonnig_fantasiedorp_met_kastelen_en_brug.webp'),
  expectFile('assets/ui/world_map_art.webp'),
  expectFile('assets/ui/super_sean_logo.webp'),
  expectFile('api/save.js', path.resolve('functions')),
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

await expectFile('index.html', distRoot);
await expectFile('js/systems.js', distRoot);
await expectFile('assets/audio/music/title-theme.wav', distRoot);
await expectFile('assets/audio/music/boss-loop.wav', distRoot);
await expectFile('assets/sliced/characters/sean/frame_00.png', distRoot);

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('Validation passed: JSON, generated audio, sliced graphics, dist output, and manifest paths are present.');
