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

async function forbidden(relative, base = distRoot) {
  try {
    await access(path.join(base, relative));
    errors.push(`Development-only path leaked into production: ${relative}`);
  } catch (error) {
    if (error.code !== 'ENOENT') errors.push(`Cannot verify forbidden path ${relative}: ${error.message}`);
  }
}

async function text(relative, base = distRoot) {
  try { return await readFile(path.join(base, relative), 'utf8'); }
  catch (error) { errors.push(`Cannot read ${relative}: ${error.message}`); return ''; }
}

await Promise.all([
  required('404.html'), required('guides.html'), required('characters.html'), required('world.html'),
  required('updates.html'), required('support.html'), required('status.html'), required('status.js'), required('status.css'),
  required('security-policy.html'), required('.well-known/security.txt'),
  required('content.css'), required('accessibility.css'), required('accessibility.js'),
  required('player-preferences.css'), required('player-preferences.js'), required('js/postgame-systems.js'),
  required('cloud-controls.js'), required('runtime-hardening.js'), required('turn-config.js'),
  required('stats.js'), required('stats.css'), required('build-meta.json'), required('data/site-facts.json'),
  required('data/performance-budget.json'),
  required('api/health.js', functionRoot), required('api/turn.js', functionRoot),
  required('_lib/security.js', functionRoot), required('_lib/save-schema.js', functionRoot),
  required('scripts/clean-dist.mjs', path.resolve('.')), required('scripts/live-smoke.mjs', path.resolve('.')),
  required('.github/workflows/cloudflare-deploy.yml', path.resolve('.')),
  required('.github/workflows/production-monitor.yml', path.resolve('.')),
  forbidden('assets/generated'), forbidden('assets/characters/super_sean_friends_foundation_spritesheet.png'),
  forbidden('data/asset-manifest.json'), forbidden('docs')
]);

const [
  index, redirects, headers, serviceWorker, sitemap, robots, statsHtml, statsJs, privacy,
  ads, runtime, preferences, preferenceCss, overlay, quests, saveCore, postgameSystems,
  statusHtml, statusJs, supportHtml, metaText, factsText, health, deployWorkflow,
  monitorWorkflow, cleanDist, buildStatic, liveSmoke
] = await Promise.all([
  text('index.html'), text('_redirects'), text('_headers'), text('sw.js'), text('sitemap.xml'),
  text('robots.txt'), text('stats.html'), text('stats.js'), text('privacy.html'), text('ads.js'),
  text('runtime-hardening.js'), text('player-preferences.js'), text('player-preferences.css'),
  text('ui-overlays.js'), text('js/data-quests.js'), text('js/save-core.js'), text('js/postgame-systems.js'),
  text('status.html'), text('status.js'), text('support.html'), text('build-meta.json'), text('data/site-facts.json'),
  text('api/health.js', functionRoot), text('.github/workflows/cloudflare-deploy.yml', path.resolve('.')),
  text('.github/workflows/production-monitor.yml', path.resolve('.')), text('scripts/clean-dist.mjs', path.resolve('.')),
  text('scripts/build-static.mjs', path.resolve('.')), text('scripts/live-smoke.mjs', path.resolve('.'))
]);

if (/\/\*\s+\/index\.html\s+200/.test(redirects)) errors.push('Catch-all 200 rewrite still present.');
if (/\/assets\/\*[^]*?immutable/.test(headers)) errors.push('Mutable /assets/* still uses immutable caching.');
if (!/Strict-Transport-Security: max-age=\d+/.test(headers)) errors.push('HSTS is missing from production headers.');
if (serviceWorker.includes('__BUILD_VERSION__')) errors.push('Service-worker build version was not stamped.');
if (!index.includes('11 magical regions') || !index.includes('Frostpeak Reaches') || !index.includes('Sunsand Isle')) errors.push('Production homepage facts were not synced to 11 regions.');
if (!index.includes('uploaded to Cloudflare only when you voluntarily enable Cloud Sync')) errors.push('Production homepage cloud-sync privacy wording is stale.');
if (!index.includes('js/postgame-systems.js') || index.indexOf('js/postgame-systems.js') > index.indexOf('game.js')) errors.push('Postgame systems extension is not loaded before game.js.');
if (!index.includes('support.html') || !index.includes('status.html')) errors.push('Homepage does not expose support and service status links.');
for (const page of ['guides.html', 'characters.html', 'world.html', 'updates.html', 'support.html', 'security-policy.html']) {
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
if (!runtime.includes('startNewGamePlus')) errors.push('Safe New Game+ action is not preserved after debug removal.');
if (!runtime.includes('Rewarded ads are unavailable')) errors.push('Rewarded-ad fallback still grants value without an ad.');
if (!preferences.includes('navigator.getGamepads') || !preferences.includes('setBinding')) errors.push('Gamepad or remappable keyboard controls are missing.');
if (!preferences.includes('postgame_legend') || !preferences.includes('startNewGamePlus')) errors.push('New Game+ is not wired to the extended epilogue.');
if (!preferenceCss.includes('ssg-high-contrast') || !preferenceCss.includes('ssg-reduce-motion')) errors.push('Accessibility preference styles are incomplete.');
if (!overlay.includes('prefTextScale') || !overlay.includes('ssg-keybind')) errors.push('Settings does not expose control and accessibility preferences.');
for (const quest of ['postgame_frostpeak', 'frostpeak_queen', 'sunsand_scout', 'tide_sovereign', 'postgame_legend']) {
  if (!quests.includes(`id:'${quest}'`)) errors.push(`Postgame quest ${quest} is missing.`);
}
if (!saveCore.includes('SSG.SAVE_VERSION = 3') || !saveCore.includes("raw?.quest?.id !== 'postgame'")) errors.push('Version 3 postgame save migration is missing.');
if (!postgameSystems.includes('frostpeak_clear') || !postgameSystems.includes('postgame_clear')) errors.push('Postgame achievement conditions are missing.');
if (!statusHtml.includes('Service status') || !statusJs.includes('/api/health') || !statusJs.includes('/performance-report.json')) errors.push('Public status page is incomplete.');
if (!supportHtml.includes('Support and troubleshooting') || !supportHtml.includes('issues/new/choose')) errors.push('Player support page is incomplete.');
if (!cleanDist.includes('rm(distRoot') || buildStatic.includes('rm(distRoot') || !buildStatic.includes("'assets', 'data', 'js'") || !buildStatic.includes('generatedSourceRoot')) errors.push('Production build does not clean before Vite and prune source assets while preserving compiled output.');
if (!deployWorkflow.includes('cloudflare/wrangler-action@v3') || !deployWorkflow.includes('CLOUDFLARE_API_TOKEN') || !deployWorkflow.includes('npm run smoke:live') || !deployWorkflow.includes('steps.release.outputs.version')) errors.push('Cloudflare deployment workflow is incomplete.');
if (!monitorWorkflow.includes("cron: '17 * * * *'") || !monitorWorkflow.includes('issues: write') || !monitorWorkflow.includes('Production smoke test failed')) errors.push('Production monitoring workflow is incomplete.');
if (!liveSmoke.includes('/api/health') || !liveSmoke.includes('strict transport security') || !liveSmoke.includes('apex redirects to canonical www')) errors.push('Strict live smoke coverage is incomplete.');

try {
  const meta = JSON.parse(metaText);
  const facts = JSON.parse(factsText);
  if (meta.version !== facts.version) errors.push('Build metadata version does not match canonical facts.');
  if (facts.version !== '1.2.1') errors.push(`Expected release 1.2.1, found ${facts.version}.`);
  if (!facts.features.some(feature => /gamepad/i.test(feature))) errors.push('Canonical facts do not mention gamepad support.');
  if (!facts.features.some(feature => /postgame epilogue/i.test(feature))) errors.push('Canonical facts do not mention the postgame epilogue.');
  if (!facts.features.some(feature => /production monitoring/i.test(feature))) errors.push('Canonical facts do not mention production monitoring.');
} catch (error) { errors.push('Build metadata or canonical facts are invalid JSON.'); }

if (!health.includes("version: '1.2.1'")) errors.push('Health endpoint does not report version 1.2.1.');
if (!statsHtml.includes('stats.js') || !statsHtml.includes('stats.css')) errors.push('Diagnostics still contains inline application code.');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('Version 1.2.1 validation passed: production-only assets, automated deployment, public status, live monitoring and commercial release protections.');
