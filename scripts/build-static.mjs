import {cp, mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

const projectRoot = path.resolve('super_sean_007_full_project_wired');
const distRoot = path.resolve('dist');
const entries = [
  'assets', 'data', 'docs', 'js',
  'game.js', 'ads.js', 'site.js', 'consent.js', 'ui-overlays.js', 'sw.js',
  'stats.html', 'privacy.html', 'terms.html', '404.html',
  'guides.html', 'characters.html', 'world.html', 'updates.html', 'content.css',
  'styles.css', 'favicon.ico', 'robots.txt', 'sitemap.xml', 'llms.txt',
  'ai-summary.json', 'site.webmanifest', 'humans.txt', 'security.txt',
  '_headers', '_redirects'
];

await mkdir(distRoot, {recursive: true});

for (const entry of entries) {
  const from = path.join(projectRoot, entry);
  const to = path.join(distRoot, entry);
  await cp(from, to, {recursive: true, force: true, errorOnExist: false}).catch(error => {
    if (error.code !== 'ENOENT') throw error;
  });
}

const rawBuildId = process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA || `dev-${Date.now()}`;
const buildId = rawBuildId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'dev';
const swPath = path.join(distRoot, 'sw.js');
const serviceWorker = (await readFile(swPath, 'utf8')).replaceAll('__BUILD_VERSION__', buildId);
await writeFile(swPath, serviceWorker);
await writeFile(path.join(distRoot, 'build-meta.json'), `${JSON.stringify({
  version: '1.1.0',
  commit: rawBuildId,
  cacheVersion: buildId,
  builtAt: new Date().toISOString()
}, null, 2)}\n`);

console.log(`Copied static site to dist/ and stamped service worker ${buildId}.`);
