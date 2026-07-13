import {access, readFile} from 'node:fs/promises';
import path from 'node:path';

const projectRoot = path.resolve('super_sean_007_full_project_wired');
const distRoot = path.resolve('dist');
const errors = [];

async function required(relative, base = distRoot) {
  try { await access(path.join(base, relative)); }
  catch (error) { errors.push(`Missing ${path.relative(process.cwd(), path.join(base, relative))}`); }
}

async function text(relative, base = distRoot) {
  try { return await readFile(path.join(base, relative), 'utf8'); }
  catch (error) { errors.push(`Cannot read ${relative}: ${error.message}`); return ''; }
}

await Promise.all([
  required('404.html'), required('guides.html'), required('characters.html'),
  required('world.html'), required('updates.html'), required('content.css'),
  required('build-meta.json'), required('data/site-facts.json'),
  required('api/health.js', path.resolve('functions')),
  required('_lib/security.js', path.resolve('functions'))
]);

const [index, redirects, headers, serviceWorker, sitemap, robots, stats, privacy] = await Promise.all([
  text('index.html'), text('_redirects'), text('_headers'), text('sw.js'),
  text('sitemap.xml'), text('robots.txt'), text('stats.html'), text('privacy.html')
]);

if (/\/\*\s+\/index\.html\s+200/.test(redirects)) errors.push('Catch-all 200 rewrite still present.');
if (/\/assets\/\*[^]*?immutable/.test(headers)) errors.push('Mutable /assets/* still uses immutable caching.');
if (serviceWorker.includes('__BUILD_VERSION__')) errors.push('Service-worker build version was not stamped.');
if (!index.includes('11 magical regions') || !index.includes('Frostpeak Reaches') || !index.includes('Sunsand Isle')) errors.push('Homepage facts were not synced to 11 regions.');
if (!index.includes('uploaded to Cloudflare only when you voluntarily enable Cloud Sync')) errors.push('Homepage cloud-sync privacy wording is stale.');
for (const page of ['guides.html', 'characters.html', 'world.html', 'updates.html']) {
  if (!sitemap.includes(page)) errors.push(`Sitemap does not include ${page}.`);
}
if (!robots.includes('Disallow: /api/') || !robots.includes('OAI-SearchBot')) errors.push('robots.txt does not protect API routes or state AI search policy.');
if (!stats.includes('authorization: `Bearer ${token}`')) errors.push('Diagnostics dashboard does not send admin authorization.');
if (!privacy.includes('Short-lived, hashed network fingerprints')) errors.push('Privacy policy does not disclose abuse-prevention hashing.');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('Hardening validation passed: protected diagnostics, real 404, safe caches, current facts and indexable guides.');
