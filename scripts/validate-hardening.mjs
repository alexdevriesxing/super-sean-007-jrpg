import {access, readFile} from 'node:fs/promises';
import path from 'node:path';

const projectRoot = path.resolve('super_sean_007_full_project_wired');
const distRoot = path.resolve('dist');
const functionRoot = path.resolve('functions');
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
  required('404.html'), required('guides.html'), required('characters.html'), required('world.html'),
  required('updates.html'), required('security-policy.html'), required('.well-known/security.txt'),
  required('content.css'), required('accessibility.css'), required('accessibility.js'),
  required('cloud-controls.js'), required('runtime-hardening.js'), required('turn-config.js'),
  required('stats.js'), required('stats.css'), required('build-meta.json'), required('data/site-facts.json'),
  required('api/health.js', functionRoot), required('api/turn.js', functionRoot),
  required('_lib/security.js', functionRoot), required('_lib/save-schema.js', functionRoot)
]);

const [index, redirects, headers, serviceWorker, sitemap, robots, statsHtml, statsJs, privacy, ads, runtime, metaText, factsText] = await Promise.all([
  text('index.html'), text('_redirects'), text('_headers'), text('sw.js'), text('sitemap.xml'),
  text('robots.txt'), text('stats.html'), text('stats.js'), text('privacy.html'), text('ads.js'),
  text('runtime-hardening.js'), text('build-meta.json'), text('data/site-facts.json')
]);

if (/\/\*\s+\/index\.html\s+200/.test(redirects)) errors.push('Catch-all 200 rewrite still present.');
if (/\/assets\/\*[^]*?immutable/.test(headers)) errors.push('Mutable /assets/* still uses immutable caching.');
if (serviceWorker.includes('__BUILD_VERSION__')) errors.push('Service-worker build version was not stamped.');
if (!index.includes('11 magical regions') || !index.includes('Frostpeak Reaches') || !index.includes('Sunsand Isle')) errors.push('Production homepage facts were not synced to 11 regions.');
if (!index.includes('uploaded to Cloudflare only when you voluntarily enable Cloud Sync')) errors.push('Production homepage cloud-sync privacy wording is stale.');
for (const page of ['guides.html', 'characters.html', 'world.html', 'updates.html', 'security-policy.html']) {
  if (!sitemap.includes(page)) errors.push(`Sitemap does not include ${page}.`);
}
if (!robots.includes('Disallow: /api/') || !robots.includes('OAI-SearchBot')) errors.push('robots.txt does not protect API routes or state AI search policy.');
if (!statsJs.includes('authorization: `Bearer ${adminToken}`')) errors.push('Diagnostics client does not send admin authorization.');
if (/localStorage|sessionStorage/.test(statsJs)) errors.push('Diagnostics client still persists its admin token.');
if (!/Content-Security-Policy: default-src 'none'/.test(headers)) errors.push('Diagnostics does not have a dedicated restrictive CSP.');
if (!privacy.includes('Short-lived SHA-256 network fingerprints')) errors.push('Privacy policy does not disclose abuse-prevention hashing.');
if (!privacy.includes('permanently delete the stored cloud copy')) errors.push('Privacy policy does not disclose cloud deletion.');
if (!ads.includes("sandbox', 'allow-scripts allow-popups allow-popups-to-escape-sandbox'")) errors.push('Advertising is not sandboxed.');
if (/SOCIAL_BAR_SRC|injectSocialBar/.test(ads)) errors.push('Top-level Social Bar code is still present.');
if (!runtime.includes('delete game.debug')) errors.push('Production QA controls are not removed.');
if (!runtime.includes('Rewarded ads are unavailable')) errors.push('Rewarded-ad fallback still grants value without an ad.');

try {
  const meta = JSON.parse(metaText);
  const facts = JSON.parse(factsText);
  if (meta.version !== facts.version) errors.push('Build metadata version does not match canonical facts.');
} catch (error) { errors.push('Build metadata or canonical facts are invalid JSON.'); }

if (!statsHtml.includes('stats.js') || !statsHtml.includes('stats.css')) errors.push('Diagnostics still contains inline application code.');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('Commercial hardening validation passed: sandboxed ads, strict saves, protected diagnostics, accessible controls, current facts and deployable security policy.');
