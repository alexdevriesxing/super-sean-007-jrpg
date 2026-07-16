import {cp, mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

const projectRoot = path.resolve('super_sean_007_full_project_wired');
const distRoot = path.resolve('dist');
const entries = [
  'assets', 'data', 'js', '.well-known',
  'game.js', 'ads.js', 'site.js', 'consent.js', 'ui-overlays.js', 'sw.js',
  'turn-config.js', 'cloud-controls.js', 'player-preferences.js', 'accessibility.js', 'runtime-hardening.js',
  'stats.html', 'stats.js', 'stats.css', 'status.html', 'status.js', 'status.css', 'support.html',
  'privacy.html', 'terms.html', '404.html', 'security-policy.html',
  'guides.html', 'characters.html', 'world.html', 'updates.html', 'content.css',
  'styles.css', 'accessibility.css', 'player-preferences.css', 'favicon.ico', 'robots.txt', 'sitemap.xml', 'llms.txt',
  'ai-summary.json', 'site.webmanifest', 'humans.txt', 'security.txt',
  '_headers', '_redirects'
];

const omittedProductionPaths = new Set([
  path.join(projectRoot, 'assets', 'characters', 'super_sean_friends_foundation_spritesheet.png'),
  // The raw title key art stays in the repo as the WebP source, but only the
  // optimized assets/key-art-main.webp ships to production.
  path.join(projectRoot, 'assets', 'key-art-main.png'),
  path.join(projectRoot, 'data', 'asset-manifest.json')
]);
const generatedSourceRoot = path.join(projectRoot, 'assets', 'generated');

function includeInProduction(source) {
  if (source === generatedSourceRoot || source.startsWith(`${generatedSourceRoot}${path.sep}`)) return false;
  return !omittedProductionPaths.has(source);
}

// dist/ is cleaned immediately before Vite runs. This step overlays the
// production-only static runtime while preserving Vite's generated index and
// content-hashed assets/build files.
await mkdir(distRoot, {recursive: true});

for (const entry of entries) {
  const from = path.join(projectRoot, entry);
  const to = path.join(distRoot, entry);
  await cp(from, to, {
    recursive: true,
    force: true,
    errorOnExist: false,
    filter: includeInProduction
  }).catch(error => {
    if (error.code !== 'ENOENT') throw error;
  });
}

const facts = JSON.parse(await readFile(path.join(projectRoot, 'data/site-facts.json'), 'utf8'));
const rawBuildId = process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA || `dev-${Date.now()}`;
const buildId = rawBuildId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'dev';
const swPath = path.join(distRoot, 'sw.js');
const serviceWorker = (await readFile(swPath, 'utf8')).replaceAll('__BUILD_VERSION__', buildId);
await writeFile(swPath, serviceWorker);
await writeFile(path.join(distRoot, 'build-meta.json'), `${JSON.stringify({
  version: facts.version,
  commit: rawBuildId,
  cacheVersion: buildId,
  builtAt: new Date().toISOString()
}, null, 2)}\n`);

console.log(`Copied production-only static site to dist/ and stamped ${facts.version} service worker ${buildId}.`);
